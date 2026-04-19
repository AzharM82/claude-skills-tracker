import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuthorizedUser } from "../lib/auth.js";
import { listAllSkills } from "../lib/tableClient.js";

app.http("SkillsList", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "skills",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      requireAuthorizedUser(req);
      const all = await listAllSkills();
      const skills = all
        .map((s) => ({
          id: s.rowKey,
          title: s.title,
          repoUrl: s.repoUrl,
          description: s.description,
          author: s.author,
          stars: s.stars,
          topics: s.topics ? s.topics.split(",").filter(Boolean) : [],
          discoveredAt: s.discoveredAt,
          lastSeenAt: s.lastSeenAt,
          pushedAt: s.pushedAt,
        }))
        .sort((a, b) => (a.discoveredAt < b.discoveredAt ? 1 : -1));
      return { status: 200, jsonBody: { skills, count: skills.length } };
    } catch (err) {
      if ((err as Error).message === "Unauthorized") {
        return { status: 401, jsonBody: { error: "Unauthorized" } };
      }
      ctx.error("SkillsList error:", (err as Error).message);
      return { status: 500, jsonBody: { error: (err as Error).message } };
    }
  },
});
