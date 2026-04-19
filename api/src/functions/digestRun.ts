import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runWeeklyDigest } from "../lib/weeklyDigest.js";

app.http("DigestRun", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "digest/run",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const expected = process.env.SCAN_SECRET;
    const provided = req.query.get("secret") ?? req.headers.get("x-scan-secret");
    if (!expected || provided !== expected) {
      return { status: 401, jsonBody: { error: "Unauthorized" } };
    }
    try {
      const result = await runWeeklyDigest(ctx);
      return { status: 200, jsonBody: result };
    } catch (err) {
      ctx.error("DigestRun error:", (err as Error).message, (err as Error).stack);
      return { status: 500, jsonBody: { error: (err as Error).message } };
    }
  },
});
