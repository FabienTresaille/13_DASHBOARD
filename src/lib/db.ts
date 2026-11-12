import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import {
  createInitialSeedData,
  type PulseDatabaseState,
  type WorkspaceSlugType,
  type ClientStatusType,
  type BillingTypeKey,
  type PaymentStatusKey,
  type ClientRecord,
  type WorkspaceRecord,
  type AuditSnapshotRecord,
  type CommercialEntryRecord,
  type ClientRoiMetricRecord,
  type TrackedPostRecord,
  type PostMetricSnapshotRecord,
  type WebMetricSnapshotRecord,
  type ClientModuleRecord,
  type AutomationEventRecord,
} from "./seed-data";
import type { ModuleTypeKey } from "@/modules/types";
import { getPluginByType, ALL_PLUGINS_LIST } from "@/modules/registry";
import { SocialScraperService } from "@/services/social-scraper.service";

export type WorkspaceFilter = "ALL" | "ALSEK" | "VITRINE";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgAvailable?: boolean;
  pgCheckedAt?: number;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const LOCAL_STORE_PATH = path.join(process.cwd(), ".data", "pulse-store.json");

function readLocalStore(): PulseDatabaseState {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PulseDatabaseState;
      if (!parsed.roiMetrics) {
        parsed.roiMetrics = createInitialSeedData().roiMetrics;
        writeLocalStore(parsed);
      }
      return parsed;
    }
  } catch {
    // Re-créer en cas de fichier corrompu
  }
  const initial = createInitialSeedData();
  writeLocalStore(initial);
  return initial;
}

function writeLocalStore(state: PulseDatabaseState): void {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local store:", err);
  }
}

async function isPostgresOnline(): Promise<boolean> {
  const now = Date.now();
  if (
    typeof globalForPrisma.pgAvailable === "boolean" &&
    globalForPrisma.pgCheckedAt &&
    now - globalForPrisma.pgCheckedAt < 30_000
  ) {
    return globalForPrisma.pgAvailable;
  }

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("PG timeout")), 450)
      ),
    ]);
    globalForPrisma.pgAvailable = true;
    globalForPrisma.pgCheckedAt = now;
    return true;
  } catch {
    globalForPrisma.pgAvailable = false;
    globalForPrisma.pgCheckedAt = now;
    return false;
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

import { inferOffer, type OfferTypeKey } from "./offers";
export { inferOffer };
export type { OfferTypeKey };

/**
 * Charge l'état complet normalisé (depuis PostgreSQL si disponible, sinon depuis le store local persisté)
 */
export async function loadDatabaseState(): Promise<PulseDatabaseState> {
  if (await isPostgresOnline()) {
    try {
      const [
        workspaces,
        clients,
        clientWorkspaces,
        audits,
        commercialEntries,
        trackedPosts,
        postMetrics,
        roiMetrics,
        webMetrics,
        clientModules,
        automationEvents,
      ] = await Promise.all([
        prisma.workspace.findMany(),
        prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.clientWorkspace.findMany(),
        prisma.auditSnapshot.findMany({ orderBy: { recordedAt: "asc" } }),
        prisma.commercialEntry.findMany({ orderBy: { periodDate: "desc" } }),
        prisma.trackedPost.findMany({ orderBy: { publishedAt: "desc" } }),
        prisma.postMetricSnapshot.findMany({ orderBy: { recordedAt: "asc" } }),
        prisma.clientRoiMetric.findMany({ orderBy: { month: "desc" } }),
        prisma.webMetricSnapshot.findMany({ orderBy: { recordedAt: "asc" } }),
        prisma.clientModule.findMany(),
        prisma.automationEvent.findMany({ orderBy: { createdAt: "desc" } }),
      ]);

      if (workspaces.length > 0) {
        return {
          workspaces: workspaces.map((w) => ({
            ...w,
            createdAt: w.createdAt.toISOString(),
          })),
          clients: clients.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
          clientWorkspaces: clientWorkspaces.map((cw) => ({
            ...cw,
            joinedAt: cw.joinedAt.toISOString(),
          })),
          audits: audits.map((a) => ({
            ...a,
            recordedAt: a.recordedAt.toISOString(),
          })),
          commercialEntries: commercialEntries.map((ce) => ({
            ...ce,
            periodDate: ce.periodDate.toISOString(),
            issuedAt: ce.issuedAt.toISOString(),
            paidAt: ce.paidAt ? ce.paidAt.toISOString() : null,
          })),
          trackedPosts: trackedPosts.map((tp) => ({
            ...tp,
            publishedAt: tp.publishedAt.toISOString(),
            lastSyncedAt: tp.lastSyncedAt
              ? tp.lastSyncedAt.toISOString()
              : null,
          })),
          postMetrics: postMetrics.map((pm) => ({
            ...pm,
            recordedAt: pm.recordedAt.toISOString(),
          })),
          roiMetrics: roiMetrics.map((rm) => ({
            ...rm,
            month: rm.month.toISOString(),
            createdAt: rm.createdAt.toISOString(),
          })),
          webMetrics: webMetrics.map((wm) => ({
            ...wm,
            recordedAt: wm.recordedAt.toISOString(),
          })),
          clientModules: clientModules.map((cm) => ({
            ...cm,
            configJson: (cm.configJson as Record<string, unknown>) ?? null,
            updatedAt: cm.updatedAt.toISOString(),
          })),
          automationEvents: automationEvents.map((ae) => ({
            ...ae,
            payloadJson: (ae.payloadJson as Record<string, unknown>) ?? null,
            createdAt: ae.createdAt.toISOString(),
          })),
        };
      }
    } catch {
      // Fallback sur le store local
    }
  }

  return readLocalStore();
}

export interface EnrichedTrackedPost extends TrackedPostRecord {
  workspace: WorkspaceRecord;
  clientName: string;
  latestMetric: PostMetricSnapshotRecord;
  metricsHistory: PostMetricSnapshotRecord[];
}

export interface EnrichedCommercialEntry extends CommercialEntryRecord {
  workspace: WorkspaceRecord;
  clientName: string;
  offer: OfferTypeKey;
  issuedAt: string;
  paidAt: string | null;
  roiMultiplier: number;
}

export interface EnrichedClient360 extends ClientRecord {
  workspaces: {
    workspace: WorkspaceRecord;
    status: ClientStatusType;
    joinedAt: string;
  }[];
  isDualPortfolio: boolean;
  upsellTarget: WorkspaceSlugType | null;
  initialAuditT0: AuditSnapshotRecord | null;
  latestAudit: AuditSnapshotRecord | null;
  audits: AuditSnapshotRecord[];
  commercialEntries: EnrichedCommercialEntry[];
  roiMetrics: ClientRoiMetricRecord[];
  trackedPosts: EnrichedTrackedPost[];
  webMetrics: WebMetricSnapshotRecord[];
  latestWebMetric: WebMetricSnapshotRecord | null;
  addonModules: ClientModuleRecord[];
  automationLogs: AutomationEventRecord[];
  kpis: {
    totalSoldHt: number;
    totalPaidHt: number;
    totalPendingHt: number;
    totalOverdueHt: number;
    mrrHt: number;
    totalClientRevenue: number;
    totalLeads: number;
    roiMultiplier: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    avgEngagementRate: number;
    visibilityScoreT0: number;
    visibilityScoreCurrent: number;
    visibilityDelta: number;
  };
}

export function buildEnrichedClient(
  client: ClientRecord,
  state: PulseDatabaseState,
  workspaceFilter: WorkspaceFilter = "ALL"
): EnrichedClient360 {
  const wsMap = new Map(state.workspaces.map((w) => [w.id, w]));

  const clientWsLinks = state.clientWorkspaces
    .filter((cw) => cw.clientId === client.id)
    .map((cw) => ({
      workspace: wsMap.get(cw.workspaceId)!,
      status: cw.status,
      joinedAt: cw.joinedAt,
    }))
    .filter((item) => Boolean(item.workspace));

  const hasAlsek = clientWsLinks.some((w) => w.workspace.slug === "ALSEK");
  const hasVitrine = clientWsLinks.some((w) => w.workspace.slug === "VITRINE");
  const isDualPortfolio = hasAlsek && hasVitrine;
  const upsellTarget: WorkspaceSlugType | null = isDualPortfolio
    ? null
    : hasAlsek
      ? "VITRINE"
      : "ALSEK";

  const clientAudits = state.audits
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const initialAuditT0 =
    clientAudits.find((a) => a.isInitialT0) || clientAudits[0] || null;
  const latestAudit =
    clientAudits.filter((a) => !a.isInitialT0).slice(-1)[0] ||
    initialAuditT0 ||
    null;

  // Filtrage des ventes selon le Workspace actif (ou tout en vue Holding)
  const rawSales = state.commercialEntries.filter((ce) => {
    if (ce.clientId !== client.id) return false;
    if (workspaceFilter === "ALL") return true;
    const ws = wsMap.get(ce.workspaceId);
    return ws?.slug === workspaceFilter;
  });

  const commercialEntries: EnrichedCommercialEntry[] = rawSales
    .map((ce) => {
      const ws = wsMap.get(ce.workspaceId) || state.workspaces[0];
      const roiMultiplier =
        ce.amountSoldHt > 0
          ? Number((ce.clientRevenueGenerated / ce.amountSoldHt).toFixed(1))
          : 0;
      const offer = ce.offer || inferOffer(ws.slug, ce.amountSoldHt);
      const issuedAt = ce.issuedAt || ce.periodDate;
      const paidAt =
        ce.paidAt !== undefined
          ? ce.paidAt
          : ce.paymentStatus === "PAID"
            ? ce.periodDate
            : null;
      return {
        ...ce,
        offer,
        issuedAt,
        paidAt,
        workspace: ws,
        clientName: client.companyName,
        roiMultiplier,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.periodDate).getTime() - new Date(a.periodDate).getTime()
    );

  const roiMetrics = (state.roiMetrics || [])
    .filter((rm) => rm.clientId === client.id)
    .sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
    );

  // Filtrage des posts selon le Workspace actif
  const rawPosts = state.trackedPosts.filter((tp) => {
    if (tp.clientId !== client.id) return false;
    if (workspaceFilter === "ALL") return true;
    const ws = wsMap.get(tp.workspaceId);
    return ws?.slug === workspaceFilter;
  });

  const trackedPosts: EnrichedTrackedPost[] = rawPosts
    .map((tp) => {
      const ws = wsMap.get(tp.workspaceId) || state.workspaces[0];
      const history = state.postMetrics
        .filter((pm) => pm.postId === tp.id)
        .sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
      const latestMetric: PostMetricSnapshotRecord = history[
        history.length - 1
      ] || {
        id: "empty",
        postId: tp.id,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: 0,
        recordedAt: tp.publishedAt,
      };
      return {
        ...tp,
        lastSyncedAt: tp.lastSyncedAt || latestMetric.recordedAt,
        workspace: ws,
        clientName: client.companyName,
        latestMetric,
        metricsHistory: history,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  const webMetrics = state.webMetrics
    .filter((wm) => wm.clientId === client.id)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  const latestWebMetric = webMetrics[webMetrics.length - 1] || null;

  // S'assurer que chaque client possède les 4 modules dans son état d'affichage
  const existingModules = state.clientModules.filter(
    (cm) => cm.clientId === client.id
  );
  const addonModules: ClientModuleRecord[] = ALL_PLUGINS_LIST.map((plugin) => {
    const found = existingModules.find(
      (m) => m.moduleType === plugin.moduleType
    );
    if (found) return found;
    return {
      id: `virtual_${client.id}_${plugin.moduleType}`,
      clientId: client.id,
      moduleType: plugin.moduleType,
      isEnabled: false,
      configJson: plugin.defaultConfig,
      updatedAt: client.updatedAt,
    };
  });

  const automationLogs = state.automationEvents
    .filter((ae) => ae.clientId === client.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // Calcul des KPIs financiers & médias
  const totalSoldHt = commercialEntries.reduce(
    (sum, e) => sum + e.amountSoldHt,
    0
  );
  const totalPaidHt = commercialEntries
    .filter((e) => e.paymentStatus === "PAID")
    .reduce((sum, e) => sum + e.amountSoldHt, 0);
  const totalPendingHt = commercialEntries
    .filter((e) => e.paymentStatus === "PENDING")
    .reduce((sum, e) => sum + e.amountSoldHt, 0);
  const totalOverdueHt = commercialEntries
    .filter((e) => e.paymentStatus === "OVERDUE")
    .reduce((sum, e) => sum + e.amountSoldHt, 0);
  const mrrHt = commercialEntries
    .filter((e) => e.billingType === "RECURRING_MRR")
    .reduce((sum, e) => sum + e.amountSoldHt, 0);

  const totalClientRevenue = commercialEntries.reduce(
    (sum, e) => sum + e.clientRevenueGenerated,
    0
  );
  const totalLeads = commercialEntries.reduce(
    (sum, e) => sum + e.leadsGenerated,
    0
  );
  const roiMultiplier =
    totalSoldHt > 0
      ? Number((totalClientRevenue / totalSoldHt).toFixed(1))
      : 0;

  const totalViews = trackedPosts.reduce(
    (sum, p) => sum + p.latestMetric.views,
    0
  );
  const totalLikes = trackedPosts.reduce(
    (sum, p) => sum + p.latestMetric.likes,
    0
  );
  const totalComments = trackedPosts.reduce(
    (sum, p) => sum + p.latestMetric.comments,
    0
  );
  const avgEngagementRate =
    trackedPosts.length > 0
      ? Number(
          (
            trackedPosts.reduce(
              (sum, p) => sum + p.latestMetric.engagementRate,
              0
            ) / trackedPosts.length
          ).toFixed(2)
        )
      : 0;

  const visibilityScoreT0 = initialAuditT0?.visibilityScore ?? 0;
  const visibilityScoreCurrent = latestAudit?.visibilityScore ?? 0;
  const visibilityDelta = visibilityScoreCurrent - visibilityScoreT0;

  return {
    ...client,
    workspaces: clientWsLinks,
    isDualPortfolio,
    upsellTarget,
    initialAuditT0,
    latestAudit,
    audits: clientAudits,
    commercialEntries,
    roiMetrics,
    trackedPosts,
    webMetrics,
    latestWebMetric,
    addonModules,
    automationLogs,
    kpis: {
      totalSoldHt,
      totalPaidHt,
      totalPendingHt,
      totalOverdueHt,
      mrrHt,
      totalClientRevenue,
      totalLeads,
      roiMultiplier,
      totalViews,
      totalLikes,
      totalComments,
      avgEngagementRate,
      visibilityScoreT0,
      visibilityScoreCurrent,
      visibilityDelta,
    },
  };
}

export async function getClientsList(
  workspaceFilter: WorkspaceFilter = "ALL"
): Promise<EnrichedClient360[]> {
  const state = await loadDatabaseState();
  const enriched = state.clients.map((c) =>
    buildEnrichedClient(c, state, workspaceFilter)
  );

  if (workspaceFilter === "ALL") {
    return enriched;
  }

  return enriched.filter((c) =>
    c.workspaces.some((w) => w.workspace.slug === workspaceFilter)
  );
}

export async function getClient360ById(
  clientId: string,
  workspaceFilter: WorkspaceFilter = "ALL"
): Promise<EnrichedClient360 | null> {
  const state = await loadDatabaseState();
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return null;
  // Sur la fiche 360° d'un client, on charge toutes ses données tout en mettant en avant le filtre actif
  return buildEnrichedClient(client, state, workspaceFilter);
}

export async function getClientByShareToken(
  shareToken: string,
  brandFilter: WorkspaceFilter = "ALL"
): Promise<EnrichedClient360 | null> {
  const state = await loadDatabaseState();
  const client = state.clients.find((c) => c.shareToken === shareToken);
  if (!client) return null;
  return buildEnrichedClient(client, state, brandFilter);
}

export async function getDashboardOverview(
  workspaceFilter: WorkspaceFilter = "ALL"
) {
  const state = await loadDatabaseState();
  const clients = await getClientsList(workspaceFilter);
  const allHoldingClients = state.clients.map((c) =>
    buildEnrichedClient(c, state, "ALL")
  );

  const totalSoldHt = clients.reduce((s, c) => s + c.kpis.totalSoldHt, 0);
  const totalPaidHt = clients.reduce((s, c) => s + c.kpis.totalPaidHt, 0);
  const totalPendingHt = clients.reduce((s, c) => s + c.kpis.totalPendingHt, 0);
  const totalOverdueHt = clients.reduce((s, c) => s + c.kpis.totalOverdueHt, 0);
  const mrrHt = clients.reduce((s, c) => s + c.kpis.mrrHt, 0);
  const totalClientRevenue = clients.reduce(
    (s, c) => s + c.kpis.totalClientRevenue,
    0
  );
  const totalLeads = clients.reduce((s, c) => s + c.kpis.totalLeads, 0);
  const globalRoiMultiplier =
    totalSoldHt > 0
      ? Number((totalClientRevenue / totalSoldHt).toFixed(1))
      : 0;

  const totalViews = clients.reduce((s, c) => s + c.kpis.totalViews, 0);
  const totalLikes = clients.reduce((s, c) => s + c.kpis.totalLikes, 0);
  const totalTrackedPosts = clients.reduce(
    (s, c) => s + c.trackedPosts.length,
    0
  );

  const dualPortfolioClients = allHoldingClients.filter(
    (c) => c.isDualPortfolio
  );
  const upsellCandidates = allHoldingClients.filter((c) => !c.isDualPortfolio);

  const recentSales = clients
    .flatMap((c) => c.commercialEntries)
    .sort(
      (a, b) =>
        new Date(b.periodDate).getTime() - new Date(a.periodDate).getTime()
    )
    .slice(0, 6);

  const topPosts = clients
    .flatMap((c) => c.trackedPosts)
    .sort((a, b) => b.latestMetric.views - a.latestMetric.views)
    .slice(0, 5);

  const recentAutomations = clients
    .flatMap((c) =>
      c.automationLogs.map((log) => ({
        ...log,
        clientName: c.companyName,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  // Ventilation par Workspace pour les graphiques comparatifs
  const alsekClients = allHoldingClients.filter((c) =>
    c.workspaces.some((w) => w.workspace.slug === "ALSEK")
  );
  const vitrineClients = allHoldingClients.filter((c) =>
    c.workspaces.some((w) => w.workspace.slug === "VITRINE")
  );

  const alsekSalesHt = state.commercialEntries
    .filter((ce) => ce.workspaceId === "ws_alsek")
    .reduce((s, e) => s + e.amountSoldHt, 0);
  const vitrineSalesHt = state.commercialEntries
    .filter((ce) => ce.workspaceId === "ws_vitrine")
    .reduce((s, e) => s + e.amountSoldHt, 0);

  return {
    workspaces: state.workspaces,
    activeFilter: workspaceFilter,
    clients,
    summary: {
      activeClientsCount: clients.length,
      dualPortfolioCount: dualPortfolioClients.length,
      upsellOpportunitiesCount: upsellCandidates.length,
      totalSoldHt,
      totalPaidHt,
      totalPendingHt,
      totalOverdueHt,
      mrrHt,
      totalClientRevenue,
      totalLeads,
      globalRoiMultiplier,
      totalViews,
      totalLikes,
      totalTrackedPosts,
      alsekSalesHt,
      vitrineSalesHt,
      alsekClientsCount: alsekClients.length,
      vitrineClientsCount: vitrineClients.length,
    },
    dualPortfolioClients,
    upsellCandidates,
    recentSales,
    topPosts,
    recentAutomations,
  };
}

// ============================================================================
// MUTATIONS (Dual-Write PostgreSQL + Local Store pour résilience 100%)
// ============================================================================

export async function dbCreateClient(input: {
  companyName: string;
  sector: string;
  city?: string;
  nafCode?: string;
  employeeCount?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  avgBasketValue?: number;
  websiteUrl?: string;
  igUsername?: string;
  tiktokUsername?: string;
  gmbPlaceId?: string;
  workspaces: WorkspaceSlugType[];
}): Promise<string> {
  const state = readLocalStore();
  const id = generateId("client");
  const slugToken = input.companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const shareToken = `${slugToken}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newClient: ClientRecord = {
    id,
    companyName: input.companyName,
    sector: input.sector || "Commerce Local",
    city: input.city || "Villefranche-sur-Saône",
    nafCode: input.nafCode || null,
    employeeCount: input.employeeCount ?? null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    contactPhone: input.contactPhone || null,
    avgBasketValue: input.avgBasketValue || 40,
    shareToken,
    websiteUrl: input.websiteUrl || null,
    gmbPlaceId: input.gmbPlaceId || null,
    igUsername: input.igUsername || null,
    tiktokUsername: input.tiktokUsername || null,
    clarityProjectId: null,
    metaPixelId: null,
    ga4PropertyId: null,
    createdAt: now,
    updatedAt: now,
  };

  state.clients.unshift(newClient);

  const selectedSlugs: WorkspaceSlugType[] =
    input.workspaces.length > 0 ? input.workspaces : ["ALSEK"];

  for (const slug of selectedSlugs) {
    const ws = state.workspaces.find((w) => w.slug === slug);
    if (ws) {
      state.clientWorkspaces.push({
        id: generateId("cw"),
        clientId: id,
        workspaceId: ws.id,
        status: "ACTIVE",
        joinedAt: now,
      });
    }
  }

  // Créer un Audit T0 initial par défaut
  state.audits.push({
    id: generateId("audit"),
    clientId: id,
    isInitialT0: true,
    gmbRating: 4.0,
    gmbReviewsCount: 15,
    igFollowers: 250,
    igPostsCount: 12,
    hasWebsite: Boolean(input.websiteUrl),
    hasSsl: Boolean(input.websiteUrl?.startsWith("https")),
    hasMetaPixel: false,
    hasClarity: false,
    visibilityScore: 30,
    rawNotes: "Audit initial T0 créé à l'ouverture du compte client.",
    recordedAt: now,
  });

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.client.create({
        data: {
          id: newClient.id,
          companyName: newClient.companyName,
          sector: newClient.sector,
          city: newClient.city,
          nafCode: newClient.nafCode,
          employeeCount: newClient.employeeCount,
          contactName: newClient.contactName,
          contactEmail: newClient.contactEmail,
          contactPhone: newClient.contactPhone,
          avgBasketValue: newClient.avgBasketValue,
          shareToken: newClient.shareToken,
          websiteUrl: newClient.websiteUrl,
          gmbPlaceId: newClient.gmbPlaceId,
          igUsername: newClient.igUsername,
          tiktokUsername: newClient.tiktokUsername,
        },
      });
      for (const slug of selectedSlugs) {
        const ws = await prisma.workspace.findUnique({ where: { slug } });
        if (ws) {
          await prisma.clientWorkspace.create({
            data: {
              clientId: id,
              workspaceId: ws.id,
              status: "ACTIVE",
            },
          });
        }
      }
      await prisma.auditSnapshot.create({
        data: {
          clientId: id,
          isInitialT0: true,
          gmbRating: 4.0,
          gmbReviewsCount: 15,
          igFollowers: 250,
          igPostsCount: 12,
          hasWebsite: Boolean(input.websiteUrl),
          hasSsl: Boolean(input.websiteUrl?.startsWith("https")),
          hasMetaPixel: false,
          hasClarity: false,
          visibilityScore: 30,
          rawNotes: "Audit initial T0 créé à l'ouverture du compte client.",
        },
      });
    } catch (e) {
      console.error("PG createClient sync warning:", e);
    }
  }

  return id;
}

export async function dbToggleClientWorkspace(
  clientId: string,
  workspaceSlug: WorkspaceSlugType
): Promise<void> {
  const state = readLocalStore();
  const ws = state.workspaces.find((w) => w.slug === workspaceSlug);
  if (!ws) return;

  const existingIdx = state.clientWorkspaces.findIndex(
    (cw) => cw.clientId === clientId && cw.workspaceId === ws.id
  );

  const clientLinksCount = state.clientWorkspaces.filter(
    (cw) => cw.clientId === clientId
  ).length;

  if (existingIdx >= 0) {
    // Empêcher de retirer le dernier workspace d'un client
    if (clientLinksCount <= 1) return;
    state.clientWorkspaces.splice(existingIdx, 1);
  } else {
    state.clientWorkspaces.push({
      id: generateId("cw"),
      clientId,
      workspaceId: ws.id,
      status: "ACTIVE",
      joinedAt: new Date().toISOString(),
    });
  }

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      const dbWs = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
      });
      if (!dbWs) return;
      const existing = await prisma.clientWorkspace.findUnique({
        where: {
          clientId_workspaceId: { clientId, workspaceId: dbWs.id },
        },
      });
      if (existing) {
        const count = await prisma.clientWorkspace.count({
          where: { clientId },
        });
        if (count > 1) {
          await prisma.clientWorkspace.delete({ where: { id: existing.id } });
        }
      } else {
        await prisma.clientWorkspace.create({
          data: {
            clientId,
            workspaceId: dbWs.id,
            status: "ACTIVE",
          },
        });
      }
    } catch (e) {
      console.error("PG toggleClientWorkspace error:", e);
    }
  }
}

export async function dbUpdateClientTracking(
  clientId: string,
  data: {
    companyName?: string;
    sector?: string;
    city?: string;
    nafCode?: string;
    employeeCount?: number | null;
    avgBasketValue?: number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    websiteUrl?: string;
    gmbPlaceId?: string;
    igUsername?: string;
    tiktokUsername?: string;
    clarityProjectId?: string;
    metaPixelId?: string;
    ga4PropertyId?: string;
  }
): Promise<void> {
  const state = readLocalStore();
  const client = state.clients.find((c) => c.id === clientId);
  if (client) {
    Object.assign(client, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    writeLocalStore(state);
  }

  if (await isPostgresOnline()) {
    try {
      await prisma.client.update({
        where: { id: clientId },
        data,
      });
    } catch (e) {
      console.error("PG updateClientTracking error:", e);
    }
  }
}

export async function dbSaveAuditSnapshot(input: {
  clientId: string;
  isInitialT0: boolean;
  gmbRating: number | null;
  gmbReviewsCount: number | null;
  igFollowers: number | null;
  igPostsCount: number | null;
  hasWebsite: boolean;
  hasSsl: boolean;
  hasMetaPixel: boolean;
  hasClarity: boolean;
  visibilityScore: number;
  rawNotes: string | null;
}): Promise<void> {
  const state = readLocalStore();
  const id = generateId("audit");
  const recordedAt = new Date().toISOString();

  if (input.isInitialT0) {
    // Mettre à jour le T0 existant s'il y en a un
    const existingT0 = state.audits.find(
      (a) => a.clientId === input.clientId && a.isInitialT0
    );
    if (existingT0) {
      Object.assign(existingT0, input);
    } else {
      state.audits.unshift({ id, ...input, recordedAt });
    }
  } else {
    state.audits.push({ id, ...input, recordedAt });
  }

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.auditSnapshot.create({
        data: {
          id,
          ...input,
        },
      });
    } catch (e) {
      console.error("PG saveAuditSnapshot error:", e);
    }
  }
}

export async function dbCreateCommercialEntry(input: {
  clientId: string;
  workspaceSlug: WorkspaceSlugType;
  productName: string;
  offer?: OfferTypeKey;
  billingType: BillingTypeKey;
  amountSoldHt: number;
  paymentStatus: PaymentStatusKey;
  clientRevenueGenerated: number;
  leadsGenerated: number;
  notes?: string;
}): Promise<void> {
  const state = readLocalStore();
  const ws =
    state.workspaces.find((w) => w.slug === input.workspaceSlug) ||
    state.workspaces[0];
  const id = generateId("sale");
  const periodDate = new Date().toISOString();
  const offer =
    input.offer || inferOffer(input.workspaceSlug, input.amountSoldHt);

  state.commercialEntries.unshift({
    id,
    clientId: input.clientId,
    workspaceId: ws.id,
    productName: input.productName,
    offer,
    billingType: input.billingType,
    amountSoldHt: input.amountSoldHt,
    paymentStatus: input.paymentStatus,
    clientRevenueGenerated: input.clientRevenueGenerated,
    leadsGenerated: input.leadsGenerated,
    periodDate,
    issuedAt: periodDate,
    paidAt: input.paymentStatus === "PAID" ? periodDate : null,
    notes: input.notes || null,
  });

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      const dbWs = await prisma.workspace.findUnique({
        where: { slug: input.workspaceSlug },
      });
      if (dbWs) {
        await prisma.commercialEntry.create({
          data: {
            id,
            clientId: input.clientId,
            workspaceId: dbWs.id,
            productName: input.productName,
            billingType: input.billingType,
            amountSoldHt: input.amountSoldHt,
            paymentStatus: input.paymentStatus,
            clientRevenueGenerated: input.clientRevenueGenerated,
            leadsGenerated: input.leadsGenerated,
            notes: input.notes || null,
            offer,
            paidAt: input.paymentStatus === "PAID" ? new Date() : null,
          },
        });
      }
    } catch (e) {
      console.error("PG createCommercialEntry error:", e);
    }
  }
}

export async function dbCyclePaymentStatus(entryId: string): Promise<void> {
  const cycleOrder: PaymentStatusKey[] = ["PENDING", "PAID", "OVERDUE"];
  const state = readLocalStore();
  const entry = state.commercialEntries.find((e) => e.id === entryId);
  let nextStatus: PaymentStatusKey = "PAID";

  if (entry) {
    const currentIndex = cycleOrder.indexOf(entry.paymentStatus);
    nextStatus = cycleOrder[(currentIndex + 1) % cycleOrder.length];
    entry.paymentStatus = nextStatus;
    writeLocalStore(state);
  }

  if (await isPostgresOnline()) {
    try {
      await prisma.commercialEntry.update({
        where: { id: entryId },
        data: {
          paymentStatus: nextStatus,
          paidAt: nextStatus === "PAID" ? new Date() : null,
        },
      });
    } catch (e) {
      console.error("PG cyclePaymentStatus error:", e);
    }
  }
}

export async function dbUpdateCommercialRoi(
  entryId: string,
  clientRevenueGenerated: number,
  leadsGenerated: number
): Promise<void> {
  const state = readLocalStore();
  const entry = state.commercialEntries.find((e) => e.id === entryId);
  if (entry) {
    entry.clientRevenueGenerated = clientRevenueGenerated;
    entry.leadsGenerated = leadsGenerated;
    writeLocalStore(state);
  }

  if (await isPostgresOnline()) {
    try {
      await prisma.commercialEntry.update({
        where: { id: entryId },
        data: { clientRevenueGenerated, leadsGenerated },
      });
    } catch (e) {
      console.error("PG updateCommercialRoi error:", e);
    }
  }
}

export async function dbDeleteCommercialEntry(entryId: string): Promise<void> {
  const state = readLocalStore();
  state.commercialEntries = state.commercialEntries.filter(
    (e) => e.id !== entryId
  );
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.commercialEntry.delete({ where: { id: entryId } });
    } catch (e) {
      console.error("PG deleteCommercialEntry error:", e);
    }
  }
}

export async function dbAddTrackedPostByUrl(input: {
  clientId: string;
  workspaceSlug: WorkspaceSlugType;
  postUrl: string;
  customTitle?: string;
  initialStats?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
  };
}): Promise<string> {
  const state = readLocalStore();
  const ws =
    state.workspaces.find((w) => w.slug === input.workspaceSlug) ||
    state.workspaces[0];

  // URL normalisée (Instagram /reels/ -> /reel/, sans ?igsh=...)
  const postUrl = SocialScraperService.normalizePostUrl(input.postUrl);
  const platform = SocialScraperService.detectPlatform(postUrl);

  // ZÉRO fausse donnée : compteurs à 0 sauf saisie manuelle explicite.
  const stat = (v?: number) =>
    Number.isFinite(v) && (v as number) > 0 ? Math.round(v as number) : 0;
  const initial = {
    views: stat(input.initialStats?.views),
    likes: stat(input.initialStats?.likes),
    comments: stat(input.initialStats?.comments),
    shares: stat(input.initialStats?.shares),
    saves: stat(input.initialStats?.saves),
  };
  const scraped = {
    platform,
    titleOrHook:
      input.customTitle ||
      SocialScraperService.extractCleanHookFromUrl(postUrl, platform),
    thumbnailUrl: null as string | null,
    ...initial,
    engagementRate: SocialScraperService.computeEngagementRate(initial),
  };

  const postId = generateId("post");
  const nowIso = new Date().toISOString();

  const newPost: TrackedPostRecord = {
    id: postId,
    clientId: input.clientId,
    workspaceId: ws.id,
    platform: scraped.platform,
    postUrl,
    titleOrHook: scraped.titleOrHook,
    thumbnailUrl: scraped.thumbnailUrl,
    publishedAt: nowIso,
    isActiveTrack: true,
    lastSyncedAt: null,
  };

  const snapshots: PostMetricSnapshotRecord[] = [
    {
      id: generateId("pm"),
      postId,
      ...initial,
      engagementRate: scraped.engagementRate,
      recordedAt: nowIso,
    },
  ];

  state.trackedPosts.unshift(newPost);
  state.postMetrics.push(...snapshots);
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      const dbWs = await prisma.workspace.findUnique({
        where: { slug: input.workspaceSlug },
      });
      if (dbWs) {
        await prisma.trackedPost.create({
          data: {
            id: postId,
            clientId: input.clientId,
            workspaceId: dbWs.id,
            platform: scraped.platform,
            postUrl,
            titleOrHook: scraped.titleOrHook,
            thumbnailUrl: scraped.thumbnailUrl,
            isActiveTrack: true,
            views: scraped.views,
            likes: scraped.likes,
            comments: scraped.comments,
            shares: scraped.shares,
            saves: scraped.saves,
            lastSyncedAt: null,
          },
        });
        for (const snap of snapshots) {
          await prisma.postMetricSnapshot.create({
            data: {
              id: snap.id,
              postId,
              views: snap.views,
              likes: snap.likes,
              comments: snap.comments,
              shares: snap.shares,
              saves: snap.saves,
              engagementRate: snap.engagementRate,
              recordedAt: new Date(snap.recordedAt),
            },
          });
        }
      }
    } catch (e) {
      console.error("PG addTrackedPostByUrl error:", e);
    }
  }

  return postId;
}

export async function dbRefreshOrUpdatePostMetrics(
  postId: string,
  manualOverride?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }
): Promise<void> {
  const state = readLocalStore();
  const post = state.trackedPosts.find((p) => p.id === postId);
  if (!post) return;

  const history = state.postMetrics
    .filter((pm) => pm.postId === postId)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  const lastMetric = history[history.length - 1];

  let nextMetrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
  };
  let nextThumbnailUrl: string | null | undefined;
  let nextTitle: string | undefined;

  if (manualOverride) {
    nextMetrics = {
      ...manualOverride,
      engagementRate:
        SocialScraperService.computeEngagementRate(manualOverride),
    };
  } else {
    const normalizedUrl = SocialScraperService.normalizePostUrl(post.postUrl);
    post.postUrl = normalizedUrl;
    const scraped = await SocialScraperService.fetchPostMetrics(normalizedUrl, {
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
    nextMetrics = {
      views: scraped.views,
      likes: scraped.likes,
      comments: scraped.comments,
      shares: scraped.shares,
      saves: scraped.saves,
      engagementRate: scraped.engagementRate,
    };
    if (scraped.thumbnailUrl) {
      nextThumbnailUrl = scraped.thumbnailUrl;
      post.thumbnailUrl = scraped.thumbnailUrl;
    }
    if (scraped.titleOrHook && !post.titleOrHook) {
      nextTitle = scraped.titleOrHook;
      post.titleOrHook = scraped.titleOrHook;
    }
  }

  const nowIso = new Date().toISOString();
  post.lastSyncedAt = nowIso;

  const newSnapshot: PostMetricSnapshotRecord = {
    id: generateId("pm"),
    postId,
    ...nextMetrics,
    recordedAt: nowIso,
  };

  state.postMetrics.push(newSnapshot);
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.postMetricSnapshot.create({
        data: {
          id: newSnapshot.id,
          postId,
          views: newSnapshot.views,
          likes: newSnapshot.likes,
          comments: newSnapshot.comments,
          shares: newSnapshot.shares,
          saves: newSnapshot.saves,
          engagementRate: newSnapshot.engagementRate,
          recordedAt: new Date(newSnapshot.recordedAt),
        },
      });
      await prisma.trackedPost.update({
        where: { id: postId },
        data: {
          postUrl: post.postUrl,
          views: newSnapshot.views,
          likes: newSnapshot.likes,
          comments: newSnapshot.comments,
          shares: newSnapshot.shares,
          saves: newSnapshot.saves,
          ...(nextThumbnailUrl ? { thumbnailUrl: nextThumbnailUrl } : {}),
          ...(nextTitle ? { titleOrHook: nextTitle } : {}),
          lastSyncedAt: new Date(nowIso),
        },
      });
    } catch (e) {
      console.error("PG refreshOrUpdatePostMetrics error:", e);
    }
  }
}

export async function dbDeleteTrackedPost(postId: string): Promise<void> {
  const state = readLocalStore();
  state.trackedPosts = state.trackedPosts.filter((p) => p.id !== postId);
  state.postMetrics = state.postMetrics.filter((pm) => pm.postId !== postId);
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.trackedPost.delete({ where: { id: postId } });
    } catch (e) {
      console.error("PG deleteTrackedPost error:", e);
    }
  }
}

export async function dbAddWebMetricSnapshot(input: {
  clientId: string;
  sessionsCount: number;
  uniqueVisitors: number;
  clarityRageClicks: number;
  clarityDeadClicks: number;
  pixelPageViews: number;
  pixelLeadsOrCalls: number;
}): Promise<void> {
  const state = readLocalStore();
  const id = generateId("wm");
  const recordedAt = new Date().toISOString();

  state.webMetrics.push({
    id,
    ...input,
    recordedAt,
  });
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.webMetricSnapshot.create({
        data: {
          id,
          ...input,
        },
      });
    } catch (e) {
      console.error("PG addWebMetricSnapshot error:", e);
    }
  }
}

export async function dbToggleClientModule(
  clientId: string,
  moduleType: ModuleTypeKey,
  isEnabled: boolean
): Promise<void> {
  const state = readLocalStore();
  const plugin = getPluginByType(moduleType);
  const existing = state.clientModules.find(
    (m) => m.clientId === clientId && m.moduleType === moduleType
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.isEnabled = isEnabled;
    existing.updatedAt = now;
  } else {
    state.clientModules.push({
      id: generateId("cm"),
      clientId,
      moduleType,
      isEnabled,
      configJson: plugin.defaultConfig,
      updatedAt: now,
    });
  }

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.clientModule.upsert({
        where: {
          clientId_moduleType: { clientId, moduleType },
        },
        update: { isEnabled },
        create: {
          clientId,
          moduleType,
          isEnabled,
          configJson: plugin.defaultConfig as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      console.error("PG toggleClientModule error:", e);
    }
  }
}

export async function dbUpdateClientModuleConfig(
  clientId: string,
  moduleType: ModuleTypeKey,
  configJson: Record<string, unknown>
): Promise<void> {
  const state = readLocalStore();
  const existing = state.clientModules.find(
    (m) => m.clientId === clientId && m.moduleType === moduleType
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.configJson = configJson;
    existing.updatedAt = now;
  } else {
    state.clientModules.push({
      id: generateId("cm"),
      clientId,
      moduleType,
      isEnabled: true,
      configJson,
      updatedAt: now,
    });
  }

  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.clientModule.upsert({
        where: {
          clientId_moduleType: { clientId, moduleType },
        },
        update: {
          configJson: configJson as Prisma.InputJsonValue,
        },
        create: {
          clientId,
          moduleType,
          isEnabled: true,
          configJson: configJson as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      console.error("PG updateClientModuleConfig error:", e);
    }
  }
}

export async function dbTriggerModuleExecution(
  clientId: string,
  moduleType: ModuleTypeKey
): Promise<void> {
  const state = readLocalStore();
  const client = state.clients.find((c) => c.id === clientId);
  if (!client) return;

  const plugin = getPluginByType(moduleType);
  const modConfig =
    state.clientModules.find(
      (m) => m.clientId === clientId && m.moduleType === moduleType
    )?.configJson || plugin.defaultConfig;

  const result = await plugin.execute({
    clientId: client.id,
    companyName: client.companyName,
    sector: client.sector,
    city: client.city,
    nafCode: client.nafCode,
    employeeCount: client.employeeCount,
    gmbPlaceId: client.gmbPlaceId,
    clarityProjectId: client.clarityProjectId,
    config: modConfig,
  });

  const eventId = generateId("evt");
  const newEvent: AutomationEventRecord = {
    id: eventId,
    clientId,
    moduleType,
    title: result.title,
    payloadJson: result.payloadJson,
    status: result.status,
    createdAt: new Date().toISOString(),
  };

  state.automationEvents.unshift(newEvent);
  writeLocalStore(state);

  if (await isPostgresOnline()) {
    try {
      await prisma.automationEvent.create({
        data: {
          id: eventId,
          clientId,
          moduleType,
          title: result.title,
          status: result.status,
          payloadJson: result.payloadJson as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      console.error("PG triggerModuleExecution error:", e);
    }
  }
}

export async function dbApproveAutomationEvent(eventId: string): Promise<void> {
  const state = readLocalStore();
  const evt = state.automationEvents.find((e) => e.id === eventId);
  if (evt) {
    evt.status = "SUCCESS";
    writeLocalStore(state);
  }

  if (await isPostgresOnline()) {
    try {
      await prisma.automationEvent.update({
        where: { id: eventId },
        data: { status: "SUCCESS" },
      });
    } catch (e) {
      console.error("PG approveAutomationEvent error:", e);
    }
  }
}

// ============================================================================
// SPRINT 2 : CRUD FACTURATION, STATS POSTS, KPIs WORKSPACE, ROI MENSUEL
// ============================================================================

export async function dbUpdateCommercialEntry(
  entryId: string,
  patch: {
    productName?: string;
    offer?: OfferTypeKey;
    billingType?: BillingTypeKey;
    amountSoldHt?: number;
    paymentStatus?: PaymentStatusKey;
    notes?: string | null;
  }
): Promise<void> {
  const state = readLocalStore();
  const entry = state.commercialEntries.find((e) => e.id === entryId);
  if (entry) {
    Object.assign(entry, patch);
    if (patch.paymentStatus) {
      entry.paidAt =
        patch.paymentStatus === "PAID"
          ? entry.paidAt || new Date().toISOString()
          : null;
    }
    writeLocalStore(state);
  }

  if (await isPostgresOnline()) {
    try {
      const current = await prisma.commercialEntry.findUnique({
        where: { id: entryId },
        include: { workspace: true },
      });
      if (!current) return;
      const amount = patch.amountSoldHt ?? current.amountSoldHt;
      await prisma.commercialEntry.update({
        where: { id: entryId },
        data: {
          ...patch,
          offer:
            patch.offer || inferOffer(current.workspace.slug, amount),
          ...(patch.paymentStatus
            ? {
                paidAt:
                  patch.paymentStatus === "PAID"
                    ? (current.paidAt ?? new Date())
                    : null,
              }
            : {}),
        },
      });
    } catch (e) {
      console.error("PG updateCommercialEntry error:", e);
    }
  }
}

export async function dbSetPaymentStatus(
  entryId: string,
  status: PaymentStatusKey
): Promise<void> {
  await dbUpdateCommercialEntry(entryId, { paymentStatus: status });
}

export async function dbUpdatePostStats(
  postId: string,
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
  }
): Promise<void> {
  await dbRefreshOrUpdatePostMetrics(postId, {
    views: stats.views,
    likes: stats.likes,
    comments: stats.comments,
    shares: stats.shares ?? 0,
    saves: stats.saves ?? 0,
  });
}

export async function dbUpsertClientRoiMetric(input: {
  clientId: string;
  month: Date;
  leadsGenerated: number;
  estimatedRevenue: number;
  notes?: string;
}): Promise<void> {
  const month = new Date(
    Date.UTC(input.month.getUTCFullYear(), input.month.getUTCMonth(), 1)
  );
  const monthIso = month.toISOString();

  // Persistance dans le store local de secours
  const state = readLocalStore();
  if (!state.roiMetrics) state.roiMetrics = [];
  const existingIdx = state.roiMetrics.findIndex(
    (rm) => rm.clientId === input.clientId && rm.month.slice(0, 7) === monthIso.slice(0, 7)
  );
  if (existingIdx >= 0) {
    state.roiMetrics[existingIdx] = {
      ...state.roiMetrics[existingIdx],
      leadsGenerated: input.leadsGenerated,
      estimatedRevenue: input.estimatedRevenue,
      notes: input.notes ?? null,
    };
  } else {
    state.roiMetrics.unshift({
      id: generateId("roi"),
      clientId: input.clientId,
      month: monthIso,
      leadsGenerated: input.leadsGenerated,
      estimatedRevenue: input.estimatedRevenue,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    });
  }
  writeLocalStore(state);

  if (!(await isPostgresOnline())) return;
  try {
    await prisma.clientRoiMetric.upsert({
      where: { clientId_month: { clientId: input.clientId, month } },
      update: {
        leadsGenerated: input.leadsGenerated,
        estimatedRevenue: input.estimatedRevenue,
        notes: input.notes ?? null,
      },
      create: {
        clientId: input.clientId,
        month,
        leadsGenerated: input.leadsGenerated,
        estimatedRevenue: input.estimatedRevenue,
        notes: input.notes ?? null,
      },
    });
  } catch (e) {
    console.error("PG upsertClientRoiMetric error:", e);
  }
}

export interface WorkspaceKpis {
  workspace: WorkspaceFilter;
  /** CA facturé HT sur le mois courant (toutes factures émises) */
  monthRevenueHt: number;
  /** Part du CA du mois effectivement encaissée */
  monthPaidHt: number;
  /** MRR : somme des abonnements récurrents actifs (hors retard) */
  mrrHt: number;
  /** En attente d'encaissement (PENDING + OVERDUE) */
  pendingRevenueHt: number;
  /** Vidéos publiées durant le mois courant */
  videosPublishedThisMonth: number;
  /** Total des vues (dernier relevé de chaque vidéo) générées pour les clients */
  totalViews: number;
}

export async function getWorkspaceKpis(
  workspaceFilter: WorkspaceFilter = "ALL",
  now: Date = new Date()
): Promise<WorkspaceKpis> {
  const state = await loadDatabaseState();
  const wsById = new Map(state.workspaces.map((w) => [w.id, w]));
  const inScope = (workspaceId: string) =>
    workspaceFilter === "ALL" ||
    wsById.get(workspaceId)?.slug === workspaceFilter;

  const y = now.getFullYear();
  const m = now.getMonth();
  const isThisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === y && d.getMonth() === m;
  };

  const sales = state.commercialEntries.filter((e) => inScope(e.workspaceId));
  const monthSales = sales.filter((e) => isThisMonth(e.periodDate));

  const monthRevenueHt = monthSales.reduce((s, e) => s + e.amountSoldHt, 0);
  const monthPaidHt = monthSales
    .filter((e) => e.paymentStatus === "PAID")
    .reduce((s, e) => s + e.amountSoldHt, 0);
  const mrrHt = sales
    .filter((e) => e.billingType === "RECURRING_MRR")
    .reduce((s, e) => s + e.amountSoldHt, 0);
  const pendingRevenueHt = sales
    .filter(
      (e) => e.paymentStatus === "PENDING" || e.paymentStatus === "OVERDUE"
    )
    .reduce((s, e) => s + e.amountSoldHt, 0);

  const posts = state.trackedPosts.filter((p) => inScope(p.workspaceId));
  const videosPublishedThisMonth = posts.filter((p) =>
    isThisMonth(p.publishedAt)
  ).length;

  const latestViewsByPost = new Map<string, { at: number; views: number }>();
  for (const snap of state.postMetrics) {
    const at = new Date(snap.recordedAt).getTime();
    const prev = latestViewsByPost.get(snap.postId);
    if (!prev || at > prev.at) {
      latestViewsByPost.set(snap.postId, { at, views: snap.views });
    }
  }
  const totalViews = posts.reduce(
    (s, p) => s + (latestViewsByPost.get(p.id)?.views ?? 0),
    0
  );

  return {
    workspace: workspaceFilter,
    monthRevenueHt,
    monthPaidHt,
    mrrHt,
    pendingRevenueHt,
    videosPublishedThisMonth,
    totalViews,
  };
}
