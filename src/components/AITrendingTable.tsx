import { useEffect, useMemo, useState } from "react";
import { fetchAITrending, type AITrendingRepo, type AITrendingMeta } from "../services/api";

function shortHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return url;
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function RankBadge({ rank, delta, isNew }: { rank: number; delta: number | null; isNew: boolean }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-semibold text-[#e6e8eb] tabular-nums">#{rank}</span>
      {isNew ? (
        <span className="text-[10px] uppercase tracking-wider bg-[#16a34a] text-white px-1.5 py-0.5 rounded">
          New
        </span>
      ) : delta === null || delta === 0 ? (
        <span className="text-xs text-[#6b7280]">—</span>
      ) : delta > 0 ? (
        <span className="text-xs font-semibold text-[#22c55e] tabular-nums">↑{delta}</span>
      ) : (
        <span className="text-xs font-semibold text-[#f87171] tabular-nums">↓{Math.abs(delta)}</span>
      )}
    </div>
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; repos: AITrendingRepo[]; meta: AITrendingMeta }
  | { kind: "empty"; meta: AITrendingMeta }
  | { kind: "error"; message: string };

export function AITrendingTable() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { repos, meta } = await fetchAITrending();
        if (cancelled) return;
        if (repos.length === 0) setState({ kind: "empty", meta });
        else setState({ kind: "ready", repos, meta });
      } catch (err) {
        if (cancelled) return;
        setState({ kind: "error", message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [] as AITrendingRepo[];
    const q = filter.trim().toLowerCase();
    if (!q) return state.repos;
    return state.repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.topics.some((t) => t.toLowerCase().includes(q)) ||
        (r.language ?? "").toLowerCase().includes(q),
    );
  }, [state, filter]);

  if (state.kind === "loading") {
    return (
      <div className="max-w-6xl mx-auto p-6 text-[#8a8f98]">Loading AI trending repos…</div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="max-w-6xl mx-auto p-6 text-red-400">
        Error loading AI trending: {state.message}
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6">
          <div className="text-xs uppercase tracking-widest text-[#8ab4ff] mb-1">
            Top 25 AI Repos Rising
          </div>
          <h1 className="text-2xl font-semibold">No data yet</h1>
          <div className="text-sm text-[#8a8f98] mt-1">
            Trigger the first scan: <code className="bg-[#141821] px-1.5 py-0.5 rounded">POST /api/ai-trending/scan?secret=…</code>
          </div>
          {state.meta.lastScanAt && (
            <div className="text-xs text-[#8a8f98] mt-2">
              Last scan attempted {formatDate(state.meta.lastScanAt)}
            </div>
          )}
        </header>
      </div>
    );
  }

  const repos = state.repos;
  const meta = state.meta;
  const newCount = repos.filter((r) => r.isNew).length;
  const movers = repos.filter((r) => r.delta !== null && r.delta !== 0).length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#8ab4ff] mb-1">
              Top 25 AI Repos Rising
            </div>
            <h1 className="text-2xl font-semibold">{repos.length} repos · last 30 days</h1>
            <div className="text-sm text-[#8a8f98] mt-1">
              {newCount} new this scan · {movers} moved rank
            </div>
          </div>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, description, author, topic, language…"
            className="flex-1 min-w-[260px] max-w-md bg-[#141821] border border-[#24282e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {meta.lastScanAt && (
            <span className="text-xs text-[#8a8f98]">
              Last scan {formatDate(meta.lastScanAt)}
            </span>
          )}
          <span className="text-xs text-[#8a8f98]">
            Filter: created in last 30 days, ≥5 stars, AI-related topics
          </span>
        </div>
      </header>

      <div className="bg-[#141821] border border-[#24282e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[#8a8f98] bg-[#0f1319]">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Repo</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">What it does</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#8a8f98]">
                  No repos match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-[#24282e] align-top hover:bg-[#1a1f28]">
                <td className="px-4 py-3">
                  <RankBadge rank={r.currentRank} delta={r.delta} isNew={r.isNew} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#e6e8eb]">{r.fullName}</div>
                  <div className="text-xs text-[#8a8f98] mt-0.5">
                    {r.stars.toLocaleString()} ★
                    {r.language && <> · {r.language}</>}
                    {r.license && <> · {r.license}</>}
                  </div>
                  {r.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.topics.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2937] text-[#9ca3af]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={r.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8ab4ff] hover:underline break-all"
                  >
                    {shortHost(r.repoUrl)}
                  </a>
                </td>
                <td className="px-4 py-3 text-[#d6d8dc]">{r.description}</td>
                <td className="px-4 py-3 text-[#8a8f98] whitespace-nowrap">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="text-xs text-[#8a8f98] mt-4 text-center">
        Rankings refresh on each scan · ↑/↓ shows movement vs the previous scan
      </footer>
    </div>
  );
}
