"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Euro,
  TrendingUp,
  Clock,
  Eye,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  X,
  BarChart3,
  Target,
  Sparkles,
  Calendar,
  Building2,
  ArrowUpRight,
  Check,
} from "lucide-react";
import type {
  EnrichedClient360,
  EnrichedCommercialEntry,
  WorkspaceFilter,
  WorkspaceKpis,
  OfferTypeKey,
} from "@/lib/db";
import type {
  BillingTypeKey,
  PaymentStatusKey,
  WorkspaceSlugType,
  ClientRoiMetricRecord,
} from "@/lib/seed-data";
import { OFFER_CATALOG } from "@/lib/offers";
import {
  addCommercialEntryAction,
  updateCommercialEntryAction,
  setPaymentStatusAction,
  deleteCommercialEntryAction,
  upsertClientRoiMetricAction,
} from "@/app/actions";

interface BillingRoiViewProps {
  activeWorkspace: WorkspaceFilter;
  kpis: WorkspaceKpis;
  clients: EnrichedClient360[];
}

const OFFER_META: Record<
  OfferTypeKey,
  {
    label: string;
    shortLabel: string;
    priceTag: string;
    colorHex: string;
    badgeClass: string;
    barClass: string;
  }
> = {
  ESSENTIEL: {
    label: "Essentiel (160€)",
    shortLabel: "Essentiel",
    priceTag: "160 € HT",
    colorHex: "#38BDF8",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/35",
    barClass: "bg-sky-400",
  },
  EVOLUTION: {
    label: "Évolution (300€)",
    shortLabel: "Évolution",
    priceTag: "300 € HT",
    colorHex: "#1E3AFF",
    badgeClass: "bg-[#1E3AFF]/20 text-blue-200 border-[#1E3AFF]/50",
    barClass: "bg-[#1E3AFF]",
  },
  MAITRISE: {
    label: "Maîtrise (500€)",
    shortLabel: "Maîtrise",
    priceTag: "500 € HT",
    colorHex: "#00E676",
    badgeClass: "bg-[#00E676]/15 text-[#00E676] border-[#00E676]/40",
    barClass: "bg-[#00E676]",
  },
  PACK_MEDIA_VITRINE: {
    label: "Pack Média Vitrine",
    shortLabel: "Pack Vitrine",
    priceTag: "Média Local",
    colorHex: "#D4AF37",
    badgeClass: "bg-[#4B0082]/40 text-[#D4AF37] border-[#D4AF37]/45",
    barClass: "bg-[#D4AF37]",
  },
  SUR_MESURE: {
    label: "Sur-mesure",
    shortLabel: "Sur-mesure",
    priceTag: "Custom",
    colorHex: "#A855F7",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/35",
    barClass: "bg-purple-500",
  },
};

const NEXT_STATUS: Record<PaymentStatusKey, PaymentStatusKey> = {
  PENDING: "PAID",
  PAID: "OVERDUE",
  OVERDUE: "PENDING",
};

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

function formatMonthLabel(ym: string): string {
  try {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return ym;
  }
}

export function BillingRoiView({
  activeWorkspace,
  kpis,
  clients,
}: BillingRoiViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Palette dynamique Alsek (#1E3AFF / #00E676) vs Vitrine (#4B0082 / #D4AF37)
  const brandColors =
    activeWorkspace === "VITRINE"
      ? {
          primary: "#4B0082",
          secondary: "#D4AF37",
          accentText: "text-[#D4AF37]",
          accentBorder: "border-[#D4AF37]/40",
          accentBg: "bg-[#4B0082]/25",
          ctaClass:
            "bg-gradient-to-r from-[#4B0082] to-[#D4AF37] text-white shadow-lg shadow-[#4B0082]/30",
        }
      : activeWorkspace === "ALSEK"
        ? {
            primary: "#1E3AFF",
            secondary: "#00E676",
            accentText: "text-[#00E676]",
            accentBorder: "border-[#1E3AFF]/50",
            accentBg: "bg-[#1E3AFF]/15",
            ctaClass:
              "bg-gradient-to-r from-[#1E3AFF] to-[#00E676] text-white shadow-lg shadow-[#1E3AFF]/30",
          }
        : {
            primary: "#1E3AFF",
            secondary: "#10B981",
            accentText: "text-emerald-400",
            accentBorder: "border-emerald-500/35",
            accentBg: "bg-indigo-500/15",
            ctaClass:
              "bg-gradient-to-r from-[#1E3AFF] via-indigo-600 to-[#00E676] text-white shadow-lg shadow-indigo-500/25",
          };

  // Onglet actif : Facturation vs Suivi ROI Client
  const [activeSection, setActiveSection] = useState<"ALL" | "BILLING" | "ROI">(
    "ALL"
  );

  // Filtres Tableau CommercialEntry
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatusKey>(
    "ALL"
  );
  const [offerFilter, setOfferFilter] = useState<"ALL" | OfferTypeKey>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");

  // Optimistic payment status map
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, PaymentStatusKey>
  >({});

  // Modale Création / Édition CommercialEntry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] =
    useState<EnrichedCommercialEntry | null>(null);
  const [modalClientId, setModalClientId] = useState<string>(
    clients[0]?.id || ""
  );
  const [modalWorkspace, setModalWorkspace] = useState<WorkspaceSlugType>(
    activeWorkspace === "VITRINE" ? "VITRINE" : "ALSEK"
  );
  const [modalOffer, setModalOffer] = useState<OfferTypeKey>("EVOLUTION");
  const [modalProductName, setModalProductName] = useState<string>(
    "Offre Évolution — 2 Reels/mois + Gestion Avis"
  );
  const [modalBillingType, setModalBillingType] =
    useState<BillingTypeKey>("RECURRING_MRR");
  const [modalAmountHt, setModalAmountHt] = useState<number>(300);
  const [modalStatus, setModalStatus] = useState<PaymentStatusKey>("PAID");
  const [modalNotes, setModalNotes] = useState<string>("");

  // Section Suivi ROI Client (ClientRoiMetric)
  const [roiClientId, setRoiClientId] = useState<string>(clients[0]?.id || "");
  const [roiMonth, setRoiMonth] = useState<string>("2026-11");
  const [roiLeads, setRoiLeads] = useState<number>(65);
  const [roiRevenue, setRoiRevenue] = useState<number>(3250);
  const [roiNotes, setRoiNotes] = useState<string>("");
  const [roiSavedToast, setRoiSavedToast] = useState(false);

  // Consolidation de toutes les CommercialEntry du périmètre
  const allEntries = useMemo(() => {
    return clients
      .flatMap((c) => c.commercialEntries)
      .sort(
        (a, b) =>
          new Date(b.periodDate).getTime() - new Date(a.periodDate).getTime()
      );
  }, [clients]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      const effectiveStatus =
        optimisticStatuses[entry.id] ?? entry.paymentStatus;
      if (statusFilter !== "ALL" && effectiveStatus !== statusFilter)
        return false;
      if (offerFilter !== "ALL" && entry.offer !== offerFilter) return false;
      if (clientFilter !== "ALL" && entry.clientId !== clientFilter)
        return false;
      return true;
    });
  }, [allEntries, optimisticStatuses, statusFilter, offerFilter, clientFilter]);

  // Données du graphique d'évolution des revenus mensuels ventilé par OfferType
  const monthlyChartData = useMemo(() => {
    const monthsMap = new Map<
      string,
      Record<OfferTypeKey, number> & { total: number }
    >();

    // Initialiser les 6 derniers mois de 2026 (Juin -> Novembre)
    const defaultMonths = [
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ];
    for (const m of defaultMonths) {
      monthsMap.set(m, {
        ESSENTIEL: 0,
        EVOLUTION: 0,
        MAITRISE: 0,
        PACK_MEDIA_VITRINE: 0,
        SUR_MESURE: 0,
        total: 0,
      });
    }

    for (const entry of allEntries) {
      const ym = (entry.issuedAt || entry.periodDate).slice(0, 7);
      if (!monthsMap.has(ym)) {
        monthsMap.set(ym, {
          ESSENTIEL: 0,
          EVOLUTION: 0,
          MAITRISE: 0,
          PACK_MEDIA_VITRINE: 0,
          SUR_MESURE: 0,
          total: 0,
        });
      }
      const bucket = monthsMap.get(ym)!;
      const offerKey: OfferTypeKey = entry.offer || "SUR_MESURE";
      bucket[offerKey] = (bucket[offerKey] || 0) + entry.amountSoldHt;
      bucket.total += entry.amountSoldHt;
    }

    const sortedMonths = Array.from(monthsMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const maxMonthTotal = Math.max(
      ...sortedMonths.map(([, v]) => v.total),
      500
    );

    return { sortedMonths, maxMonthTotal };
  }, [allEntries]);

  // Totaux par OfferType pour la légende
  const totalsByOffer = useMemo(() => {
    const acc: Record<OfferTypeKey, number> = {
      ESSENTIEL: 0,
      EVOLUTION: 0,
      MAITRISE: 0,
      PACK_MEDIA_VITRINE: 0,
      SUR_MESURE: 0,
    };
    for (const e of allEntries) {
      const k = e.offer || "SUR_MESURE";
      acc[k] = (acc[k] || 0) + e.amountSoldHt;
    }
    return acc;
  }, [allEntries]);

  // Liste consolidée des ClientRoiMetric
  const allRoiMetrics = useMemo(() => {
    return clients
      .flatMap((c) =>
        (c.roiMetrics || []).map((rm: ClientRoiMetricRecord) => ({
          ...rm,
          clientName: c.companyName,
          avgBasketValue: c.avgBasketValue,
        }))
      )
      .sort(
        (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
      );
  }, [clients]);

  // Handlers Modale Facturation
  const openCreateModal = () => {
    setEditingEntry(null);
    setModalClientId(clients[0]?.id || "");
    const defaultWs: WorkspaceSlugType =
      activeWorkspace === "VITRINE" ? "VITRINE" : "ALSEK";
    setModalWorkspace(defaultWs);
    if (defaultWs === "VITRINE") {
      setModalOffer("PACK_MEDIA_VITRINE");
      setModalProductName("Pack Média Vitrine Caladoise — Reel Immersion");
      setModalAmountHt(450);
      setModalBillingType("ONE_SHOT");
    } else {
      setModalOffer("EVOLUTION");
      setModalProductName("Offre Évolution — 2 Reels/mois + Gestion Avis");
      setModalAmountHt(300);
      setModalBillingType("RECURRING_MRR");
    }
    setModalStatus("PAID");
    setModalNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (entry: EnrichedCommercialEntry) => {
    setEditingEntry(entry);
    setModalClientId(entry.clientId);
    setModalWorkspace(entry.workspace.slug);
    setModalOffer(entry.offer);
    setModalProductName(entry.productName);
    setModalBillingType(entry.billingType);
    setModalAmountHt(entry.amountSoldHt);
    setModalStatus(
      optimisticStatuses[entry.id] ?? entry.paymentStatus
    );
    setModalNotes(entry.notes || "");
    setIsModalOpen(true);
  };

  const handleSelectOfferPreset = (offer: OfferTypeKey) => {
    setModalOffer(offer);
    const catalogItem = OFFER_CATALOG[offer];
    if (catalogItem.amountHt !== null) {
      setModalAmountHt(catalogItem.amountHt);
    }
    if (offer === "ESSENTIEL") {
      setModalWorkspace("ALSEK");
      setModalBillingType("RECURRING_MRR");
      setModalProductName("Offre Essentiel — Présence & 1 Reel/mois");
    } else if (offer === "EVOLUTION") {
      setModalWorkspace("ALSEK");
      setModalBillingType("RECURRING_MRR");
      setModalProductName("Offre Évolution — 2 Reels/mois + Gestion Avis");
    } else if (offer === "MAITRISE") {
      setModalWorkspace("ALSEK");
      setModalBillingType("RECURRING_MRR");
      setModalProductName("Offre Maîtrise — 4 Reels/mois + Meta Ads Local");
    } else if (offer === "PACK_MEDIA_VITRINE") {
      setModalWorkspace("VITRINE");
      setModalBillingType("ONE_SHOT");
      setModalProductName("Pack Média Vitrine Caladoise — Reportage & Story");
      if (!modalAmountHt || modalAmountHt < 100) setModalAmountHt(590);
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (editingEntry) {
        await updateCommercialEntryAction(
          editingEntry.id,
          editingEntry.clientId,
          {
            productName: modalProductName,
            offer: modalOffer,
            billingType: modalBillingType,
            amountSoldHt: modalAmountHt,
            paymentStatus: modalStatus,
            notes: modalNotes || null,
          }
        );
      } else {
        const fd = new FormData();
        fd.set("workspaceSlug", modalWorkspace);
        fd.set("offer", modalOffer);
        fd.set("productName", modalProductName);
        fd.set("billingType", modalBillingType);
        fd.set("amountSoldHt", String(modalAmountHt));
        fd.set("paymentStatus", modalStatus);
        fd.set("leadsGenerated", "40");
        fd.set("clientRevenueGenerated", String(Math.round(modalAmountHt * 4)));
        if (modalNotes) fd.set("notes", modalNotes);
        await addCommercialEntryAction(modalClientId, fd);
      }
      setIsModalOpen(false);
      router.refresh();
    });
  };

  // Bascule 1-clic du statut de paiement via setPaymentStatusAction
  const handleTogglePaymentStatus = (
    entry: EnrichedCommercialEntry,
    targetStatus?: PaymentStatusKey
  ) => {
    const current = optimisticStatuses[entry.id] ?? entry.paymentStatus;
    const next = targetStatus ?? NEXT_STATUS[current];
    setOptimisticStatuses((prev) => ({ ...prev, [entry.id]: next }));
    startTransition(async () => {
      await setPaymentStatusAction(entry.id, entry.clientId, next);
      router.refresh();
    });
  };

  const handleDeleteEntry = (entry: EnrichedCommercialEntry) => {
    startTransition(async () => {
      await deleteCommercialEntryAction(entry.id, entry.clientId);
      router.refresh();
    });
  };

  // Handler sauvegarde ClientRoiMetric
  const handleSaveRoiMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roiClientId) return;
    startTransition(async () => {
      const res = await upsertClientRoiMetricAction(roiClientId, {
        month: roiMonth,
        leadsGenerated: roiLeads,
        estimatedRevenue: roiRevenue,
        notes: roiNotes || undefined,
      });
      if (res.ok) {
        setRoiSavedToast(true);
        setTimeout(() => setRoiSavedToast(false), 2500);
        setRoiNotes("");
        router.refresh();
      }
    });
  };

  const totalPaidAllTime = allEntries
    .filter(
      (e) => (optimisticStatuses[e.id] ?? e.paymentStatus) === "PAID"
    )
    .reduce((s, e) => s + e.amountSoldHt, 0);

  const displayedMonthPaid =
    kpis.monthPaidHt > 0 ? kpis.monthPaidHt : totalPaidAllTime;

  return (
    <div className="space-y-8">
      {/* =====================================================================
          EN-TÊTE EXÉCUTIF & SWITCH RAPIDE D'AFFICHAGE
      ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: brandColors.secondary }}
            />
            Sprint 2 • Pilotage Financier & Performance Client
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Facturation & Suivi ROI
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ventilation par offre (`OfferType`), suivi des encaissements en 1 clic et saisie mensuelle des résultats clients (`ClientRoiMetric`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
            {[
              { key: "ALL", label: "Vue Complète" },
              { key: "BILLING", label: "Facturation & Offres" },
              { key: "ROI", label: "Suivi ROI Client" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveSection(tab.key as "ALL" | "BILLING" | "ROI")
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeSection === tab.key
                    ? "bg-white/15 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${brandColors.ctaClass}`}
          >
            <Plus className="h-4 w-4" />
            Nouvelle Prestation / Facture
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. BANDEAU SUPÉRIEUR : 4 CARTES KPIs (getWorkspaceKpisAction)
      ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 : CA encaissé (mois en cours) */}
        <div
          className="rounded-2xl border bg-slate-900/65 backdrop-blur-xl p-5 shadow-xl relative overflow-hidden"
          style={{ borderColor: `${brandColors.primary}55` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              CA Encaissé (Mois en cours)
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{
                background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`,
              }}
            >
              <Euro className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-white tabular-nums">
            {formatEur(displayedMonthPaid)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Facturé ce mois :{" "}
              <strong className="text-slate-200">
                {formatEur(kpis.monthRevenueHt)}
              </strong>
            </span>
            <span className="text-emerald-400 font-bold">
              Cumul payé : {formatEur(totalPaidAllTime)}
            </span>
          </div>
        </div>

        {/* KPI 2 : MRR Actif */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              MRR Actif Récurrent
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-[#00E676] tabular-nums">
            {formatEur(kpis.mrrHt)}
            <span className="text-xs font-semibold text-slate-400 ml-1">
              /mois
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            ARR Projeté :{" "}
            <strong className="text-white">
              {formatEur(kpis.mrrHt * 12)}
            </strong>{" "}
            HT/an
          </div>
        </div>

        {/* KPI 3 : En attente d'encaissement */}
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/65 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              En attente d&apos;encaissement
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
            {formatEur(kpis.pendingRevenueHt)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Factures <code className="text-amber-300">PENDING</code> &{" "}
            <code className="text-rose-400">OVERDUE</code> à encaisser
          </div>
        </div>

        {/* KPI 4 : Total des vues générées */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total des vues générées
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: `${brandColors.secondary}20`,
                borderColor: `${brandColors.secondary}55`,
                color: brandColors.secondary,
              }}
            >
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black text-white tabular-nums">
            {formatNum(kpis.totalViews)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Vidéos ce mois : {kpis.videosPublishedThisMonth}</span>
            <Link
              href="/dashboard/content"
              className="inline-flex items-center gap-1 font-bold hover:underline"
              style={{ color: brandColors.secondary }}
            >
              Content Tracker <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. GRAPHIQUE D'ÉVOLUTION DES REVENUS MENSUELS PAR TYPE D'OFFRE
      ===================================================================== */}
      {(activeSection === "ALL" || activeSection === "BILLING") && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <BarChart3 className="h-4 w-4 text-[#00E676]" />
                Répartition analytique du Chiffre d&apos;Affaires HT
              </div>
              <h2 className="text-lg font-extrabold text-white mt-0.5">
                Évolution des Revenus Mensuels ventilée par Offre (`OfferType`)
              </h2>
            </div>

            {/* Légende interactive des 5 OfferType */}
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(OFFER_META) as OfferTypeKey[]).map((key) => {
                const meta = OFFER_META[key];
                const total = totalsByOffer[key] || 0;
                const isSelected = offerFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setOfferFilter(isSelected ? "ALL" : key)
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-white bg-white/15 text-white border-white/30"
                        : "border-white/10 bg-black/30 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.colorHex }}
                    />
                    <span>{meta.shortLabel}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatEur(total)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barres empilées mensuelles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
            {monthlyChartData.sortedMonths.map(([ym, bucket]) => {
              const heightPct = Math.max(
                8,
                Math.round(
                  (bucket.total / monthlyChartData.maxMonthTotal) * 100
                )
              );

              return (
                <div
                  key={ym}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col justify-between space-y-3 hover:border-white/20 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      {formatMonthLabel(ym)}
                    </span>
                    <span className="text-xs font-extrabold text-white tabular-nums">
                      {formatEur(bucket.total)}
                    </span>
                  </div>

                  {/* Zone barre empilée verticale */}
                  <div className="h-36 flex items-end justify-center bg-slate-950/70 rounded-xl p-2 border border-white/5">
                    <div
                      className="w-full rounded-lg overflow-hidden flex flex-col-reverse transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    >
                      {(Object.keys(OFFER_META) as OfferTypeKey[]).map(
                        (offerKey) => {
                          const val = bucket[offerKey] || 0;
                          if (val <= 0 || bucket.total <= 0) return null;
                          const segPct = Math.max(
                            6,
                            Math.round((val / bucket.total) * 100)
                          );
                          return (
                            <div
                              key={offerKey}
                              title={`${OFFER_META[offerKey].label} : ${formatEur(val)}`}
                              style={{
                                height: `${segPct}%`,
                                backgroundColor: OFFER_META[offerKey].colorHex,
                              }}
                              className="w-full transition-all"
                            />
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Détail mini-badges du mois */}
                  <div className="space-y-1 min-h-[38px]">
                    {(Object.keys(OFFER_META) as OfferTypeKey[])
                      .filter((k) => bucket[k] > 0)
                      .slice(0, 2)
                      .map((k) => (
                        <div
                          key={k}
                          className="flex items-center justify-between text-[10px] text-slate-400"
                        >
                          <span className="truncate flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: OFFER_META[k].colorHex,
                              }}
                            />
                            {OFFER_META[k].shortLabel}
                          </span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {formatEur(bucket[k])}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. TABLEAU INTERACTIF DES COMMERCIALENTRY (FILTRES + 1-CLIC STATUT)
      ===================================================================== */}
      {(activeSection === "ALL" || activeSection === "BILLING") && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Journal des Factures & Prestations (`CommercialEntry`)
              </h2>
              <p className="text-xs text-slate-400">
                Cliquez directement sur le badge de statut (`PAID`, `PENDING`, `OVERDUE`) pour le basculer en 1 clic ou éditez la ligne.
              </p>
            </div>

            {/* Barre de Filtres */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                <Filter className="h-3.5 w-3.5 text-slate-400 ml-2 mr-1" />
                {(
                  [
                    { key: "ALL", label: "Tous" },
                    { key: "PAID", label: "Payé (PAID)" },
                    { key: "PENDING", label: "En attente (PENDING)" },
                    { key: "OVERDUE", label: "En retard (OVERDUE)" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStatusFilter(st.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      statusFilter === st.key
                        ? "bg-white/15 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value="ALL">Tous les clients ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Client & Portefeuille</th>
                  <th className="py-3 px-3">Prestation</th>
                  <th className="py-3 px-3">Offre (`OfferType`)</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Montant HT</th>
                  <th className="py-3 px-3 text-center">
                    Statut (1-Clic Toggle)
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredEntries.map((entry) => {
                  const currentStatus =
                    optimisticStatuses[entry.id] ?? entry.paymentStatus;
                  const offerMeta =
                    OFFER_META[entry.offer] || OFFER_META.SUR_MESURE;
                  const isAlsek = entry.workspace.slug === "ALSEK";

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-white/[0.03] transition"
                    >
                      <td className="py-3.5 px-3">
                        <Link
                          href={`/clients/${entry.clientId}`}
                          className="font-bold text-white hover:text-[#00E676] transition block"
                        >
                          {entry.clientName}
                        </Link>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isAlsek
                              ? "bg-[#1E3AFF]/20 text-[#00E676] border-[#1E3AFF]/40"
                              : "bg-[#4B0082]/30 text-[#D4AF37] border-[#D4AF37]/40"
                          }`}
                        >
                          {entry.workspace.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-bold text-slate-100">
                          {entry.productName}
                        </div>
                        {entry.notes && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {entry.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${offerMeta.badgeClass}`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: offerMeta.colorHex }}
                          />
                          {offerMeta.shortLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {entry.billingType === "RECURRING_MRR" ? (
                          <span className="inline-flex items-center rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                            MRR Mensuel
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                            One-Shot
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-black text-sm text-white tabular-nums">
                        {formatEur(entry.amountSoldHt)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleTogglePaymentStatus(entry)}
                            title="Cliquer pour basculer le statut (PAID ➔ OVERDUE ➔ PENDING)"
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition cursor-pointer ${
                              currentStatus === "PAID"
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                                : currentStatus === "PENDING"
                                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                                  : "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25"
                            }`}
                          >
                            {currentStatus === "PAID" && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            )}
                            {currentStatus === "PENDING" && (
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                            )}
                            {currentStatus === "OVERDUE" && (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                            )}
                            <span>{currentStatus}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            title="Modifier cette entrée"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry)}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
                            title="Supprimer cette entrée"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-slate-500"
                    >
                      Aucune entrée de facturation ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. SECTION SUIVI ROI CLIENT (ClientRoiMetric — upsertClientRoiMetricAction)
      ===================================================================== */}
      {(activeSection === "ALL" || activeSection === "ROI") && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Formulaire de saisie mensuelle ROI */}
          <div className="xl:col-span-5 rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})`,
                  }}
                >
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    Saisie Suivi ROI Client (`ClientRoiMetric`)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Enregistrez les leads et le CA mensuel généré par client
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveRoiMetric} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Client
                  </label>
                  <select
                    value={roiClientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setRoiClientId(id);
                      const found = clients.find((c) => c.id === id);
                      if (found) {
                        setRoiRevenue(
                          Math.round(roiLeads * found.avgBasketValue)
                        );
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} (Panier {c.avgBasketValue}€)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Mois (`YYYY-MM`)
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="month"
                      value={roiMonth}
                      onChange={(e) => setRoiMonth(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Leads / Réservations générés
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={roiLeads}
                    onChange={(e) => {
                      const leads = Number(e.target.value || 0);
                      setRoiLeads(leads);
                      const found = clients.find((c) => c.id === roiClientId);
                      if (found) {
                        setRoiRevenue(Math.round(leads * found.avgBasketValue));
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-black text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    CA Estimé Généré (€ HT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={roiRevenue}
                    onChange={(e) =>
                      setRoiRevenue(Number(e.target.value || 0))
                    }
                    required
                    className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2.5 text-sm font-black text-emerald-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Notes & Preuves terrain (optionnel)
                </label>
                <input
                  type="text"
                  value={roiNotes}
                  onChange={(e) => setRoiNotes(e.target.value)}
                  placeholder="Ex: 110 couverts réservés via le Reel Côte de Bœuf..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition cursor-pointer ${brandColors.ctaClass}`}
              >
                {roiSavedToast ? (
                  <>
                    <Check className="h-4 w-4" />
                    ROI Mensuel enregistré avec succès !
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Enregistrer / Mettre à jour le ROI Mensuel
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Historique des ClientRoiMetric */}
          <div className="xl:col-span-7 rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  Historique Mensuel `ClientRoiMetric` ({allRoiMetrics.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Données synchronisées avec la vue Rapport Client Partageable (`/share/[shareToken]`)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Mois</th>
                    <th className="py-2.5 px-3">Enseigne</th>
                    <th className="py-2.5 px-3 text-right">Leads Générés</th>
                    <th className="py-2.5 px-3 text-right">CA Client Estimé</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {allRoiMetrics.map((rm) => (
                    <tr key={rm.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {rm.month.slice(0, 7)}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {rm.clientName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-cyan-300 tabular-nums">
                        +{formatNum(rm.leadsGenerated)} leads
                      </td>
                      <td className="py-3 px-3 text-right font-black text-[#00E676] tabular-nums">
                        {formatEur(rm.estimatedRevenue)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                        {rm.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE D'AJOUT / ÉDITION D'UNE COMMERCIALENTRY
      ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0B1020] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingEntry
                    ? "Modifier la prestation (`CommercialEntry`)"
                    : "Nouvelle prestation (`CommercialEntry`)"}
                </h3>
                <p className="text-xs text-slate-400">
                  Sélectionnez une offre du catalogue `OfferType` ou personnalisez le montant
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              {!editingEntry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Client
                    </label>
                    <select
                      value={modalClientId}
                      onChange={(e) => setModalClientId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Workspace
                    </label>
                    <select
                      value={modalWorkspace}
                      onChange={(e) =>
                        setModalWorkspace(e.target.value as WorkspaceSlugType)
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <option value="ALSEK">Alsek Marketing</option>
                      <option value="VITRINE">Vitrine Caladoise</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sélecteur rapide OfferType */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Catalogue `OfferType`
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(OFFER_META) as OfferTypeKey[]).map((key) => {
                    const meta = OFFER_META[key];
                    const active = modalOffer === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOfferPreset(key)}
                        className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                          active
                            ? "border-white bg-white/15 text-white"
                            : "border-white/10 bg-slate-950/70 text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-extrabold">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.colorHex }}
                          />
                          {meta.shortLabel}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {meta.priceTag}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Libellé de la prestation
                </label>
                <input
                  type="text"
                  required
                  value={modalProductName}
                  onChange={(e) => setModalProductName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Montant HT (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={modalAmountHt}
                    onChange={(e) =>
                      setModalAmountHt(Number(e.target.value || 0))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-black text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Récurrence
                  </label>
                  <select
                    value={modalBillingType}
                    onChange={(e) =>
                      setModalBillingType(e.target.value as BillingTypeKey)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="RECURRING_MRR">Récurrent (MRR)</option>
                    <option value="ONE_SHOT">One-Shot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Statut
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) =>
                      setModalStatus(e.target.value as PaymentStatusKey)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="PAID">PAID (Payé)</option>
                    <option value="PENDING">PENDING (En attente)</option>
                    <option value="OVERDUE">OVERDUE (En retard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Notes internes / ROI constaté
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Ex: Virement reçu, campagne lancée..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition cursor-pointer ${brandColors.ctaClass}`}
                >
                  {editingEntry ? "Mettre à jour" : "Créer l'entrée"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
