import { Octokit } from "@octokit/rest";
import {
  AI_TRENDING_PARTITION,
  type AITrendingEntity,
  deleteAITrending,
  ensureAITrendingTable,
  listAllAITrending,
  repoToRowKey,
  upsertAITrending,
} from "./aiTrendingTable.js";

// Curated AI-focused topic list. Each topic = one search call. Keeping the
// set small avoids burning the search rate limit (30/min authenticated) and
// avoids the long tail of low-signal topics. Results are deduped before
// ranking, so topic overlap is fine.
const AI_TOPICS = [
  "ai",
  "llm",
  "ai-agents",
  "agentic-ai",
  "generative-ai",
  "mcp",
  "rag",
  "llmops",
  "claude",
  "prompt-engineering",
  "openai",
  "langchain",
];

const TOP_N = 25;
const LOOKBACK_DAYS = 30;
const MIN_STARS = 5;

let octokit: Octokit | null = null;
function gh(): Octokit {
  if (!octokit) {
    const auth = process.env.GITHUB_TOKEN;
    octokit = new Octokit(auth ? { auth } : {});
  }
  return octokit;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RepoHit {
  fullName: string;
  htmlUrl: string;
  description: string;
  author: string;
  stars: number;
  topics: string[];
  language: string;
  license: string;
  createdAt: string;
  pushedAt: string;
  sourceTopic: string;
}

async function searchTopic(topic: string, sinceDate: string): Promise<RepoHit[]> {
  const q = `topic:${topic} created:>=${sinceDate} stars:>${MIN_STARS}`;
  const out: RepoHit[] = [];
  try {
    const res = await gh().rest.search.repos({
      q,
      per_page: 50,
      sort: "stars",
      order: "desc",
    });
    for (const r of res.data.items) {
      out.push({
        fullName: r.full_name,
        htmlUrl: r.html_url,
        description: r.description ?? "",
        author: r.owner?.login ?? "",
        stars: r.stargazers_count ?? 0,
        topics: r.topics ?? [],
        language: r.language ?? "",
        license: r.license?.name ?? "",
        createdAt: r.created_at ?? "",
        pushedAt: r.pushed_at ?? "",
        sourceTopic: topic,
      });
    }
  } catch (err) {
    console.warn(`AI trending searchTopic(${topic}) failed:`, (err as Error).message);
  }
  return out;
}

function dedupeByFullName(hits: RepoHit[]): RepoHit[] {
  const map = new Map<string, RepoHit>();
  for (const h of hits) {
    const existing = map.get(h.fullName);
    if (!existing) {
      map.set(h.fullName, h);
    } else {
      // Prefer the higher star count (fresher data) and concatenate
      // topics so we keep visibility into all matching tags.
      if (h.stars > existing.stars) existing.stars = h.stars;
      const mergedTopics = Array.from(new Set([...existing.topics, ...h.topics]));
      existing.topics = mergedTopics;
    }
  }
  return [...map.values()];
}

export interface AITrendingScanResult {
  scanned: number;
  topicsQueried: number;
  uniqueRepos: number;
  topNStored: number;
  droppedFromTop: number;
  sinceDate: string;
}

export async function scanAITrending(): Promise<AITrendingScanResult> {
  await ensureAITrendingTable();
  const sinceDate = toIsoDate(new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000));

  // Fan out across topics. Run serially with a tiny delay to be polite to
  // GitHub's per-second search budget; the whole loop still finishes in
  // well under a minute for ~12 topics.
  const allHits: RepoHit[] = [];
  for (const topic of AI_TOPICS) {
    const hits = await searchTopic(topic, sinceDate);
    allHits.push(...hits);
  }

  const unique = dedupeByFullName(allHits);
  unique.sort((a, b) => b.stars - a.stars);
  const top = unique.slice(0, TOP_N);

  // Read existing rows so we can compute rank deltas vs the prior scan.
  const existingRows = await listAllAITrending();
  const existingByKey = new Map(existingRows.map((r) => [r.rowKey as string, r]));
  const now = new Date().toISOString();

  const keptKeys = new Set<string>();

  for (let i = 0; i < top.length; i++) {
    const hit = top[i];
    const rowKey = repoToRowKey(hit.fullName);
    keptKeys.add(rowKey);
    const prior = existingByKey.get(rowKey);
    const rank = i + 1;

    const entity: AITrendingEntity = {
      partitionKey: AI_TRENDING_PARTITION,
      rowKey,
      fullName: hit.fullName,
      htmlUrl: hit.htmlUrl,
      description: hit.description || "(no description provided)",
      author: hit.author,
      stars: hit.stars,
      topics: hit.topics.join(","),
      language: hit.language,
      license: hit.license,
      createdAt: hit.createdAt,
      pushedAt: hit.pushedAt,
      discoveredAt: prior?.discoveredAt ?? now,
      lastScanAt: now,
      currentRank: rank,
      // 0 sentinel means "no prior rank" — frontend treats this as NEW.
      previousRank: prior ? prior.currentRank : 0,
      sourceTopic: hit.sourceTopic,
    };

    await upsertAITrending(entity);
  }

  // Drop rows that fell out of the top 25 this scan.
  let droppedFromTop = 0;
  for (const row of existingRows) {
    const key = row.rowKey as string;
    if (!keptKeys.has(key)) {
      await deleteAITrending(key);
      droppedFromTop++;
    }
  }

  return {
    scanned: allHits.length,
    topicsQueried: AI_TOPICS.length,
    uniqueRepos: unique.length,
    topNStored: top.length,
    droppedFromTop,
    sinceDate,
  };
}
