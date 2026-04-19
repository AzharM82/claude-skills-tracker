import { scanAndUpsert } from "./lib/githubDiscovery.js";

const days = parseInt(process.argv[2] ?? "30", 10);
console.log(`Running ${days}-day scan...`);

(async () => {
  try {
    const result = await scanAndUpsert(days);
    console.log("Scan complete:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Scan failed:", (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }
})();
