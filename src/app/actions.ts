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
  type WorkspaceFilter,
} from "@/lib/db";
import type {
  WorkspaceSlugType,
  BillingTypeKey,
  PaymentStatusKey,
} from "@/lib/seed-data";
import type { ModuleTypeKey } from "@/modules/types";

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
  const postUrl = String(formData.get("postUrl") || "").trim();
  if (!postUrl) return;

  const workspaceSlug = (formData.get("workspaceSlug") ||
    "ALSEK") as WorkspaceSlugType;
  const customTitle =
    String(formData.get("titleOrHook") || "").trim() || undefined;

  await dbAddTrackedPostByUrl({
    clientId,
    workspaceSlug,
    postUrl,
    customTitle,
  });

  revalidatePath(`/clients/${clientId}`);
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
  revalidatePath("/");
}

export async function deleteTrackedPostAction(
  postId: string,
  clientId: string
) {
  await dbDeleteTrackedPost(postId);
  revalidatePath(`/clients/${clientId}`);
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
