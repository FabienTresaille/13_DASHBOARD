import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { createInitialSeedData } from "../src/lib/seed-data";

const prisma = new PrismaClient();

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
  for (const sale of data.commercialEntries) {
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
        notes: sale.notes,
      },
    });
  }

  console.log("🎬 [ALSEK PULSE] Injection des Reels/TikToks/Shorts & Courbes Temporelles...");
  for (const post of data.trackedPosts) {
    await prisma.trackedPost.upsert({
      where: { id: post.id },
      update: {
        titleOrHook: post.titleOrHook,
        isActiveTrack: post.isActiveTrack,
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
