"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  dbCreateClient,
  dbToggleClientWorkspace,
  dbUpdateClientTracking,
  dbSaveAuditSnapshot,
  dbCreateCommercialEntry,
  dbCyclePaymentStatus,
  dbUpdateCommercialRoi,
  dbDeleteCommercialEntry,
  dbAddTrackedPostByUrl,
  dbRefreshOrUpdatePostMetrics,
  dbDeleteTrackedPost,
  dbAddWebMetricSnapshot,
  dbToggleClientModule,
  dbUpdateClientModuleConfig,
  dbTriggerModuleExecution,
  dbApproveAutomationEvent,
  dbUpdateCommercialEntry,
  dbSetPaymentStatus,
  dbUpdatePostStats,
  dbUpsertClientRoiMetric,
  getWorkspaceKpis,
  loadDatabaseState,
  type WorkspaceFilter,
  type WorkspaceKpis,
  type OfferTypeKey,
} from "@/lib/db";
import type {
  WorkspaceSlugType,
  BillingTypeKey,
  PaymentStatusKey,
} from "@/lib/seed-data";
import type { ModuleTypeKey } from "@/modules/types";
import { SocialScraperService } from "@/services/social-scraper.service";

async function enqueueSocialSyncJob(
  postId?: string,
  triggeredBy: string = "ui-manual"
): Promise<boolean> {
  try {
    const { Queue } = await import("bullmq");
    const IORedis = (await import("ioredis")).default;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 650,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    connection.on("error", () => {});

    let queued = false;
    await Promise.race([
      (async () => {
        const queue = new Queue("pulse-kpi-sync", { connection });
        await queue.add(
          "sync-social-metrics",
          { triggeredBy, ...(postId ? { postId } : {}) },
          { removeOnComplete: 50, removeOnFail: 100 }
        );
        queued = true;
        await queue.close();
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), 750)
      ),
    ]);
    await connection.quit().catch(() => {});
    return queued;
  } catch {
    return false;
  }
}

export async function setActiveWorkspaceAction(workspace: WorkspaceFilter) {
  const cookieStore = await cookies();
  cookieStore.set("pulse_workspace", workspace, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

export async function createClientAction(formData: FormData) {
  const companyName = String(formData.get("companyName") || "").trim();
  if (!companyName) return { ok: false, error: "Nom de l'entreprise requis" };

  const sector = String(formData.get("sector") || "Commerce Local").trim();
  const city =
    String(formData.get("city") || "Villefranche-sur-Saône").trim() ||
    "Villefranche-sur-Saône";
  const nafCode = String(formData.get("nafCode") || "").trim() || undefined;
  const employeeCountRaw = Number(formData.get("employeeCount") || 0);
  const employeeCount = employeeCountRaw > 0 ? employeeCountRaw : undefined;
  const avgBasketValue = Number(formData.get("avgBasketValue") || 40);
  const contactName =
    String(formData.get("contactName") || "").trim() || undefined;
  const contactEmail =
    String(formData.get("contactEmail") || "").trim() || undefined;
  const contactPhone =
    String(formData.get("contactPhone") || "").trim() || undefined;
  const websiteUrl =
    String(formData.get("websiteUrl") || "").trim() || undefined;
  const igUsername =
    String(formData.get("igUsername") || "").trim() || undefined;
  const tiktokUsername =
    String(formData.get("tiktokUsername") || "").trim() || undefined;
  const gmbPlaceId =
    String(formData.get("gmbPlaceId") || "").trim() || undefined;

  const workspaces: WorkspaceSlugType[] = [];
  if (formData.get("ws_alsek") === "on") workspaces.push("ALSEK");
  if (formData.get("ws_vitrine") === "on") workspaces.push("VITRINE");
  if (workspaces.length === 0) workspaces.push("ALSEK");

  const clientId = await dbCreateClient({
    companyName,
    sector,
    city,
    nafCode,
    employeeCount,
    avgBasketValue,
    contactName,
    contactEmail,
    contactPhone,
    websiteUrl,
    igUsername,
    tiktokUsername,
    gmbPlaceId,
    workspaces,
  });

  revalidatePath("/");
  revalidatePath("/clients");
  return { ok: true, clientId };
}

export async function toggleClientWorkspaceAction(
  clientId: string,
  workspaceSlug: WorkspaceSlugType
) {
  await dbToggleClientWorkspace(clientId, workspaceSlug);
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientTrackingAction(
  clientId: string,
  formData: FormData
) {
  const companyName = String(formData.get("companyName") || "").trim();
  const sector = String(formData.get("sector") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const nafCode = String(formData.get("nafCode") || "").trim();
  const employeeCountVal = formData.get("employeeCount");
  const employeeCount = employeeCountVal ? Number(employeeCountVal) : null;
  const avgBasketValue = Number(formData.get("avgBasketValue") || 35);
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const contactPhone = String(formData.get("contactPhone") || "").trim();
  const websiteUrl = String(formData.get("websiteUrl") || "").trim();
  const gmbPlaceId = String(formData.get("gmbPlaceId") || "").trim();
  const igUsername = String(formData.get("igUsername") || "").trim();
  const tiktokUsername = String(formData.get("tiktokUsername") || "").trim();
  const clarityProjectId = String(
    formData.get("clarityProjectId") || ""
  ).trim();
  const metaPixelId = String(formData.get("metaPixelId") || "").trim();
  const ga4PropertyId = String(formData.get("ga4PropertyId") || "").trim();

  await dbUpdateClientTracking(clientId, {
    ...(companyName ? { companyName } : {}),
    ...(sector ? { sector } : {}),
    ...(city ? { city } : {}),
    nafCode: nafCode || undefined,
    employeeCount,
    avgBasketValue,
    contactName: contactName || undefined,
    contactEmail: contactEmail || undefined,
    contactPhone: contactPhone || undefined,
    websiteUrl: websiteUrl || undefined,
    gmbPlaceId: gmbPlaceId || undefined,
    igUsername: igUsername || undefined,
    tiktokUsername: tiktokUsername || undefined,
    clarityProjectId: clarityProjectId || undefined,
    metaPixelId: metaPixelId || undefined,
    ga4PropertyId: ga4PropertyId || undefined,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

// ONGLET 1 : AUDIT FLASH (T0 & Évolution)
export async function saveAuditSnapshotAction(
  clientId: string,
  formData: FormData
) {
  const isInitialT0 = formData.get("isInitialT0") === "true";
  const gmbRating = Number(formData.get("gmbRating") || 0) || null;
  const gmbReviewsCount = Number(formData.get("gmbReviewsCount") || 0) || null;
  const igFollowers = Number(formData.get("igFollowers") || 0) || null;
  const igPostsCount = Number(formData.get("igPostsCount") || 0) || null;
  const hasWebsite = formData.get("hasWebsite") === "on";
  const hasSsl = formData.get("hasSsl") === "on";
  const hasMetaPixel = formData.get("hasMetaPixel") === "on";
  const hasClarity = formData.get("hasClarity") === "on";
  const visibilityScore = Math.min(
    100,
    Math.max(0, Number(formData.get("visibilityScore") || 50))
  );
  const rawNotes = String(formData.get("rawNotes") || "").trim() || null;

  await dbSaveAuditSnapshot({
    clientId,
    isInitialT0,
    gmbRating,
    gmbReviewsCount,
    igFollowers,
    igPostsCount,
    hasWebsite,
    hasSsl,
    hasMetaPixel,
    hasClarity,
    visibilityScore,
    rawNotes,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

// ONGLET 2 : SUIVI COMMERCIAL & ROI (100% SAISIE RAPIDE - ZÉRO PDF)
export async function addCommercialEntryAction(
  clientId: string,
  formData: FormData
) {
  const productName = String(formData.get("productName") || "").trim();
  if (!productName) return;

  const workspaceSlug = (formData.get("workspaceSlug") ||
    "ALSEK") as WorkspaceSlugType;
  const offerRaw = String(formData.get("offer") || "").trim() as
    | OfferTypeKey
    | "";
  const billingType = (formData.get("billingType") ||
    "ONE_SHOT") as BillingTypeKey;
  const amountSoldHt = Number(formData.get("amountSoldHt") || 0);
  const paymentStatus = (formData.get("paymentStatus") ||
    "PENDING") as PaymentStatusKey;
  const leadsGenerated = Number(formData.get("leadsGenerated") || 0);
  const clientRevenueGenerated = Number(
    formData.get("clientRevenueGenerated") || 0
  );
  const notes = String(formData.get("notes") || "").trim() || undefined;

  await dbCreateCommercialEntry({
    clientId,
    workspaceSlug,
    productName,
    offer: offerRaw || undefined,
    billingType,
    amountSoldHt,
    paymentStatus,
    clientRevenueGenerated,
    leadsGenerated,
    notes,
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/dashboard/billing");
}

export async function cyclePaymentStatusAction(
  entryId: string,
  clientId?: string
) {
  await dbCyclePaymentStatus(entryId);
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidatePath("/clients");
}

export async function updateCommercialRoiAction(
  entryId: string,
  clientId: string,
  clientRevenueGenerated: number,
  leadsGenerated: number
) {
  await dbUpdateCommercialRoi(entryId, clientRevenueGenerated, leadsGenerated);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  revalidatePath("/clients");
}

export async function deleteCommercialEntryAction(
  entryId: string,
  clientId: string
) {
  await dbDeleteCommercialEntry(entryId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

// ONGLET 3 : CONTENT TRACKER PAR LIEN
export async function addTrackedPostAction(
  clientId: string,
  formData: FormData
) {
  const rawUrl = String(formData.get("postUrl") || "").trim();
  if (!rawUrl) return;

  // 1. Normalisation automatique de l'URL (ex: Instagram /reels/ -> /reel/ et suppression ?igsh=...)
  const postUrl = SocialScraperService.normalizePostUrl(rawUrl);

  const workspaceSlug = (formData.get("workspaceSlug") ||
    "ALSEK") as WorkspaceSlugType;
  const customTitle =
    String(formData.get("titleOrHook") || "").trim() || undefined;

  const parseOptionalCounter = (key: string): number => {
    const val = formData.get(key);
    if (val === null || val === "") return 0;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  };

  // 2. Création avec compteurs initialisés à 0 (zéro fausse donnée)
  const postId = await dbAddTrackedPostByUrl({
    clientId,
    workspaceSlug,
    postUrl,
    customTitle,
    initialStats: {
      views: parseOptionalCounter("views"),
      likes: parseOptionalCounter("likes"),
      comments: parseOptionalCounter("comments"),
      shares: parseOptionalCounter("shares"),
      saves: parseOptionalCounter("saves"),
    },
  });

  // 3. Déclenchement immédiat du job BullMQ ciblé sur ce post
  await enqueueSocialSyncJob(postId, "post-created");

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
}

export async function refreshPostMetricsAction(
  postId: string,
  clientId: string,
  manualOverride?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }
) {
  await dbRefreshOrUpdatePostMetrics(postId, manualOverride);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
}

export async function deleteTrackedPostAction(
  postId: string,
  clientId: string
) {
  await dbDeleteTrackedPost(postId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
}

// ONGLET 4 : WEB, CLARITY & PIXEL METRICS
export async function addWebMetricSnapshotAction(
  clientId: string,
  formData: FormData
) {
  const sessionsCount = Number(formData.get("sessionsCount") || 0);
  const uniqueVisitors = Number(formData.get("uniqueVisitors") || 0);
  const pixelPageViews = Number(formData.get("pixelPageViews") || 0);
  const pixelLeadsOrCalls = Number(formData.get("pixelLeadsOrCalls") || 0);
  const clarityRageClicks = Number(formData.get("clarityRageClicks") || 0);
  const clarityDeadClicks = Number(formData.get("clarityDeadClicks") || 0);

  await dbAddWebMetricSnapshot({
    clientId,
    sessionsCount,
    uniqueVisitors,
    pixelPageViews,
    pixelLeadsOrCalls,
    clarityRageClicks,
    clarityDeadClicks,
  });

  revalidatePath(`/clients/${clientId}`);
}

// ONGLET 5 : MODULES IA & AUTOMATISATIONS (PLUGIN-READY)
export async function toggleClientModuleAction(
  clientId: string,
  moduleType: ModuleTypeKey,
  isEnabled: boolean
) {
  await dbToggleClientModule(clientId, moduleType, isEnabled);
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientModuleConfigAction(
  clientId: string,
  moduleType: ModuleTypeKey,
  configJson: Record<string, unknown>
) {
  await dbUpdateClientModuleConfig(clientId, moduleType, configJson);
  revalidatePath(`/clients/${clientId}`);
}

export async function triggerModuleExecutionAction(
  clientId: string,
  moduleType: ModuleTypeKey
) {
  await dbTriggerModuleExecution(clientId, moduleType);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

export async function approveAutomationEventAction(
  eventId: string,
  clientId: string
) {
  await dbApproveAutomationEvent(eventId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

// ============================================================================
// SPRINT 2 : CRUD FACTURATION, STATS VIDÉOS, KPIs WORKSPACE, ROI MENSUEL
// ============================================================================

const PAYMENT_STATUSES: PaymentStatusKey[] = ["PENDING", "PAID", "OVERDUE"];
const BILLING_TYPES: BillingTypeKey[] = ["ONE_SHOT", "RECURRING_MRR"];

function nonNegative(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

export async function updateCommercialEntryAction(
  entryId: string,
  clientId: string,
  patch: {
    productName?: string;
    offer?: OfferTypeKey;
    billingType?: BillingTypeKey;
    amountSoldHt?: number;
    paymentStatus?: PaymentStatusKey;
    notes?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const clean: typeof patch = {};
  if (patch.productName !== undefined) {
    const name = patch.productName.trim();
    if (!name) return { ok: false, error: "Nom de prestation requis" };
    clean.productName = name;
  }
  if (patch.offer !== undefined) {
    clean.offer = patch.offer;
  }
  if (patch.billingType !== undefined) {
    if (!BILLING_TYPES.includes(patch.billingType))
      return { ok: false, error: "Type de facturation invalide" };
    clean.billingType = patch.billingType;
  }
  if (patch.amountSoldHt !== undefined) {
    const amount = nonNegative(patch.amountSoldHt);
    if (amount === null) return { ok: false, error: "Montant invalide" };
    clean.amountSoldHt = amount;
  }
  if (patch.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(patch.paymentStatus))
      return { ok: false, error: "Statut invalide" };
    clean.paymentStatus = patch.paymentStatus;
  }
  if (patch.notes !== undefined) clean.notes = patch.notes;

  await dbUpdateCommercialEntry(entryId, clean);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
  return { ok: true };
}

export async function setPaymentStatusAction(
  entryId: string,
  clientId: string,
  status: PaymentStatusKey
): Promise<{ ok: boolean; error?: string }> {
  if (!PAYMENT_STATUSES.includes(status))
    return { ok: false, error: "Statut invalide" };
  await dbSetPaymentStatus(entryId, status);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePostStatsAction(
  postId: string,
  clientId: string,
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  const views = nonNegative(stats.views);
  const likes = nonNegative(stats.likes);
  const comments = nonNegative(stats.comments);
  const shares = nonNegative(stats.shares ?? 0);
  const saves = nonNegative(stats.saves ?? 0);
  if (
    views === null ||
    likes === null ||
    comments === null ||
    shares === null ||
    saves === null
  ) {
    return { ok: false, error: "Statistiques invalides" };
  }
  await dbUpdatePostStats(postId, { views, likes, comments, shares, saves });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
  return { ok: true };
}

export async function upsertClientRoiMetricAction(
  clientId: string,
  input: {
    month: string; // "YYYY-MM"
    leadsGenerated: number;
    estimatedRevenue: number;
    notes?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month))
    return { ok: false, error: "Mois invalide (attendu YYYY-MM)" };
  const leads = nonNegative(input.leadsGenerated);
  const revenue = nonNegative(input.estimatedRevenue);
  if (leads === null || revenue === null)
    return { ok: false, error: "Valeurs invalides" };

  await dbUpsertClientRoiMetric({
    clientId,
    month: new Date(`${input.month}-01T00:00:00.000Z`),
    leadsGenerated: Math.round(leads),
    estimatedRevenue: revenue,
    notes: input.notes,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard/billing");
  revalidatePath("/");
  return { ok: true };
}

export async function getWorkspaceKpisAction(
  workspace: WorkspaceFilter
): Promise<WorkspaceKpis> {
  return getWorkspaceKpis(workspace);
}

export async function triggerSocialSyncAction(
  postId?: string
): Promise<{ ok: boolean; queued: boolean; syncedCount: number }> {
  // 1. Envoi du job `sync-social-metrics` au Worker BullMQ (Redis)
  const queued = await enqueueSocialSyncJob(postId, "ui-manual");

  // 2. Si Redis n'est pas joignable (ex: dev local sans Docker), rafraîchissement direct
  const state = await loadDatabaseState();
  const targetPosts = postId
    ? state.trackedPosts.filter((p) => p.id === postId)
    : state.trackedPosts.filter((p) => p.isActiveTrack);

  if (!queued) {
    for (const post of targetPosts) {
      await dbRefreshOrUpdatePostMetrics(post.id);
    }
  }

  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/billing");
  revalidatePath("/clients");
  revalidatePath("/");

  return { ok: true, queued, syncedCount: targetPosts.length };
}
