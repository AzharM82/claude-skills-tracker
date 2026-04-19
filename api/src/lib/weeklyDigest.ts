import type { InvocationContext } from "@azure/functions";
import { generateWeeklyHighlight } from "./claudeSummary.js";
import { sendWeeklyDigestEmail } from "./emailer.js";
import { scanAndUpsert } from "./githubDiscovery.js";
import { listAllSkills } from "./tableClient.js";

export interface DigestResult {
  scan: Awaited<ReturnType<typeof scanAndUpsert>>;
  newSkillsCount: number;
  totalTracked: number;
  weekStart: string;
  weekEnd: string;
  emailed: boolean;
}

export async function runWeeklyDigest(ctx: InvocationContext): Promise<DigestResult> {
  const scan = await scanAndUpsert(7, { skipCodeSearch: true });
  ctx.log(`Scan result: ${JSON.stringify(scan)}`);

  const all = await listAllSkills();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newSkills = all
    .filter((s) => s.discoveredAt && new Date(s.discoveredAt) >= weekAgo)
    .sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));

  const highlight = await generateWeeklyHighlight(newSkills);
  ctx.log(`Highlight generated (${highlight.length} chars)`);

  await sendWeeklyDigestEmail({
    weekStart: weekAgo.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
    highlight,
    newSkills,
    siteUrl: process.env.SITE_URL ?? "",
    totalTracked: all.length,
  });

  return {
    scan,
    newSkillsCount: newSkills.length,
    totalTracked: all.length,
    weekStart: weekAgo.toISOString().slice(0, 10),
    weekEnd: now.toISOString().slice(0, 10),
    emailed: true,
  };
}

