/**
 * Déclenchement manuel du job `sync-social-metrics`.
 * Usage :  npm run worker:sync            (tous les posts actifs)
 *          npm run worker:sync -- <postId> (un seul post)
 * Sur le VPS : docker compose exec pulse-worker ./node_modules/.bin/tsx src/worker/trigger.ts
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function main() {
  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue("pulse-kpi-sync", { connection });
  const postId = process.argv[2];

  const job = await queue.add(
    "sync-social-metrics",
    { triggeredBy: "manual", ...(postId ? { postId } : {}) },
    { removeOnComplete: 50, removeOnFail: 100 }
  );
  console.log(
    `📬 Job sync-social-metrics #${job.id} mis en file${postId ? ` (post ${postId})` : ""}.`
  );

  await queue.close();
  await connection.quit();
}

main().catch((err) => {
  console.error("Impossible de déclencher le job :", err);
  process.exit(1);
});
