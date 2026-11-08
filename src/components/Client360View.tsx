"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  Euro,
  Film,
  Globe,
  Cpu,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Play,
  Settings,
  Zap,
  X,
  Eye,
} from "lucide-react";
import type { EnrichedClient360, EnrichedTrackedPost } from "@/lib/db";
import type {
  BillingTypeKey,
  PaymentStatusKey,
  WorkspaceSlugType,
} from "@/lib/seed-data";
import { ALL_PLUGINS_LIST } from "@/modules/registry";
import type { AutomationPlugin, ModuleTypeKey } from "@/modules/types";
import {
  toggleClientWorkspaceAction,
  updateClientTrackingAction,
  saveAuditSnapshotAction,
  addCommercialEntryAction,
  cyclePaymentStatusAction,
  updateCommercialRoiAction,
  deleteCommercialEntryAction,
  addTrackedPostAction,
  refreshPostMetricsAction,
  deleteTrackedPostAction,
  addWebMetricSnapshotAction,
  toggleClientModuleAction,
  updateClientModuleConfigAction,
  triggerModuleExecutionAction,
  approveAutomationEventAction,
} from "@/app/actions";

interface Client360ViewProps {
  client: EnrichedClient360;
}

type TabKey = "audit" | "commercial" | "content" | "web" | "modules";

function formatEur(val: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatNum(val: number): string {
  return new Intl.NumberFormat("fr-FR").format(val);
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function getInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["le", "la", "les", "de", "du", "des"].includes(w.toLowerCase()));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const NEXT_STATUS_CYCLE: Record<PaymentStatusKey, PaymentStatusKey> = {
  PENDING: "PAID",
  PAID: "OVERDUE",
  OVERDUE: "PENDING",
};

interface QuickSalePreset {
  label: string;
  workspace: WorkspaceSlugType;
  productName: string;
  amountHt: number;
  billingType: BillingTypeKey;
  estimatedLeads: number;
}

const QUICK_SALE_PRESETS: QuickSalePreset[] = [
  // Vitrine Caladoise
  {
    label: "Pack Reel Découverte - 160€",
    workspace: "VITRINE",
    productName: "Pack Reel Découverte",
    amountHt: 160,
    billingType: "ONE_SHOT",
    estimatedLeads: 25,
  },
  {
    label: "Mise en avant Média - 250€",
    workspace: "VITRINE",
    productName: "Mise en avant Média Vitrine Caladoise",
    amountHt: 250,
    billingType: "ONE_SHOT",
    estimatedLeads: 40,
  },
  // Alsek Marketing
  {
    label: "Pack Visibilité - 300€/mois",
    workspace: "ALSEK",
    productName: "Pack Visibilité Mensuel",
    amountHt: 300,
    billingType: "RECURRING_MRR",
    estimatedLeads: 55,
  },
  {
    label: "Accompagnement Complet - 500€/mois",
    workspace: "ALSEK",
    productName: "Accompagnement Complet Reels & Ads",
    amountHt: 500,
    billingType: "RECURRING_MRR",
    estimatedLeads: 95,
  },
  {
    label: "Création Site Web - 1500€",
    workspace: "ALSEK",
    productName: "Création Site Web & Tunnel Conversion",
    amountHt: 1500,
    billingType: "ONE_SHOT",
    estimatedLeads: 140,
  },
];

export function Client360View({ client }: Client360ViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab") as TabKey | null;

  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTabParam &&
      ["audit", "commercial", "content", "web", "modules"].includes(
        initialTabParam
      )
      ? initialTabParam
      : "commercial"
  );
  const [isPending, startTransition] = useTransition();
  const [copiedBrand, setCopiedBrand] = useState<"alsek" | "vitrine" | null>(
    null
  );

  // State Onglet 2 (Saisie Commerciale Zéro Friction + Optimistic UI)
  const defaultWsSlug: WorkspaceSlugType =
    client.workspaces[0]?.workspace.slug || "ALSEK";
  const [saleWorkspace, setSaleWorkspace] =
    useState<WorkspaceSlugType>(defaultWsSlug);
  const [saleProduct, setSaleProduct] = useState<string>("");
  const [saleBillingType, setSaleBillingType] =
    useState<BillingTypeKey>("ONE_SHOT");
  const [saleAmount, setSaleAmount] = useState<number>(300);
  const [saleLeads, setSaleLeads] = useState<number>(45);
  const [saleRevenue, setSaleRevenue] = useState<number>(
    Math.round(45 * client.avgBasketValue)
  );
  const [saleStatus, setSaleStatus] = useState<PaymentStatusKey>("PAID");

  const [optimisticPaymentStatus, setOptimisticPaymentStatus] = useState<
    Record<string, PaymentStatusKey>
  >({});
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editRevenueVal, setEditRevenueVal] = useState<number>(0);
  const [editLeadsVal, setEditLeadsVal] = useState<number>(0);

  // State Onglet 3 (Content Tracker)
  const [selectedPostForChart, setSelectedPostForChart] = useState<string>(
    client.trackedPosts[0]?.id || "ALL"
  );
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [manualViews, setManualViews] = useState<number>(0);
  const [manualLikes, setManualLikes] = useState<number>(0);
  const [manualComments, setManualComments] = useState<number>(0);
  const [manualShares, setManualShares] = useState<number>(0);
  const [manualSaves, setManualSaves] = useState<number>(0);

  // State Onglet 5 (Modules IA & Modale de configuration rapide)
  const [optimisticModuleEnabled, setOptimisticModuleEnabled] = useState<
    Record<string, boolean>
  >({});
  const [modalPlugin, setModalPlugin] = useState<AutomationPlugin | null>(null);
  const [moduleConfigDraft, setModuleConfigDraft] = useState<
    Record<string, unknown>
  >({});
  const [competitorInput, setCompetitorInput] = useState<string>("");

  const copyPortalUrl = (brand: "alsek" | "vitrine") => {
    const canonicalUrl =
      brand === "alsek"
        ? `https://app.alsek.fr/p/${client.shareToken}`
        : `https://pro.vitrine-caladoise.fr/p/${client.shareToken}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(canonicalUrl);
    }
    setCopiedBrand(brand);
    setTimeout(() => setCopiedBrand(null), 2400);
  };

  const handleToggleWorkspace = (slug: WorkspaceSlugType) => {
    startTransition(async () => {
      await toggleClientWorkspaceAction(client.id, slug);
      router.refresh();
    });
  };

  // Remplissage 1-clic Quick-Preset
  const applyPreset = (preset: QuickSalePreset) => {
    setSaleWorkspace(preset.workspace);
    setSaleProduct(preset.productName);
    setSaleAmount(preset.amountHt);
    setSaleBillingType(preset.billingType);
    setSaleLeads(preset.estimatedLeads);
    setSaleRevenue(Math.round(preset.estimatedLeads * client.avgBasketValue));
  };

  const handleLeadsChange = (newLeads: number) => {
    setSaleLeads(newLeads);
    setSaleRevenue(Math.round(newLeads * client.avgBasketValue));
  };

  const handleQuickSaleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("workspaceSlug", saleWorkspace);
    formData.set("productName", saleProduct);
    formData.set("billingType", saleBillingType);
    formData.set("amountSoldHt", String(saleAmount));
    formData.set("paymentStatus", saleStatus);
    formData.set("leadsGenerated", String(saleLeads));
    formData.set("clientRevenueGenerated", String(saleRevenue));

    startTransition(async () => {
      await addCommercialEntryAction(client.id, formData);
      setSaleProduct("");
      router.refresh();
    });
  };

  const handleOptimisticCyclePayment = (
    entryId: string,
    currentStatus: PaymentStatusKey
  ) => {
    const next = NEXT_STATUS_CYCLE[currentStatus];
    setOptimisticPaymentStatus((prev) => ({ ...prev, [entryId]: next }));
    startTransition(async () => {
      await cyclePaymentStatusAction(entryId, client.id);
      router.refresh();
    });
  };

  // Handlers Onglet 3
  const handleAddPostSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      await addTrackedPostAction(client.id, formData);
      form.reset();
      router.refresh();
    });
  };

  const openManualEditPost = (post: EnrichedTrackedPost) => {
    setEditingPostId(post.id);
    setManualViews(post.latestMetric.views);
    setManualLikes(post.latestMetric.likes);
    setManualComments(post.latestMetric.comments);
    setManualShares(post.latestMetric.shares);
    setManualSaves(post.latestMetric.saves);
  };

  const saveManualPostMetrics = (postId: string) => {
    startTransition(async () => {
      await refreshPostMetricsAction(postId, client.id, {
        views: manualViews,
        likes: manualLikes,
        comments: manualComments,
        shares: manualShares,
        saves: manualSaves,
      });
      setEditingPostId(null);
      router.refresh();
    });
  };

  // Handlers Onglet 5 (Modale & Toggle Optimistic)
  const handleToggleModuleOptimistic = (
    moduleType: ModuleTypeKey,
    currentEnabled: boolean
  ) => {
    const nextVal = !currentEnabled;
    setOptimisticModuleEnabled((prev) => ({ ...prev, [moduleType]: nextVal }));
    startTransition(async () => {
      await toggleClientModuleAction(client.id, moduleType, nextVal);
      router.refresh();
    });
  };

  const openPluginModal = (
    plugin: AutomationPlugin,
    currentConfig: Record<string, unknown>
  ) => {
    setModalPlugin(plugin);
    setModuleConfigDraft({ ...plugin.defaultConfig, ...currentConfig });
    setCompetitorInput("");
  };

  const previewRoiMultiplier =
    saleAmount > 0 ? (saleRevenue / saleAmount).toFixed(1) : "0.0";

  // Calculs pour la Jauge de Rentabilité Client
  const totalBudgetHt = Math.max(client.kpis.totalSoldHt, 1);
  const totalGeneratedRev = client.kpis.totalClientRevenue;
  const maxGaugeVal = Math.max(totalBudgetHt, totalGeneratedRev, 1000);
  const budgetBarPct = Math.max(
    8,
    Math.round((client.kpis.totalSoldHt / maxGaugeVal) * 100)
  );
  const generatedBarPct = Math.max(
    18,
    Math.round((totalGeneratedRev / maxGaugeVal) * 100)
  );

  const tabs: {
    id: TabKey;
    label: string;
    shortLabel: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "audit",
      label: "1. Audit Flash (T0 & Évolution)",
      shortLabel: "1. Audit T0",
      badge: `${client.kpis.visibilityScoreCurrent}/100`,
      icon: ShieldCheck,
    },
    {
      id: "commercial",
      label: "2. Suivi Commercial & ROI",
      shortLabel: "2. Commercial & ROI",
      badge: `x${client.kpis.roiMultiplier}`,
      icon: Euro,
    },
    {
      id: "content",
      label: "3. Content Tracker par Lien",
      shortLabel: "3. Vidéos",
      badge: `${client.trackedPosts.length}`,
      icon: Film,
    },
    {
      id: "web",
      label: "4. Web, Clarity & Pixel",
      shortLabel: "4. Web & Pixel",
      badge: client.latestWebMetric
        ? `${client.latestWebMetric.pixelLeadsOrCalls}`
        : undefined,
      icon: Globe,
    },
    {
      id: "modules",
      label: "5. Modules IA & Automatisations",
      shortLabel: "5. Modules IA",
      badge: `${client.addonModules.filter((m) => m.isEnabled).length}/4`,
      icon: Cpu,
    },
  ];

  const t0 = client.initialAuditT0;
  const currentAudit = client.latestAudit;
  const activePostForChart =
    client.trackedPosts.find((p) => p.id === selectedPostForChart) ||
    client.trackedPosts[0];

  const defaultPreviewBrand = client.workspaces.some(
    (w) => w.workspace.slug === "VITRINE"
  ) && !client.workspaces.some((w) => w.workspace.slug === "ALSEK")
    ? "vitrine"
    : "alsek";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Portefeuille Clients
        </Link>
      </div>

      {/* =====================================================================
          HEADER EXÉCUTIF 360° (Avatar/Initiales, Portefeuilles, Score T0 & Actions Portail)
      ===================================================================== */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          {/* Identité + Avatar Initiales */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 text-lg sm:text-xl font-black text-white shadow-lg ring-4 ring-white/10">
              {getInitials(client.companyName)}
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                  {client.companyName}
                </h1>
                {/* Badges des portefeuilles actifs + toggle upsell */}
                {(["ALSEK", "VITRINE"] as WorkspaceSlugType[]).map((slug) => {
                  const isAttached = client.workspaces.some(
                    (w) => w.workspace.slug === slug
                  );
                  const isAlsek = slug === "ALSEK";
                  return (
                    <button
                      key={slug}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleWorkspace(slug)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold transition cursor-pointer ${
                        isAttached
                          ? isAlsek
                            ? "border-blue-500/50 bg-blue-600/20 text-cyan-300"
                            : "border-amber-500/50 bg-amber-500/20 text-amber-300"
                          : "border-dashed border-slate-700 bg-slate-900/40 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isAttached
                            ? isAlsek
                              ? "bg-cyan-400"
                              : "bg-amber-400"
                            : "bg-slate-600"
                        }`}
                      />
                      {isAlsek ? "Alsek" : "Vitrine"}
                      {!isAttached && " (+)"}
                    </button>
                  );
                })}

                {/* Badge Score d'Audit T0 -> Actuel */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-3 py-1 text-[11px] font-extrabold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Audit T₀ : {client.kpis.visibilityScoreT0}/100 ➔{" "}
                  {client.kpis.visibilityScoreCurrent}/100 (+
                  {client.kpis.visibilityDelta})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  {client.sector}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {client.city}
                </span>
                <span>•</span>
                <span>
                  Panier Moyen :{" "}
                  <strong className="text-white">
                    {client.avgBasketValue} €
                  </strong>
                </span>
                {client.nafCode && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-300">
                      NAF {client.nafCode}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Groupe des 3 Boutons d'Action Portail Public */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => copyPortalUrl("alsek")}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 hover:bg-blue-600/25 px-3.5 py-2.5 text-xs font-bold text-cyan-200 transition cursor-pointer"
              title={`https://app.alsek.fr/p/${client.shareToken}`}
            >
              {copiedBrand === "alsek" ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">Lien copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copier le lien Portail Alsek</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => copyPortalUrl("vitrine")}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-2.5 text-xs font-bold text-amber-200 transition cursor-pointer"
              title={`https://pro.vitrine-caladoise.fr/p/${client.shareToken}`}
            >
              {copiedBrand === "vitrine" ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">Lien copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-amber-400" />
                  <span>Copier le lien Portail Vitrine</span>
                </>
              )}
            </button>

            <Link
              href={`/p/${client.shareToken}?brand=${defaultPreviewBrand}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg transition"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Prévisualiser comme le client</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation des 5 Onglets */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 sm:px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ONGLET 1 : AUDIT FLASH (Snapshot T0 & Évolution)
      ===================================================================== */}
      {activeTab === "audit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    Comparatif Impact : Audit Initial (T0) vs État Actuel
                  </h2>
                  <p className="text-xs text-slate-400">
                    Preuve visuelle de la transformation digitale du client depuis le démarrage
                  </p>
                </div>
                <span className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
                  Progression +{client.kpis.visibilityDelta} points
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                      SNAPSHOT T₀ (AVANT)
                    </span>
                    <span className="text-xs text-slate-500">
                      {t0 ? formatDateShort(t0.recordedAt) : "Initial"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-300 tabular-nums">
                      {t0?.visibilityScore ?? 0}
                    </span>
                    <span className="text-sm text-slate-500">/ 100</span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fiche Google Maps :</span>
                      <span className="font-bold text-white">
                        {t0?.gmbRating ?? "-"}★ ({t0?.gmbReviewsCount ?? 0} avis)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Audience Instagram :</span>
                      <span className="font-bold text-white">
                        {formatNum(t0?.igFollowers ?? 0)} abonnés
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {[
                        { label: "Site Web", ok: t0?.hasWebsite },
                        { label: "HTTPS / SSL", ok: t0?.hasSsl },
                        { label: "Meta Pixel", ok: t0?.hasMetaPixel },
                        { label: "MS Clarity", ok: t0?.hasClarity },
                      ].map((chk) => (
                        <div
                          key={chk.label}
                          className="flex items-center gap-1.5 text-[11px]"
                        >
                          {chk.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-400/80" />
                          )}
                          <span className="text-slate-300">{chk.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                      ÉTAT ACTUEL (LIVE)
                    </span>
                    <span className="text-xs text-emerald-400">
                      {currentAudit
                        ? formatDateShort(currentAudit.recordedAt)
                        : "Aujourd'hui"}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-400 tabular-nums">
                      {currentAudit?.visibilityScore ?? 0}
                    </span>
                    <span className="text-sm text-emerald-300/70">/ 100</span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-emerald-500/20 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Fiche Google Maps :</span>
                      <span className="font-bold text-emerald-300">
                        {currentAudit?.gmbRating ?? "-"}★ (
                        {currentAudit?.gmbReviewsCount ?? 0} avis)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Audience Instagram :</span>
                      <span className="font-bold text-emerald-300">
                        {formatNum(currentAudit?.igFollowers ?? 0)} abonnés
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {[
                        { label: "Site Web", ok: currentAudit?.hasWebsite },
                        { label: "HTTPS / SSL", ok: currentAudit?.hasSsl },
                        { label: "Meta Pixel", ok: currentAudit?.hasMetaPixel },
                        { label: "MS Clarity", ok: currentAudit?.hasClarity },
                      ].map((chk) => (
                        <div
                          key={chk.label}
                          className="flex items-center gap-1.5 text-[11px]"
                        >
                          {chk.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-slate-600" />
                          )}
                          <span className="text-white font-medium">
                            {chk.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6">
            <h3 className="text-base font-extrabold text-white mb-1">
              Enregistrer un Relevé d&apos;Audit Flash
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Mettez à jour l&apos;état actuel ou corrigez le diagnostic initial T₀.
            </p>

            <form
              action={(formData) => {
                startTransition(async () => {
                  await saveAuditSnapshotAction(client.id, formData);
                  router.refresh();
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Type de Snapshot
                </label>
                <select
                  name="isInitialT0"
                  defaultValue="false"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="false">
                    Nouvel Audit d&apos;Évolution (État Actuel)
                  </option>
                  <option value="true">
                    Mettre à jour l&apos;Audit Initial de Départ (T₀)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Note Google GMB (/5)
                  </label>
                  <input
                    name="gmbRating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={currentAudit?.gmbRating ?? 4.7}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Nombre d&apos;avis GMB
                  </label>
                  <input
                    name="gmbReviewsCount"
                    type="number"
                    defaultValue={currentAudit?.gmbReviewsCount ?? 120}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Abonnés Instagram
                  </label>
                  <input
                    name="igFollowers"
                    type="number"
                    defaultValue={currentAudit?.igFollowers ?? 1500}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Score Visibilité (/100)
                  </label>
                  <input
                    name="visibilityScore"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={currentAudit?.visibilityScore ?? 85}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {[
                  {
                    name: "hasWebsite",
                    label: "Site Web Actif",
                    checked: currentAudit?.hasWebsite ?? true,
                  },
                  {
                    name: "hasSsl",
                    label: "HTTPS / SSL",
                    checked: currentAudit?.hasSsl ?? true,
                  },
                  {
                    name: "hasMetaPixel",
                    label: "Meta Pixel",
                    checked: currentAudit?.hasMetaPixel ?? true,
                  },
                  {
                    name: "hasClarity",
                    label: "MS Clarity",
                    checked: currentAudit?.hasClarity ?? true,
                  },
                ].map((item) => (
                  <label
                    key={item.name}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name={item.name}
                      defaultChecked={item.checked}
                      className="rounded border-slate-700 text-blue-600"
                    />
                    <span className="text-slate-200">{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white shadow-lg transition cursor-pointer"
              >
                {isPending
                  ? "Enregistrement..."
                  : "Enregistrer le Snapshot d'Audit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 2 : SUIVI COMMERCIAL & ROI (ZÉRO FRICTION + JAUGE DE RENTABILITÉ)
      ===================================================================== */}
      {activeTab === "commercial" && (
        <div className="space-y-6">
          {/* WIDGET "JAUGE DE RENTABILITÉ CLIENT" (Argument de Closing Principal) */}
          <div className="rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/35 via-slate-900/75 to-slate-950 p-6 sm:p-7 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-3 py-1 text-xs font-extrabold text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Jauge de Rentabilité Client • Argument de Closing
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Comparatif Budget Investi vs Chiffre d&apos;Affaires Généré
                </h2>

                {/* Barre 1 : Budget investi par le client */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Budget total investi par {client.companyName} (HT)
                    </span>
                    <span className="font-extrabold text-white tabular-nums text-sm">
                      {formatEur(client.kpis.totalSoldHt)} HT
                    </span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-500"
                      style={{ width: `${budgetBarPct}%` }}
                    />
                  </div>
                </div>

                {/* Barre 2 : CA Généré estimé */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
                      CA Généré estimé ({client.kpis.totalLeads} clients × panier moy.{" "}
                      {client.avgBasketValue} €)
                    </span>
                    <span className="font-black text-emerald-400 tabular-nums text-base">
                      {formatEur(client.kpis.totalClientRevenue)}
                    </span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-800/90 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300 shadow-lg shadow-emerald-500/30 transition-all duration-500"
                      style={{ width: `${generatedBarPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Callout Géant Multiplicateur ROI */}
              <div className="shrink-0 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-7 py-6 text-center flex flex-col items-center justify-center shadow-inner">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
                  Multiplicateur Actuel
                </span>
                <div className="text-4xl sm:text-5xl font-black text-white my-1 tabular-nums tracking-tight">
                  x{client.kpis.roiMultiplier}
                </div>
                <span className="text-xs font-bold text-emerald-300">
                  de rentabilité nette
                </span>
                <span className="mt-2 text-[11px] text-slate-400">
                  +{formatEur(
                    Math.max(
                      0,
                      client.kpis.totalClientRevenue - client.kpis.totalSoldHt
                    )
                  )}{" "}
                  de gain net
                </span>
              </div>
            </div>
          </div>

          {/* FORMULAIRE SAISIE ÉCLAIR < 10s + QUICK-PRESETS EN 1 CLIC */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Saisie Éclair en 10 Secondes — Quick-Presets en 1 Clic
                </h3>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Cliquez sur une pilule pour pré-remplir la prestation, le prix, le type et le Workspace
                </span>
              </div>

              {/* Pills cliquables Vitrine Caladoise + Alsek Marketing */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mr-1">
                  Vitrine :
                </span>
                {QUICK_SALE_PRESETS.filter(
                  (p) => p.workspace === "VITRINE"
                ).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      saleProduct === preset.productName
                        ? "border-amber-400 bg-amber-500 text-slate-950 shadow-md"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    }`}
                  >
                    [{preset.label}]
                  </button>
                ))}

                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 ml-2 mr-1">
                  Alsek :
                </span>
                {QUICK_SALE_PRESETS.filter((p) => p.workspace === "ALSEK").map(
                  (preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        saleProduct === preset.productName
                          ? "border-cyan-400 bg-blue-600 text-white shadow-md"
                          : "border-blue-500/35 bg-blue-600/10 text-cyan-300 hover:bg-blue-600/20"
                      }`}
                    >
                      [{preset.label}]
                    </button>
                  )
                )}
              </div>
            </div>

            <form
              onSubmit={handleQuickSaleSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-2 border-t border-white/10"
            >
              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Portefeuille
                </label>
                <select
                  value={saleWorkspace}
                  onChange={(e) =>
                    setSaleWorkspace(e.target.value as WorkspaceSlugType)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="ALSEK">Alsek Marketing</option>
                  <option value="VITRINE">Vitrine Caladoise</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Prestation vendue *
                </label>
                <input
                  required
                  value={saleProduct}
                  onChange={(e) => setSaleProduct(e.target.value)}
                  placeholder="Cliquez sur un preset ou saisissez..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Facturation
                </label>
                <select
                  value={saleBillingType}
                  onChange={(e) =>
                    setSaleBillingType(e.target.value as BillingTypeKey)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-2 text-xs text-white"
                >
                  <option value="ONE_SHOT">One-Shot</option>
                  <option value="RECURRING_MRR">MRR / Mois</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Montant HT (€)
                </label>
                <input
                  type="number"
                  required
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-2 text-xs font-extrabold text-white"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Statut
                </label>
                <select
                  value={saleStatus}
                  onChange={(e) =>
                    setSaleStatus(e.target.value as PaymentStatusKey)
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
                >
                  <option value="PAID">🟢 Payé</option>
                  <option value="PENDING">🟡 Attente</option>
                  <option value="OVERDUE">🔴 Retard</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nouveaux clients
                </label>
                <input
                  type="number"
                  value={saleLeads}
                  onChange={(e) => handleLeadsChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-2 text-xs text-white"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] text-emerald-400 mb-1">
                  CA Généré (€)
                </label>
                <input
                  type="number"
                  value={saleRevenue}
                  onChange={(e) => setSaleRevenue(Number(e.target.value))}
                  className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-2 text-xs font-extrabold text-emerald-300"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 px-4 py-2 text-xs font-extrabold text-white shadow-lg transition cursor-pointer"
                >
                  + Ajouter (ROI x{previewRoiMultiplier})
                </button>
              </div>
            </form>
          </div>

          {/* TABLEAU & CARTES MOBILES DES PRESTATIONS AVEC TOGGLE PAIEMENT INSTANTANÉ */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Historique Commercial & Toggle de Paiement Instantané
                </h3>
                <p className="text-xs text-slate-400">
                  Cliquez sur la pastille (🟡 En attente / 🟢 Payé / 🔴 Retard) pour changer le statut sans recharger la page.
                </p>
              </div>
            </div>

            {/* Mode Mobile Terrain (< sm) */}
            <div className="sm:hidden space-y-3">
              {client.commercialEntries.map((entry) => {
                const status =
                  optimisticPaymentStatus[entry.id] ?? entry.paymentStatus;
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold mb-1 ${
                            entry.workspace.slug === "ALSEK"
                              ? "bg-blue-600/20 text-cyan-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {entry.workspace.name}
                        </span>
                        <div className="text-sm font-bold text-white">
                          {entry.productName}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleOptimisticCyclePayment(entry.id, status)
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          status === "PAID"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : status === "PENDING"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {status === "PAID"
                          ? "🟢 Payé"
                          : status === "PENDING"
                            ? "🟡 En attente"
                            : "🔴 Retard"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <span className="font-bold text-white">
                        {formatEur(entry.amountSoldHt)} HT
                      </span>
                      <span className="font-extrabold text-emerald-400">
                        CA Client : {formatEur(entry.clientRevenueGenerated)} (x
                        {entry.roiMultiplier})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mode Desktop / Tablette (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 pr-3">Prestation</th>
                    <th className="py-3 px-3">Portefeuille</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Montant HT</th>
                    <th className="py-3 px-3 text-center">
                      Statut Paiement (Instant Toggle)
                    </th>
                    <th className="py-3 px-3 text-right">
                      CA Généré chez le Client
                    </th>
                    <th className="py-3 px-3 text-right">ROI</th>
                    <th className="py-3 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {client.commercialEntries.map((entry) => {
                    const isEditing = editingSaleId === entry.id;
                    const status =
                      optimisticPaymentStatus[entry.id] ?? entry.paymentStatus;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-white/[0.03] transition"
                      >
                        <td className="py-4 pr-3">
                          <div className="font-bold text-white">
                            {entry.productName}
                          </div>
                          {entry.notes && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {entry.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                              entry.workspace.slug === "ALSEK"
                                ? "bg-blue-600/15 text-cyan-300 border-blue-500/30"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {entry.workspace.name}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-slate-300">
                          {entry.billingType === "RECURRING_MRR"
                            ? "MRR Mensuel"
                            : "One-Shot"}
                        </td>
                        <td className="py-4 px-3 text-right font-extrabold text-white tabular-nums">
                          {formatEur(entry.amountSoldHt)}
                        </td>
                        <td className="py-4 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleOptimisticCyclePayment(entry.id, status)
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-extrabold transition-all active:scale-95 cursor-pointer ${
                              status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25"
                                : status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25"
                            }`}
                          >
                            <span>
                              {status === "PAID"
                                ? "🟢 Payé"
                                : status === "PENDING"
                                  ? "🟡 En attente"
                                  : "🔴 Retard"}
                            </span>
                          </button>
                        </td>
                        <td className="py-4 px-3 text-right tabular-nums">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                value={editLeadsVal}
                                onChange={(e) =>
                                  setEditLeadsVal(Number(e.target.value))
                                }
                                className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs text-white"
                              />
                              <input
                                type="number"
                                value={editRevenueVal}
                                onChange={(e) =>
                                  setEditRevenueVal(Number(e.target.value))
                                }
                                className="w-24 rounded border border-emerald-500/50 bg-slate-950 px-2 py-1 text-right text-xs font-bold text-emerald-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  startTransition(async () => {
                                    await updateCommercialRoiAction(
                                      entry.id,
                                      client.id,
                                      editRevenueVal,
                                      editLeadsVal
                                    );
                                    setEditingSaleId(null);
                                    router.refresh();
                                  });
                                }}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="font-extrabold text-emerald-400 text-sm">
                                {formatEur(entry.clientRevenueGenerated)}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {entry.leadsGenerated} nouveaux clients
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right">
                          <span className="inline-flex rounded-lg bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 text-xs font-black text-emerald-300 tabular-nums">
                            x{entry.roiMultiplier}
                          </span>
                        </td>
                        <td className="py-4 pl-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSaleId(entry.id);
                                setEditRevenueVal(entry.clientRevenueGenerated);
                                setEditLeadsVal(entry.leadsGenerated);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  await deleteCommercialEntryAction(
                                    entry.id,
                                    client.id
                                  );
                                  router.refresh();
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 3 : CONTENT TRACKER PAR LIEN
      ===================================================================== */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-amber-400" />
                Content Tracker par Lien (Instagram Reel, TikTok, YouTube Short, Facebook)
              </h2>
              <p className="text-xs text-slate-400">
                Collez l&apos;URL d&apos;une vidéo : <code className="text-slate-200">SocialScraperService</code> récupère les KPIs et trace la courbe temporelle.
              </p>
            </div>

            <form
              onSubmit={handleAddPostSubmit}
              className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
            >
              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Portefeuille
                </label>
                <select
                  name="workspaceSlug"
                  defaultValue={defaultWsSlug}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white"
                >
                  <option value="ALSEK">Alsek Marketing</option>
                  <option value="VITRINE">Vitrine Caladoise</option>
                </select>
              </div>

              <div className="lg:col-span-5">
                <label className="block text-[11px] text-slate-400 mb-1">
                  URL de la vidéo publiée *
                </label>
                <input
                  name="postUrl"
                  type="url"
                  required
                  placeholder="https://www.instagram.com/reel/... ou https://www.tiktok.com/..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Titre / Hook (Optionnel)
                </label>
                <input
                  name="titleOrHook"
                  placeholder="Ex: On a testé la spécialité du chef 🔥"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 px-4 text-xs font-extrabold text-white shadow-lg transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Tracker le Lien
                </button>
              </div>
            </form>
          </div>

          {activePostForChart && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Courbe d&apos;Évolution Temporelle (`PostMetricSnapshot`)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Progression chronologique des vues et de l&apos;engagement
                  </p>
                </div>

                <select
                  value={activePostForChart.id}
                  onChange={(e) => setSelectedPostForChart(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-white max-w-xs"
                >
                  {client.trackedPosts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.platform}] {p.titleOrHook?.slice(0, 42)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {activePostForChart.metricsHistory.map((snap, idx) => {
                  const maxViews = Math.max(
                    ...activePostForChart.metricsHistory.map((m) => m.views),
                    1
                  );
                  const heightPct = Math.max(
                    18,
                    Math.round((snap.views / maxViews) * 100)
                  );
                  return (
                    <div
                      key={snap.id}
                      className="rounded-xl border border-white/10 bg-slate-950/60 p-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                        <span>Snapshot #{idx + 1}</span>
                        <span>{formatDateShort(snap.recordedAt)}</span>
                      </div>
                      <div className="h-24 flex items-end mb-2 bg-slate-900/80 rounded-lg p-2">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-blue-600 to-amber-400"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white tabular-nums">
                          {formatNum(snap.views)} vues
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold">
                          {formatNum(snap.likes)} ♥ • {snap.engagementRate}% eng.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {client.trackedPosts.map((post) => {
              const isManualEditing = editingPostId === post.id;
              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-extrabold text-white">
                          {post.platform}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                            post.workspace.slug === "ALSEK"
                              ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {post.workspace.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                        >
                          Ouvrir <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(async () => {
                              await deleteTrackedPostAction(post.id, client.id);
                              router.refresh();
                            })
                          }
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {post.titleOrHook || post.postUrl}
                    </h4>

                    <div className="grid grid-cols-5 gap-2 text-center pt-1">
                      <div className="rounded-xl bg-slate-950/70 border border-white/10 p-2">
                        <div className="text-[10px] text-slate-400">Vues</div>
                        <div className="text-xs font-extrabold text-white tabular-nums mt-0.5">
                          {formatNum(post.latestMetric.views)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-white/10 p-2">
                        <div className="text-[10px] text-slate-400">Likes</div>
                        <div className="text-xs font-bold text-rose-300 tabular-nums mt-0.5">
                          {formatNum(post.latestMetric.likes)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-white/10 p-2">
                        <div className="text-[10px] text-slate-400">Coms</div>
                        <div className="text-xs font-bold text-cyan-300 tabular-nums mt-0.5">
                          {formatNum(post.latestMetric.comments)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-white/10 p-2">
                        <div className="text-[10px] text-slate-400">Shares</div>
                        <div className="text-xs font-bold text-indigo-300 tabular-nums mt-0.5">
                          {formatNum(post.latestMetric.shares)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2">
                        <div className="text-[10px] text-emerald-400">Engag.</div>
                        <div className="text-xs font-extrabold text-emerald-300 tabular-nums mt-0.5">
                          {post.latestMetric.engagementRate}%
                        </div>
                      </div>
                    </div>

                    {isManualEditing && (
                      <div className="rounded-xl border border-amber-500/35 bg-slate-950 p-3 space-y-2.5 text-xs">
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400">Vues</label>
                            <input
                              type="number"
                              value={manualViews}
                              onChange={(e) =>
                                setManualViews(Number(e.target.value))
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Likes</label>
                            <input
                              type="number"
                              value={manualLikes}
                              onChange={(e) =>
                                setManualLikes(Number(e.target.value))
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Coms</label>
                            <input
                              type="number"
                              value={manualComments}
                              onChange={(e) =>
                                setManualComments(Number(e.target.value))
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Shares</label>
                            <input
                              type="number"
                              value={manualShares}
                              onChange={(e) =>
                                setManualShares(Number(e.target.value))
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Saves</label>
                            <input
                              type="number"
                              value={manualSaves}
                              onChange={(e) =>
                                setManualSaves(Number(e.target.value))
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="rounded-lg bg-slate-800 px-3 py-1 text-[11px] text-slate-300"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => saveManualPostMetrics(post.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedPostForChart(post.id)}
                      className="text-[11px] text-slate-400 hover:text-white underline"
                    >
                      Voir courbe ({post.metricsHistory.length} relevés)
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openManualEditPost(post)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white"
                      >
                        <Edit3 className="h-3 w-3" />
                        Saisie 1-clic
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await refreshPostMetricsAction(post.id, client.id);
                            router.refresh();
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 px-3 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-blue-600/30 transition cursor-pointer"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`}
                        />
                        Actualiser
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 4 : WEB, CLARITY & PIXEL METRICS
      ===================================================================== */}
      {activeTab === "web" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Performance Web, Conversions Meta Pixel & Santé UX Clarity
                </h2>
                <p className="text-xs text-slate-400">
                  Suivi des sessions, des appels/itinéraires et des Rage/Dead Clicks
                </p>
              </div>

              <div className="space-y-3">
                {client.webMetrics.map((wm, idx) => (
                  <div
                    key={wm.id}
                    className="rounded-xl border border-white/10 bg-slate-950/50 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-center"
                  >
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">
                        Période #{idx + 1}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {formatDateShort(wm.recordedAt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Sessions</div>
                      <div className="text-sm font-extrabold text-white tabular-nums">
                        {formatNum(wm.sessionsCount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">
                        Vues Pixel
                      </div>
                      <div className="text-sm font-bold text-cyan-300 tabular-nums">
                        {formatNum(wm.pixelPageViews)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Appels / Leads
                      </div>
                      <div className="text-sm font-extrabold text-emerald-300 tabular-nums">
                        +{formatNum(wm.pixelLeadsOrCalls)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Clarity</div>
                      <div className="text-xs font-bold text-amber-300">
                        {wm.clarityRageClicks} Rage • {wm.clarityDeadClicks} Dead
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form
                action={(formData) => {
                  startTransition(async () => {
                    await addWebMetricSnapshotAction(client.id, formData);
                    router.refresh();
                  });
                }}
                className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3"
              >
                <div className="text-xs font-bold text-white">
                  + Ajouter un relevé mensuel Web / Clarity / Pixel
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400">Sessions</label>
                    <input
                      name="sessionsCount"
                      type="number"
                      defaultValue={3800}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Visiteurs</label>
                    <input
                      name="uniqueVisitors"
                      type="number"
                      defaultValue={3100}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Vues Pixel
                    </label>
                    <input
                      name="pixelPageViews"
                      type="number"
                      defaultValue={8200}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400">
                      Leads/Appels
                    </label>
                    <input
                      name="pixelLeadsOrCalls"
                      type="number"
                      defaultValue={240}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-emerald-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Rage Clicks
                    </label>
                    <input
                      name="clarityRageClicks"
                      type="number"
                      defaultValue={2}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Dead Clicks
                    </label>
                    <input
                      name="clarityDeadClicks"
                      type="number"
                      defaultValue={4}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                >
                  Enregistrer le relevé Web
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6">
            <h3 className="text-base font-extrabold text-white mb-1">
              Identifiants de Tracking & Métadonnées Client
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configurez les IDs Google Maps, Clarity, Meta Pixel, GA4 et NAF/Effectif.
            </p>

            <form
              action={(formData) => {
                startTransition(async () => {
                  await updateClientTrackingAction(client.id, formData);
                  router.refresh();
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">
                  URL Site Client ou Page Vitrine Caladoise
                </label>
                <input
                  name="websiteUrl"
                  defaultValue={client.websiteUrl || ""}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Google Maps Place ID
                  </label>
                  <input
                    name="gmbPlaceId"
                    defaultValue={client.gmbPlaceId || ""}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Clarity Project ID
                  </label>
                  <input
                    name="clarityProjectId"
                    defaultValue={client.clarityProjectId || ""}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1">Code NAF</label>
                  <input
                    name="nafCode"
                    defaultValue={client.nafCode || ""}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Effectif</label>
                  <input
                    name="employeeCount"
                    type="number"
                    defaultValue={client.employeeCount ?? 0}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Panier Moy. (€)
                  </label>
                  <input
                    name="avgBasketValue"
                    type="number"
                    step="0.5"
                    defaultValue={client.avgBasketValue}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 py-2.5 text-xs font-bold text-white transition cursor-pointer mt-2"
              >
                Sauvegarder les Identifiants
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 5 : MODULES & AUTOMATISATIONS IA (CARTES "FONCTIONNALITÉS PRO / UPSELL" + MODALE + TIMELINE)
      ===================================================================== */}
      {activeTab === "modules" && (
        <div className="space-y-7">
          {/* Cartes "Fonctionnalités Pro / Upsell" */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ALL_PLUGINS_LIST.map((plugin) => {
              const clientMod = client.addonModules.find(
                (m) => m.moduleType === plugin.moduleType
              );
              const isEnabled =
                optimisticModuleEnabled[plugin.moduleType] ??
                clientMod?.isEnabled ??
                false;
              const currentConfig =
                (clientMod?.configJson as Record<string, unknown>) ||
                plugin.defaultConfig;

              return (
                <div
                  key={plugin.moduleType}
                  className={`group relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between space-y-5 transition-all duration-300 ${
                    isEnabled
                      ? "border-white/20 bg-slate-900/70 backdrop-blur-xl shadow-2xl"
                      : "border-white/10 bg-slate-950/60 opacity-85 hover:opacity-100"
                  }`}
                >
                  {/* Glow décoratif */}
                  <div
                    className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-35"
                    style={{ backgroundColor: plugin.accentColor }}
                  />

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                            style={{
                              backgroundColor: `${plugin.accentColor}20`,
                              color: plugin.accentColor,
                              border: `1px solid ${plugin.accentColor}45`,
                            }}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {plugin.badgeLabel}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            ADD-ON PRO
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white">
                          {plugin.name}
                        </h3>
                      </div>

                      {/* Interrupteur Toggle Switch Premium */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() =>
                          handleToggleModuleOptimistic(
                            plugin.moduleType,
                            isEnabled
                          )
                        }
                        className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
                          isEnabled
                            ? "bg-emerald-500 border-emerald-400"
                            : "bg-slate-800 border-slate-700"
                        }`}
                        style={{ width: "52px" }}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                            isEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {plugin.shortDescription}
                    </p>

                    {/* Bénéfices clés */}
                    {plugin.highlights && (
                      <ul className="space-y-1.5 pt-1">
                        {plugin.highlights.map((h) => (
                          <li
                            key={h}
                            className="flex items-center gap-2 text-xs text-slate-200"
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: plugin.accentColor }}
                            />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Aperçu synthétique de la configuration */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5 space-y-1.5 text-[11px]">
                      {Object.entries(currentConfig)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-400 font-mono">
                              {k}:
                            </span>
                            <span className="truncate font-semibold text-slate-200 text-right">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Footer Actions : Modale Config & Simulation Live */}
                  <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => openPluginModal(plugin, currentConfig)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 transition cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configurer le module
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await triggerModuleExecutionAction(
                            client.id,
                            plugin.moduleType
                          );
                          router.refresh();
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Simuler en direct
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TIMELINE DES ÉVÉNEMENTS D'AUTOMATISATION IA */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Timeline Temps Réel des Automatisations IA (`AutomationEvent`)
                </h3>
                <p className="text-xs text-slate-400">
                  Journal d&apos;activité montrant au commerçant comment l&apos;IA répond à ses avis, surveille ses concurrents et détecte ses aides d&apos;État.
                </p>
              </div>
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-extrabold text-indigo-300">
                {client.automationLogs.length} événements tracés
              </span>
            </div>

            <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-5">
              {client.automationLogs.map((evt) => {
                const payload = (evt.payloadJson || {}) as Record<
                  string,
                  unknown
                >;
                return (
                  <div key={evt.id} className="relative group">
                    <span
                      className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-[#090D16] ${
                        evt.status === "SUCCESS"
                          ? "bg-emerald-400"
                          : evt.status === "PENDING_APPROVAL"
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                      }`}
                    />
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5 space-y-3 hover:border-white/20 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-indigo-500/20 border border-indigo-500/35 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-300">
                            {evt.moduleType}
                          </span>
                          <span className="text-sm font-extrabold text-white">
                            {evt.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {formatDateShort(evt.createdAt)}
                          </span>
                          {evt.status === "PENDING_APPROVAL" ? (
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  await approveAutomationEventAction(
                                    evt.id,
                                    client.id
                                  );
                                  router.refresh();
                                })
                              }
                              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950 shadow transition cursor-pointer"
                            >
                              Approuver & Publier (1-Clic)
                            </button>
                          ) : (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              ✓ {evt.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rendu Visuel Métier du Payload (Avis GMB / Veille / Subvention) */}
                      {Boolean(payload.aiDraftReply) && (
                        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-3.5 text-xs space-y-1.5">
                          {Boolean(payload.reviewExcerpt) && (
                            <p className="text-slate-400 italic">
                              Avis client : &ldquo;{String(payload.reviewExcerpt)}&rdquo;
                            </p>
                          )}
                          <p className="text-emerald-200 font-medium">
                            <strong className="text-emerald-400">
                              Réponse IA :
                            </strong>{" "}
                            {String(payload.aiDraftReply)}
                          </p>
                        </div>
                      )}

                      {Boolean(payload.insight) && (
                        <div className="rounded-xl border border-blue-500/25 bg-blue-950/20 p-3.5 text-xs text-cyan-200">
                          <strong className="text-cyan-400">
                            Radar Concurrentiel :
                          </strong>{" "}
                          {String(payload.insight)}
                        </div>
                      )}

                      {Boolean(payload.upsellOpportunity) && (
                        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 text-xs text-amber-200">
                          <strong className="text-amber-400">
                            Opportunité Subvention ({String(payload.maxAmountEur ?? 1500)} €) :
                          </strong>{" "}
                          {String(payload.upsellOpportunity)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MODALE DE CONFIGURATION RAPIDE DU PLUGIN IA */}
          {modalPlugin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0D1322] p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                      Configuration Rapide • {client.companyName}
                    </span>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {modalPlugin.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalPlugin(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {modalPlugin.configSchema.map((field) => {
                    // Gestion spéciale pour les tags de concurrents locaux (jusqu'à 3 concurrents)
                    if (field.type === "tags") {
                      const rawStr = String(
                        moduleConfigDraft[field.key] || ""
                      );
                      const tags = rawStr
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);

                      const addTag = () => {
                        if (!competitorInput.trim()) return;
                        if (field.maxItems && tags.length >= field.maxItems)
                          return;
                        const updated = [...tags, competitorInput.trim()].join(
                          ", "
                        );
                        setModuleConfigDraft({
                          ...moduleConfigDraft,
                          [field.key]: updated,
                        });
                        setCompetitorInput("");
                      };

                      const removeTag = (target: string) => {
                        const updated = tags
                          .filter((t) => t !== target)
                          .join(", ");
                        setModuleConfigDraft({
                          ...moduleConfigDraft,
                          [field.key]: updated,
                        });
                      };

                      return (
                        <div key={field.key} className="space-y-2">
                          <label className="block font-bold text-slate-200">
                            {field.label} ({tags.length}/{field.maxItems ?? 3})
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/20 border border-blue-500/40 px-3 py-1 text-xs font-bold text-cyan-300"
                              >
                                {t}
                                <button
                                  type="button"
                                  onClick={() => removeTag(t)}
                                  className="hover:text-white"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={competitorInput}
                              onChange={(e) =>
                                setCompetitorInput(e.target.value)
                              }
                              placeholder="Ajouter un concurrent local..."
                              className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white"
                            />
                            <button
                              type="button"
                              onClick={addTag}
                              className="rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white"
                            >
                              + Ajouter
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.key}>
                        <label className="block font-bold text-slate-200 mb-1">
                          {field.label}
                        </label>
                        {field.type === "select" && field.options ? (
                          <select
                            value={String(moduleConfigDraft[field.key] ?? "")}
                            onChange={(e) =>
                              setModuleConfigDraft({
                                ...moduleConfigDraft,
                                [field.key]: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white"
                          >
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            value={String(moduleConfigDraft[field.key] ?? "")}
                            onChange={(e) =>
                              setModuleConfigDraft({
                                ...moduleConfigDraft,
                                [field.key]:
                                  field.type === "number"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white"
                          />
                        )}
                        {field.helpText && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalPlugin(null)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const targetType = modalPlugin.moduleType;
                      startTransition(async () => {
                        await updateClientModuleConfigAction(
                          client.id,
                          targetType,
                          moduleConfigDraft
                        );
                        setModalPlugin(null);
                        router.refresh();
                      });
                    }}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2 text-xs font-extrabold text-white shadow-lg cursor-pointer"
                  >
                    Sauvegarder la Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
