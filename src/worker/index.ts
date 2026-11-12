import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, Prisma } from "@prisma/client";
import { SocialScraperService } from "../services/social-scraper.service";
import { getPluginByType } from "../modules/registry";
import type { ModuleTypeKey } from "../modules/types";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const KPI_QUEUE_NAME = "pulse-kpi-sync";
export const SYNC_SOCIAL_JOB = "sync-social-metrics";
const LEGACY_SYNC_JOB = "sync-tracked-posts-kpis";

const prisma = new PrismaClient();

interface OEmbedData {
  title: string | null;
  thumbnailUrl: string | null;
}

/** Métadonnées publiques via oEmbed (YouTube / TikTok / Facebook publics). Retourne null si indisponible. */
async function fetchOEmbed(
  platform: string,
  postUrl: string
): Promise<OEmbedData | null> {
  const endpoints: Record<string, string> = {
    YOUTUBE: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(postUrl)}`,
    TIKTOK: `https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`,
  };
  const endpoint = endpoints[platform];
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
    };
    return {
      title: json.title ? json.title.slice(0, 140) : null,
      thumbnailUrl: json.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Job `sync-social-metrics` : parcourt les SocialPost (TrackedPost) actifs.
 * - oEmbed → titre / miniature si manquants
 * - OpenGraph / Apify → compteurs réels si disponibles (nouveau PostMetricSnapshot)
 * - Sinon : AUCUNE donnée inventée, seul `lastSyncedAt` est mis à jour
 *   (les chiffres restent modifiables en 1 clic depuis l'UI).
 */
export async function syncSocialMetrics(onlyPostId?: string) {
  console.log("🔄 [BullMQ Worker] sync-social-metrics : démarrage...");
  const activePosts = await prisma.trackedPost.findMany({
    where: { isActiveTrack: true, ...(onlyPostId ? { id: onlyPostId } : {}) },
  });

  let updated = 0;
  let touched = 0;

  for (const post of activePosts) {
    try {
      const oembed = await fetchOEmbed(post.platform, post.postUrl);
      const scraped = await SocialScraperService.fetchPostMetrics(post.postUrl);
      const hasRealCounters = scraped.source !== "SMART_ESTIMATION";

      await prisma.trackedPost.update({
        where: { id: post.id },
        data: {
          lastSyncedAt: new Date(),
          ...(oembed?.title && !post.titleOrHook
            ? { titleOrHook: oembed.title }
            : {}),
          ...(oembed?.thumbnailUrl && !post.thumbnailUrl
            ? { thumbnailUrl: oembed.thumbnailUrl }
            : {}),
          ...(hasRealCounters
            ? {
                views: scraped.views,
                likes: scraped.likes,
                comments: scraped.comments,
                shares: scraped.shares,
                saves: scraped.saves,
              }
            : {}),
        },
      });

      if (hasRealCounters) {
        await prisma.postMetricSnapshot.create({
          data: {
            postId: post.id,
            views: scraped.views,
            likes: scraped.likes,
            comments: scraped.comments,
            shares: scraped.shares,
            saves: scraped.saves,
            engagementRate: scraped.engagementRate,
          },
        });
        updated++;
        console.log(
          `✅ Post ${post.id} (${post.platform}) : ${scraped.views} vues via ${scraped.source}`
        );
      } else {
        touched++;
        console.log(
          `⏱️  Post ${post.id} (${post.platform}) : compteurs non publics, lastSyncedAt mis à jour`
        );
      }
    } catch (err) {
      console.error(`⚠️ Post ${post.id} ignoré :`, (err as Error).message);
    }
  }

  console.log(
    `🏁 sync-social-metrics terminé : ${updated} mis à jour, ${touched} horodatés, ${activePosts.length} total.`
  );
}

async function runEnabledClientAutomations() {
  console.log("🤖 [BullMQ Worker] Exécution des modules d'automatisation IA actifs...");
  const enabledModules = await prisma.clientModule.findMany({
    where: { isEnabled: true },
    include: { client: true },
  });

  for (const mod of enabledModules) {
    const plugin = getPluginByType(mod.moduleType as ModuleTypeKey);
    if (!plugin) continue;

    const result = await plugin.execute({
      clientId: mod.client.id,
      companyName: mod.client.companyName,
      sector: mod.client.sector,
      city: mod.client.city,
      nafCode: mod.client.nafCode,
      employeeCount: mod.client.employeeCount,
      gmbPlaceId: mod.client.gmbPlaceId,
      clarityProjectId: mod.client.clarityProjectId,
      config: (mod.configJson as Record<string, unknown>) || plugin.defaultConfig,
    });

    await prisma.automationEvent.create({
      data: {
        clientId: mod.client.id,
        moduleType: mod.moduleType,
        title: result.title,
        status: result.status,
        payloadJson: result.payloadJson as Prisma.InputJsonValue,
      },
    });

    console.log(
      `✨ [BullMQ Worker] Plugin ${mod.moduleType} exécuté pour ${mod.client.companyName} -> ${result.title}`
    );
  }
}

async function bootstrapWorker() {
  console.log("🚀 [ALSEK PULSE WORKER] Initialisation du moteur BullMQ & Cron...");

  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const kpiQueue = new Queue(KPI_QUEUE_NAME, { connection });

  // Nettoyage : supprime l'ancien job répétable (remplacé par sync-social-metrics)
  const repeatables = await kpiQueue.getRepeatableJobs();
  for (const r of repeatables) {
    if (r.name === LEGACY_SYNC_JOB) {
      await kpiQueue.removeRepeatableByKey(r.key);
    }
  }

  // Planification Cron : synchronisation des métriques sociales toutes les 6 heures
  // (déclenchable manuellement : npm run worker:sync)
  await kpiQueue.add(
    SYNC_SOCIAL_JOB,
    { triggeredBy: "cron-6h" },
    {
      repeat: { pattern: "0 */6 * * *" },
      removeOnComplete: 50,
      removeOnFail: 100,
    }
  );

  // Planification Cron : Exécution des plugins IA tous les matins à 07h30
  await kpiQueue.add(
    "run-enabled-client-modules",
    { triggeredBy: "cron-daily" },
    {
      repeat: { pattern: "30 7 * * *" },
      removeOnComplete: 50,
      removeOnFail: 100,
    }
  );

  const worker = new Worker(
    KPI_QUEUE_NAME,
    async (job: Job) => {
      if (job.name === SYNC_SOCIAL_JOB) {
        await syncSocialMetrics(
          typeof job.data?.postId === "string" ? job.data.postId : undefined
        );
      } else if (job.name === "run-enabled-client-modules") {
        await runEnabledClientAutomations();
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`🎯 [BullMQ] Job ${job.name} (#${job.id}) terminé avec succès.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [BullMQ] Échec du job ${job?.name}:`, err.message);
  });

  const shutdown = async () => {
    console.log("🛑 [ALSEK PULSE WORKER] Arrêt gracieux en cours...");
    await worker.close();
    await kpiQueue.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrapWorker().catch((err) => {
  console.error("Erreur critique au démarrage du Worker BullMQ :", err);
  process.exit(1);
});
