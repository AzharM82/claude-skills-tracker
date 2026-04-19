import { runWeeklyDigest } from "./lib/weeklyDigest.js";

const mockCtx = {
  log: (...args: unknown[]) => console.log("[log]", ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
  warn: (...args: unknown[]) => console.warn("[warn]", ...args),
} as unknown as import("@azure/functions").InvocationContext;

(async () => {
  try {
    const result = await runWeeklyDigest(mockCtx);
    console.log("Digest complete:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Digest failed:", (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }
})();
