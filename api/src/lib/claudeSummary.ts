import Anthropic from "@anthropic-ai/sdk";
import type { SkillEntity } from "./tableClient.js";

const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a concise tech newsletter writer for a single reader: a solo builder who tracks new Claude Code skills (reusable agent plugins for Anthropic's coding CLI).

You will receive a JSON list of skill repositories discovered on GitHub in the past week. Pick the 1-2 most interesting ones and write a 3-5 sentence highlight explaining what they do and why they matter. Be specific — reference skill names and what problem they solve. Skip generic filler.

If the list is empty, reply with exactly: "No new skills this week. Check back next Monday."`;

export async function generateWeeklyHighlight(skills: SkillEntity[]): Promise<string> {
  if (skills.length === 0) return "No new skills this week. Check back next Monday.";

  const payload = skills.slice(0, 25).map((s) => ({
    name: s.title,
    repo: s.repoUrl,
    author: s.author,
    description: s.description,
    stars: s.stars,
    topics: s.topics,
  }));

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `New skills from the past week:\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || "No highlight generated.";
}
