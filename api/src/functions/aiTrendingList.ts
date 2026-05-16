import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuthorizedUser } from "../lib/auth.js";
import { listAllAITrending } from "../lib/aiTrendingTable.js";

app.http("AITrendingList", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ai-trending",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      requireAuthorizedUser(req);
      const rows = await listAllAITrending();

      const repos = rows
        .map((r) => {
          const previousRank = Number(r.previousRank) || 0;
          const currentRank = Number(r.currentRank) || 0;
          // delta = previous - current → positive means moved UP
          const delta = previousRank === 0 ? null : previousRank - currentRank;
          const isNew = previousRank === 0;
          return {
            id: r.rowKey,
            fullName: r.fullName,
            repoUrl: r.htmlUrl,
            description: r.description,
            author: r.author,
            stars: r.stars,
            topics: r.topics ? r.topics.split(",").filter(Boolean) : [],
            language: r.language || null,
            license: r.license || null,
            createdAt: r.createdAt,
            pushedAt: r.pushedAt,
            discoveredAt: r.discoveredAt,
            currentRank,
            previousRank: previousRank || null,
            delta,
            isNew,
            sourceTopic: r.sourceTopic,
          };
        })
        .sort((a, b) => a.currentRank - b.currentRank);

      const lastScanAt = rows.reduce<string>(
        (max, r) => (r.lastScanAt && r.lastScanAt > max ? r.lastScanAt : max),
        "",
      );

      return {
        status: 200,
        jsonBody: {
          repos,
          count: repos.length,
          meta: { lastScanAt: lastScanAt || null },
        },
      };
    } catch (err) {
      if ((err as Error).message === "Unauthorized") {
        return { status: 401, jsonBody: { error: "Unauthorized" } };
      }
      ctx.error("AITrendingList error:", (err as Error).message, (err as Error).stack);
      return { status: 500, jsonBody: { error: (err as Error).message } };
    }
  },
});
