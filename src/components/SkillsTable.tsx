import { useMemo, useState } from "react";
import type { Skill } from "../services/api";

function isNewThisWeek(iso: string): boolean {
  const discovered = new Date(iso);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return discovered >= weekAgo;
}

function shortHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return url;
  }
}

export function SkillsTable({ skills }: { skills: Skill[] }) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.topics.some((t) => t.toLowerCase().includes(q)),
    );
  }, [skills, filter]);

  const newCount = skills.filter((s) => isNewThisWeek(s.discoveredAt)).length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#8ab4ff] mb-1">
            Claude Code Skills Tracker
          </div>
          <h1 className="text-2xl font-semibold">{skills.length} skills tracked</h1>
          <div className="text-sm text-[#8a8f98] mt-1">
            {newCount} new this week &middot; Auto-discovers from GitHub weekly
          </div>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, description, author, topic..."
          className="flex-1 min-w-[260px] max-w-md bg-[#141821] border border-[#24282e] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
        />
      </header>

      <div className="bg-[#141821] border border-[#24282e] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[#8a8f98] bg-[#0f1319]">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">What it does</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-[#8a8f98]">
                  No skills match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-[#24282e] align-top hover:bg-[#1a1f28]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#e6e8eb]">{s.title}</span>
                    {isNewThisWeek(s.discoveredAt) && (
                      <span className="text-[10px] uppercase tracking-wider bg-[#16a34a] text-white px-1.5 py-0.5 rounded">
                        New
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#8a8f98] mt-0.5">
                    {s.author} &middot; {s.stars} ★
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={s.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8ab4ff] hover:underline break-all"
                  >
                    {shortHost(s.repoUrl)}
                  </a>
                </td>
                <td className="px-4 py-3 text-[#d6d8dc]">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="text-xs text-[#8a8f98] mt-4 text-center">
        Weekly digest email sent Monday 10:00 AM PT.
      </footer>
    </div>
  );
}
