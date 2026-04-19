import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { scanAndUpsert } from "../lib/githubDiscovery.js";

app.http("SkillsScan", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "skills/scan",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const expected = process.env.SCAN_SECRET;
    const provided = req.query.get("secret") ?? req.headers.get("x-scan-secret");
    if (!expected || provided !== expected) {
      return { status: 401, jsonBody: { error: "Unauthorized" } };
    }

    const lookbackRaw = req.query.get("lookback");
    const lookback = lookbackRaw ? Math.min(Math.max(parseInt(lookbackRaw, 10) || 7, 1), 365) : 7;

    try {
      const result = await scanAndUpsert(lookback);
      ctx.log(`SkillsScan: ${JSON.stringify(result)}`);
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error("SkillsScan error:", (err as Error).message, (err as Error).stack);
      return { status: 500, jsonBody: { error: (err as Error).message } };
    }
  },
});
