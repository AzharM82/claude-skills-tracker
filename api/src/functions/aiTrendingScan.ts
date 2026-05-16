import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { scanAITrending } from "../lib/aiTrendingDiscovery.js";

app.http("AITrendingScan", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "ai-trending/scan",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const expected = process.env.SCAN_SECRET;
    const provided = req.query.get("secret") ?? req.headers.get("x-scan-secret");
    if (!expected || provided !== expected) {
      return { status: 401, jsonBody: { error: "Unauthorized" } };
    }

    try {
      const result = await scanAITrending();
      ctx.log(`AITrendingScan: ${JSON.stringify(result)}`);
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error("AITrendingScan error:", (err as Error).message, (err as Error).stack);
      return { status: 500, jsonBody: { error: (err as Error).message } };
    }
  },
});
