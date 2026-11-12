import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { createInitialSeedData } from "../src/lib/seed-data";
import { inferOffer } from "../src/lib/offers";

const prisma = new PrismaClient();

/** Dernier snapshot de métriques par post (pour initialiser les compteurs dénormalisés) */
function latestMetricByPost(
  metrics: ReturnType<typeof createInitialSeedData>["postMetrics"]
) {
  const map = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const prev = map.get(m.postId);
    if (!prev || new Date(m.recordedAt) > new Date(prev.recordedAt)) {
      map.set(m.postId, m);
    }
  }
  return map;
}

async function seedPostgreSQL() {
  const data = createInitialSeedData();

  console.log("🚀 [ALSEK PULSE] Initialisation des Workspaces (Alsek Marketing & Vitrine Caladoise)...");
  for (const ws of data.workspaces) {
    await prisma.workspace.upsert({
      where: { slug: ws.slug },
      update: {
        name: ws.name,
        domain: ws.domain,
        primaryColor: ws.primaryColor,
        logoUrl: ws.logoUrl,
      },
      create: {
        id: ws.id,
        slug: ws.slug,
        name: ws.name,
        domain: ws.domain,
        primaryColor: ws.primaryColor,
        logoUrl: ws.logoUrl,
        createdAt: new Date(ws.createdAt),
      },
    });
  }

  console.log("🏢 [ALSEK PULSE] Création des 3 clients locaux (Villefranche-sur-Saône)...");
  for (const client of data.clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {
        companyName: client.companyName,
        sector: client.sector,
        city: client.city,
        nafCode: client.nafCode,
        employeeCount: client.employeeCount,
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        avgBasketValue: client.avgBasketValue,
        shareToken: client.shareToken,
        websiteUrl: client.websiteUrl,
        gmbPlaceId: client.gmbPlaceId,
        igUsername: client.igUsername,
        tiktokUsername: client.tiktokUsername,
        clarityProjectId: client.clarityProjectId,
        metaPixelId: client.metaPixelId,
        ga4PropertyId: client.ga4PropertyId,
      },
      create: {
        id: client.id,
        companyName: client.companyName,
        sector: client.sector,
        city: client.city,
        nafCode: client.nafCode,
        employeeCount: client.employeeCount,
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        avgBasketValue: client.avgBasketValue,
        shareToken: client.shareToken,
        websiteUrl: client.websiteUrl,
        gmbPlaceId: client.gmbPlaceId,
        igUsername: client.igUsername,
        tiktokUsername: client.tiktokUsername,
        clarityProjectId: client.clarityProjectId,
        metaPixelId: client.metaPixelId,
        ga4PropertyId: client.ga4PropertyId,
        createdAt: new Date(client.createdAt),
      },
    });
  }

  console.log("🔗 [ALSEK PULSE] Rattachement Multi-Portefeuille (Pont d'Upsell Vitrine + Alsek)...");
  for (const cw of data.clientWorkspaces) {
    await prisma.clientWorkspace.upsert({
      where: {
        clientId_workspaceId: {
          clientId: cw.clientId,
          workspaceId: cw.workspaceId,
        },
      },
      update: { status: cw.status },
      create: {
        id: cw.id,
        clientId: cw.clientId,
        workspaceId: cw.workspaceId,
        status: cw.status,
        joinedAt: new Date(cw.joinedAt),
      },
    });
  }

  console.log("📊 [ALSEK PULSE] Injection des Audits Flash (Snapshots T0 & Actuels)...");
  for (const audit of data.audits) {
    await prisma.auditSnapshot.upsert({
      where: { id: audit.id },
      update: {
        visibilityScore: audit.visibilityScore,
        gmbRating: audit.gmbRating,
        gmbReviewsCount: audit.gmbReviewsCount,
        igFollowers: audit.igFollowers,
        igPostsCount: audit.igPostsCount,
        hasWebsite: audit.hasWebsite,
        hasSsl: audit.hasSsl,
        hasMetaPixel: audit.hasMetaPixel,
        hasClarity: audit.hasClarity,
        rawNotes: audit.rawNotes,
      },
      create: {
        id: audit.id,
        clientId: audit.clientId,
        isInitialT0: audit.isInitialT0,
        gmbRating: audit.gmbRating,
        gmbReviewsCount: audit.gmbReviewsCount,
        igFollowers: audit.igFollowers,
        igPostsCount: audit.igPostsCount,
        hasWebsite: audit.hasWebsite,
        hasSsl: audit.hasSsl,
        hasMetaPixel: audit.hasMetaPixel,
        hasClarity: audit.hasClarity,
        visibilityScore: audit.visibilityScore,
        rawNotes: audit.rawNotes,
        recordedAt: new Date(audit.recordedAt),
      },
    });
  }

  console.log("💶 [ALSEK PULSE] Injection du Suivi Commercial & ROI (Zéro PDF)...");
  const wsSlugById = new Map(data.workspaces.map((w) => [w.id, w.slug]));
  for (const sale of data.commercialEntries) {
    const slug = wsSlugById.get(sale.workspaceId) ?? "ALSEK";
    const offer = inferOffer(slug, sale.amountSoldHt);
    const paidAt = sale.paymentStatus === "PAID" ? new Date(sale.periodDate) : null;
    await prisma.commercialEntry.upsert({
      where: { id: sale.id },
      update: {
        productName: sale.productName,
        billingType: sale.billingType,
        amountSoldHt: sale.amountSoldHt,
        paymentStatus: sale.paymentStatus,
        clientRevenueGenerated: sale.clientRevenueGenerated,
        leadsGenerated: sale.leadsGenerated,
        notes: sale.notes,
        offer,
        paidAt,
      },
      create: {
        id: sale.id,
        clientId: sale.clientId,
        workspaceId: sale.workspaceId,
        productName: sale.productName,
        billingType: sale.billingType,
        amountSoldHt: sale.amountSoldHt,
        paymentStatus: sale.paymentStatus,
        clientRevenueGenerated: sale.clientRevenueGenerated,
        leadsGenerated: sale.leadsGenerated,
        periodDate: new Date(sale.periodDate),
        issuedAt: new Date(sale.periodDate),
        paidAt,
        offer,
        notes: sale.notes,
      },
    });
  }

  console.log("📈 [ALSEK PULSE] Injection du ROI mensuel (ClientRoiMetric)...");
  const roiByClientMonth = new Map<
    string,
    { clientId: string; month: Date; leads: number; revenue: number }
  >();
  for (const sale of data.commercialEntries) {
    const d = new Date(sale.periodDate);
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const key = `${sale.clientId}_${month.toISOString()}`;
    const acc = roiByClientMonth.get(key) ?? {
      clientId: sale.clientId,
      month,
      leads: 0,
      revenue: 0,
    };
    acc.leads += sale.leadsGenerated;
    acc.revenue += sale.clientRevenueGenerated;
    roiByClientMonth.set(key, acc);
  }
  for (const roi of roiByClientMonth.values()) {
    await prisma.clientRoiMetric.upsert({
      where: {
        clientId_month: { clientId: roi.clientId, month: roi.month },
      },
      update: { leadsGenerated: roi.leads, estimatedRevenue: roi.revenue },
      create: {
        clientId: roi.clientId,
        month: roi.month,
        leadsGenerated: roi.leads,
        estimatedRevenue: roi.revenue,
        notes: "Agrégat initial issu des ventes seedées",
      },
    });
  }

  console.log("🎬 [ALSEK PULSE] Injection des Reels/TikToks/Shorts & Courbes Temporelles...");
  const latestByPost = latestMetricByPost(data.postMetrics);
  for (const post of data.trackedPosts) {
    const last = latestByPost.get(post.id);
    const counters = {
      views: last?.views ?? 0,
      likes: last?.likes ?? 0,
      comments: last?.comments ?? 0,
      shares: last?.shares ?? 0,
      saves: last?.saves ?? 0,
      lastSyncedAt: last ? new Date(last.recordedAt) : null,
    };
    await prisma.trackedPost.upsert({
      where: { id: post.id },
      update: {
        titleOrHook: post.titleOrHook,
        isActiveTrack: post.isActiveTrack,
        ...counters,
      },
      create: {
        id: post.id,
        clientId: post.clientId,
        workspaceId: post.workspaceId,
        platform: post.platform,
        postUrl: post.postUrl,
        titleOrHook: post.titleOrHook,
        thumbnailUrl: post.thumbnailUrl,
        publishedAt: new Date(post.publishedAt),
        isActiveTrack: post.isActiveTrack,
        ...counters,
      },
    });
  }

  for (const metric of data.postMetrics) {
    await prisma.postMetricSnapshot.upsert({
      where: { id: metric.id },
      update: {
        views: metric.views,
        likes: metric.likes,
        comments: metric.comments,
        shares: metric.shares,
        saves: metric.saves,
        engagementRate: metric.engagementRate,
      },
      create: {
        id: metric.id,
        postId: metric.postId,
        views: metric.views,
        likes: metric.likes,
        comments: metric.comments,
        shares: metric.shares,
        saves: metric.saves,
        engagementRate: metric.engagementRate,
        recordedAt: new Date(metric.recordedAt),
      },
    });
  }

  console.log("🌐 [ALSEK PULSE] Injection des Web, Clarity & Pixel Metrics...");
  for (const wm of data.webMetrics) {
    await prisma.webMetricSnapshot.upsert({
      where: { id: wm.id },
      update: {
        sessionsCount: wm.sessionsCount,
        uniqueVisitors: wm.uniqueVisitors,
        clarityRageClicks: wm.clarityRageClicks,
        clarityDeadClicks: wm.clarityDeadClicks,
        pixelPageViews: wm.pixelPageViews,
        pixelLeadsOrCalls: wm.pixelLeadsOrCalls,
      },
      create: {
        id: wm.id,
        clientId: wm.clientId,
        sessionsCount: wm.sessionsCount,
        uniqueVisitors: wm.uniqueVisitors,
        clarityRageClicks: wm.clarityRageClicks,
        clarityDeadClicks: wm.clarityDeadClicks,
        pixelPageViews: wm.pixelPageViews,
        pixelLeadsOrCalls: wm.pixelLeadsOrCalls,
        recordedAt: new Date(wm.recordedAt),
      },
    });
  }

  console.log("🔌 [ALSEK PULSE] Configuration des Modules IA & Journal d'Automatisations...");
  for (const mod of data.clientModules) {
    await prisma.clientModule.upsert({
      where: {
        clientId_moduleType: {
          clientId: mod.clientId,
          moduleType: mod.moduleType,
        },
      },
      update: {
        isEnabled: mod.isEnabled,
        configJson: (mod.configJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      create: {
        id: mod.id,
        clientId: mod.clientId,
        moduleType: mod.moduleType,
        isEnabled: mod.isEnabled,
        configJson: (mod.configJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  for (const evt of data.automationEvents) {
    await prisma.automationEvent.upsert({
      where: { id: evt.id },
      update: {
        title: evt.title,
        status: evt.status,
        payloadJson: (evt.payloadJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      create: {
        id: evt.id,
        clientId: evt.clientId,
        moduleType: evt.moduleType,
        title: evt.title,
        status: evt.status,
        payloadJson: (evt.payloadJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        createdAt: new Date(evt.createdAt),
      },
    });
  }
}

function seedLocalStoreFile() {
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, "pulse-store.json");
  const seedData = createInitialSeedData();
  fs.writeFileSync(filePath, JSON.stringify(seedData, null, 2), "utf-8");
  console.log(`💾 [ALSEK PULSE] Store local synchronisé dans ${filePath}`);
}

async function main() {
  // Toujours synchroniser le store local JSON pour le mode dev autonome sans Docker
  seedLocalStoreFile();

  try {
    const alreadySeeded = (await prisma.workspace.count()) > 0;
    if (alreadySeeded && process.env.FORCE_SEED !== "1") {
      console.log(
        "⏭️  [ALSEK PULSE] Base déjà initialisée : seed ignoré pour préserver vos données (FORCE_SEED=1 pour forcer)."
      );
      return;
    }
    await seedPostgreSQL();
    console.log("✅ [ALSEK PULSE] Seed PostgreSQL 16 terminé avec succès !");
  } catch (error) {
    console.warn(
      "⚠️ [ALSEK PULSE] PostgreSQL n'est pas joignable sur cet hôte local. Le store local (.data/pulse-store.json) a été initialisé avec succès avec les 2 Workspaces et les 3 Clients complets."
    );
    if (process.env.DEBUG_SEED) {
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
