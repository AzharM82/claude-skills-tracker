import { Octokit } from "@octokit/rest";
import {
  type SkillEntity,
  SKILLS_PARTITION,
  ensureTable,
  getSkill,
  repoToRowKey,
  upsertSkill,
} from "./tableClient.js";

const TOPIC_QUERIES = ["claude-skill", "claude-code-skill", "anthropic-skill", "claude-skills"];

let octokit: Octokit | null = null;
function gh(): Octokit {
  if (!octokit) {
    const auth = process.env.GITHUB_TOKEN;
    octokit = new Octokit(auth ? { auth } : {});
  }
  return octokit;
}

interface RepoHit {
  fullName: string;
  htmlUrl: string;
  description: string;
  author: string;
  stars: number;
  topics: string[];
  pushedAt: string;
  source: string;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function searchTopicRepos(topic: string, sinceDate: string): Promise<RepoHit[]> {
  const q = `topic:${topic} pushed:>=${sinceDate}`;
  const out: RepoHit[] = [];
  try {
    const res = await gh().rest.search.repos({ q, per_page: 100, sort: "updated", order: "desc" });
    for (const r of res.data.items) {
      out.push({
        fullName: r.full_name,
        htmlUrl: r.html_url,
        description: r.description ?? "",
        author: r.owner?.login ?? "",
        stars: r.stargazers_count ?? 0,
        topics: r.topics ?? [],
        pushedAt: r.pushed_at ?? "",
        source: `topic:${topic}`,
      });
    }
  } catch (err) {
    console.warn(`searchTopicRepos(${topic}) failed:`, (err as Error).message);
  }
  return out;
}

async function searchSkillMdFiles(sinceDate: string): Promise<RepoHit[]> {
  const out: RepoHit[] = [];
  const q = `filename:SKILL.md path:/`;
  try {
    const res = await gh().rest.search.code({ q, per_page: 50 });
    const seen = new Set<string>();
    for (const item of res.data.items) {
      const full = item.repository.full_name;
      if (seen.has(full)) continue;
      seen.add(full);
      try {
        const repo = await gh().rest.repos.get({
          owner: item.repository.owner.login,
          repo: item.repository.name,
        });
        const pushedAt = repo.data.pushed_at ?? "";
        if (pushedAt && pushedAt.slice(0, 10) < sinceDate) continue;
        out.push({
          fullName: repo.data.full_name,
          htmlUrl: repo.data.html_url,
          description: repo.data.description ?? "",
          author: repo.data.owner?.login ?? "",
          stars: repo.data.stargazers_count ?? 0,
          topics: repo.data.topics ?? [],
          pushedAt,
          source: "filename:SKILL.md",
        });
      } catch (err) {
        console.warn(`repos.get(${full}) failed:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.warn("searchSkillMdFiles failed:", (err as Error).message);
  }
  return out;
}

async function fetchSkillMdDescription(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await gh().rest.repos.getContent({ owner, repo, path: "SKILL.md" });
    const data = res.data as { content?: string; encoding?: string };
    if (!data.content) return null;
    const decoded = Buffer.from(data.content, (data.encoding as BufferEncoding) ?? "base64").toString("utf-8");
    const head = decoded.slice(0, 4000);
    const fmMatch = head.match(/^---[\s\S]*?---/m);
    if (!fmMatch) return null;
    const descLine = fmMatch[0].match(/^description:\s*(.+)$/m);
    if (!descLine) return null;
    return descLine[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

function dedupe(hits: RepoHit[]): RepoHit[] {
  const map = new Map<string, RepoHit>();
  for (const h of hits) {
    const existing = map.get(h.fullName);
    if (!existing) {
      map.set(h.fullName, h);
    } else if (existing.source.startsWith("filename") && h.source.startsWith("topic")) {
      map.set(h.fullName, h);
    }
  }
  return [...map.values()];
}

export interface ScanResult {
  scanned: number;
  newSkills: number;
  updatedSkills: number;
  lookbackDays: number;
  sinceDate: string;
  skippedCodeSearch: boolean;
}

export interface ScanOptions {
  skipCodeSearch?: boolean;
}

export async function scanAndUpsert(lookbackDays: number, options: ScanOptions = {}): Promise<ScanResult> {
  await ensureTable();
  const sinceDate = toIsoDate(new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000));

  const topicHits = (await Promise.all(TOPIC_QUERIES.map((t) => searchTopicRepos(t, sinceDate)))).flat();
  const skillMdHits = options.skipCodeSearch ? [] : await searchSkillMdFiles(sinceDate);
  const hits = dedupe([...topicHits, ...skillMdHits]);

  const now = new Date().toISOString();
  let newCount = 0;
  let updatedCount = 0;

  for (const hit of hits) {
    const rowKey = repoToRowKey(hit.fullName);
    const existing = await getSkill(rowKey);

    let description = hit.description;
    if (!description || description.length < 15) {
      const [owner, repo] = hit.fullName.split("/");
      const md = await fetchSkillMdDescription(owner, repo);
      if (md) description = md;
    }

    const entity: SkillEntity = {
      partitionKey: SKILLS_PARTITION,
      rowKey,
      title: hit.fullName.split("/")[1] ?? hit.fullName,
      repoUrl: hit.htmlUrl,
      description: description || "(no description provided)",
      author: hit.author,
      stars: hit.stars,
      topics: hit.topics.join(","),
      pushedAt: hit.pushedAt,
      discoveredAt: existing?.discoveredAt ?? now,
      lastSeenAt: now,
      sourceQuery: hit.source,
    };

    await upsertSkill(entity);
    if (existing) updatedCount++;
    else newCount++;
  }

  return {
    scanned: hits.length,
    newSkills: newCount,
    updatedSkills: updatedCount,
    lookbackDays,
    sinceDate,
    skippedCodeSearch: options.skipCodeSearch ?? false,
  };
}
