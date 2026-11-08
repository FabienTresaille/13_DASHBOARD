import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, Prisma } from "@prisma/client";
import { SocialScraperService } from "../services/social-scraper.service";
import { getPluginByType } from "../modules/registry";
import type { ModuleTypeKey } from "../modules/types";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const KPI_QUEUE_NAME = "pulse-kpi-sync";

const prisma = new PrismaClient();

async function syncAllActivePosts() {
  console.log("🔄 [BullMQ Worker] Démarrage du scraping périodique des publications trackées...");
  const activePosts = await prisma.trackedPost.findMany({
    where: { isActiveTrack: true },
    include: {
      metrics: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  for (const post of activePosts) {
    const lastMetric = post.metrics[0];
    const scraped = await SocialScraperService.fetchPostMetrics(post.postUrl, {
      customTitle: post.titleOrHook || undefined,
      previousMetrics: lastMetric
        ? {
            views: lastMetric.views,
            likes: lastMetric.likes,
            comments: lastMetric.comments,
            shares: lastMetric.shares,
            saves: lastMetric.saves,
          }
        : undefined,
    });

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

    console.log(
      `✅ [BullMQ Worker] Post ${post.id} (${post.platform}) mis à jour : ${scraped.views} vues (${scraped.engagementRate}% eng.)`
    );
  }
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

  // Planification Cron : Actualisation des vues toutes les 6 heures
  await kpiQueue.add(
    "sync-tracked-posts-kpis",
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
      if (job.name === "sync-tracked-posts-kpis") {
        await syncAllActivePosts();
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
