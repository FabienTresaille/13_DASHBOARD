"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Euro,
  Eye,
  Sparkles,
  ArrowUpRight,
  Film,
  Users,
  Plus,
  Zap,
  Layers,
  ArrowRight,
  Compass,
} from "lucide-react";
import {
  cyclePaymentStatusAction,
  toggleClientWorkspaceAction,
  approveAutomationEventAction,
} from "@/app/actions";
import type {
  EnrichedClient360,
  EnrichedCommercialEntry,
  EnrichedTrackedPost,
  WorkspaceFilter,
} from "@/lib/db";
import type {
  AutomationEventRecord,
  PaymentStatusKey,
  WorkspaceRecord,
} from "@/lib/seed-data";
import { CreateClientModal } from "./CreateClientModal";

interface DashboardProps {
  workspaces: WorkspaceRecord[];
  activeFilter: WorkspaceFilter;
  clients: EnrichedClient360[];
  summary: {
    activeClientsCount: number;
    dualPortfolioCount: number;
    upsellOpportunitiesCount: number;
    totalSoldHt: number;
    totalPaidHt: number;
    totalPendingHt: number;
    totalOverdueHt: number;
    mrrHt: number;
    totalClientRevenue: number;
    totalLeads: number;
    globalRoiMultiplier: number;
    totalViews: number;
    totalLikes: number;
    totalTrackedPosts: number;
    alsekSalesHt: number;
    vitrineSalesHt: number;
    alsekClientsCount: number;
    vitrineClientsCount: number;
  };
  dualPortfolioClients: EnrichedClient360[];
  upsellCandidates: EnrichedClient360[];
  recentSales: EnrichedCommercialEntry[];
  topPosts: EnrichedTrackedPost[];
  recentAutomations: (AutomationEventRecord & { clientName: string })[];
}

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

const NEXT_STATUS_CYCLE: Record<PaymentStatusKey, PaymentStatusKey> = {
  PENDING: "PAID",
  PAID: "OVERDUE",
  OVERDUE: "PENDING",
};

export function DashboardClientView({
  activeFilter,
  clients,
  summary,
  dualPortfolioClients,
  upsellCandidates,
  recentSales,
  topPosts,
  recentAutomations,
}: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  // Optimistic UI pour le toggle instantané des statuts de paiement
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, PaymentStatusKey>
  >({});

  const handleCycleStatus = (
    entryId: string,
    currentStatus: PaymentStatusKey
  ) => {
    const nextStatus = NEXT_STATUS_CYCLE[currentStatus];
    setOptimisticStatuses((prev) => ({ ...prev, [entryId]: nextStatus }));
    startTransition(async () => {
      await cyclePaymentStatusAction(entryId);
      router.refresh();
    });
  };

  const handleActivateUpsell = (
    clientId: string,
    targetSlug: "ALSEK" | "VITRINE"
  ) => {
    startTransition(async () => {
      await toggleClientWorkspaceAction(clientId, targetSlug);
      router.refresh();
    });
  };

  const handleApproveEvent = (eventId: string, clientId: string) => {
    startTransition(async () => {
      await approveAutomationEventAction(eventId, clientId);
      router.refresh();
    });
  };

  const renderPaymentBadge = (
    rawStatus: PaymentStatusKey,
    entryId: string
  ) => {
    const status = optimisticStatuses[entryId] ?? rawStatus;
    const map: Record<
      PaymentStatusKey,
      { label: string; dot: string; classes: string }
    > = {
      PAID: {
        label: "Payé",
        dot: "🟢",
        classes:
          "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25",
      },
      PENDING: {
        label: "En attente",
        dot: "🟡",
        classes:
          "bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25",
      },
      OVERDUE: {
        label: "Retard",
        dot: "🔴",
        classes:
          "bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25",
      },
    };
    const item = map[status];
    return (
      <button
        type="button"
        onClick={() => handleCycleStatus(entryId, status)}
        title="Cliquer pour changer le statut instantanément (Optimistic UI)"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${item.classes}`}
      >
        <span>{item.dot}</span>
        <span>{item.label}</span>
      </button>
    );
  };

  const maxClientRevenue = Math.max(
    ...clients.map((c) => c.kpis.totalClientRevenue),
    1000
  );

  // Pourcentages pour la barre de répartition Payé vs En attente vs Retard
  const totalFactureSafe = Math.max(summary.totalSoldHt, 1);
  const paidPct = Math.round((summary.totalPaidHt / totalFactureSafe) * 100);
  const pendingPct = Math.round(
    (summary.totalPendingHt / totalFactureSafe) * 100
  );
  const overduePct = Math.max(0, 100 - paidPct - pendingPct);

  // Clients présents uniquement chez Vitrine Caladoise (cibles prioritaires Vitrine -> Alsek)
  const vitrineToAlsekCandidates = upsellCandidates.filter(
    (c) => c.upsellTarget === "ALSEK"
  );
  const alsekToVitrineCandidates = upsellCandidates.filter(
    (c) => c.upsellTarget === "VITRINE"
  );

  // Palette dynamique selon le Workspace actif
  const heroBorder =
    activeFilter === "ALSEK"
      ? "border-blue-500/30 from-blue-950/40 via-slate-900/60 to-cyan-950/20"
      : activeFilter === "VITRINE"
        ? "border-amber-500/30 from-amber-950/40 via-stone-900/60 to-orange-950/20"
        : "border-white/10 from-indigo-950/35 via-slate-900/60 to-emerald-950/20";

  return (
    <div className="space-y-7">
      {/* Hero Banner Caméléon */}
      <div
        className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${heroBorder} backdrop-blur-xl p-6 sm:p-8 shadow-2xl transition-all duration-300`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                {activeFilter === "ALL"
                  ? "Mode Executive Holding • Consolidation Multi-Marques"
                  : activeFilter === "ALSEK"
                    ? "Mode Tech & Performance • Alsek Marketing (app.alsek.fr)"
                    : "Mode Média Local & Terroir • Vitrine Caladoise (pro.vitrine-caladoise.fr)"}
              </span>
              {activeFilter === "VITRINE" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                  <Compass className="h-3 w-3" />
                  Calade & Beaujolais
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cockpit Exécutif & Rentabilité Client Temps Réel
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed">
              Zéro PDF : pilotez votre facturation HT en 1 clic, démontrez le multiplicateur de ROI généré en rendez-vous client et convertissez vos commerçants entre Vitrine Caladoise et Alsek Marketing.
            </p>
          </div>

          {/* Cartes Marques & CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {(activeFilter === "ALL" || activeFilter === "ALSEK") && (
              <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-600/10 backdrop-blur-md px-4 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-alsek.png"
                  alt="Alsek Marketing"
                  className="h-8 w-auto object-contain"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Alsek Marketing
                  </div>
                  <div className="text-[11px] font-semibold text-cyan-300 tabular-nums">
                    {formatEur(summary.alsekSalesHt)} HT
                  </div>
                </div>
              </div>
            )}

            {(activeFilter === "ALL" || activeFilter === "VITRINE") && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-4 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-vitrine.png"
                  alt="Vitrine Caladoise"
                  className="h-8 w-auto object-contain rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Vitrine Caladoise
                  </div>
                  <div className="text-[11px] font-semibold text-amber-300 tabular-nums">
                    {formatEur(summary.vitrineSalesHt)} HT
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsNewClientOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-extrabold text-slate-950 shadow-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouveau Client
            </button>
          </div>
        </div>
      </div>

      {/* BENTO GRID : 4 KPI CARDS MODERNES AVEC SPARKLINES & BARRES DE RÉPARTITION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Bento 1 : CA Facturé HT + Barre de progression Payé vs En attente */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              CA Facturé HT ({activeFilter === "ALL" ? "Holding" : activeFilter})
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
              MRR : {formatEur(summary.mrrHt)}/m
            </span>
          </div>

          <div className="my-3 flex items-end justify-between gap-2">
            <div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                {formatEur(summary.totalSoldHt)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {paidPct}% encaissé ({formatEur(summary.totalPaidHt)})
              </div>
            </div>
            {/* Mini Sparkline SVG */}
            <svg className="h-10 w-24 shrink-0 overflow-visible" viewBox="0 0 100 36">
              <defs>
                <linearGradient id="sparkBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
              <path
                d="M 2 30 Q 25 26, 42 18 T 75 12 T 98 4"
                fill="none"
                stroke="url(#sparkBlue)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Barre de progression visuelle Payé vs En attente vs Retard */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${paidPct}%` }}
                className="h-full bg-emerald-500 transition-all"
                title={`Payé : ${formatEur(summary.totalPaidHt)}`}
              />
              <div
                style={{ width: `${pendingPct}%` }}
                className="h-full bg-amber-400 transition-all"
                title={`En attente : ${formatEur(summary.totalPendingHt)}`}
              />
              <div
                style={{ width: `${overduePct}%` }}
                className="h-full bg-rose-500 transition-all"
                title={`En retard : ${formatEur(summary.totalOverdueHt)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-emerald-400">
                🟢 {formatEur(summary.totalPaidHt)}
              </span>
              <span className="text-amber-300">
                🟡 {formatEur(summary.totalPendingHt)}
              </span>
              <span className="text-rose-400">
                🔴 {formatEur(summary.totalOverdueHt)}
              </span>
            </div>
          </div>
        </div>

        {/* Bento 2 : CA Généré pour les Clients + Badge ROI Moyen Client */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl group-hover:bg-emerald-500/25 transition" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              CA Généré Clients
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-black text-emerald-300 shadow-sm">
              <TrendingUp className="h-3 w-3" />
              ROI Moyen Client : x{summary.globalRoiMultiplier}
            </span>
          </div>

          <div className="my-3 flex items-end justify-between gap-2">
            <div>
              <div className="text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
                {formatEur(summary.totalClientRevenue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Valeur directe créée chez vos commerçants
              </div>
            </div>
            <svg className="h-10 w-24 shrink-0 overflow-visible" viewBox="0 0 100 36">
              <path
                d="M 2 32 Q 30 28, 50 16 T 98 3"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
            <span className="text-slate-400">Nouveaux clients / réservations :</span>
            <span className="font-extrabold text-white tabular-nums">
              +{formatNum(summary.totalLeads)} apports
            </span>
          </div>
        </div>

        {/* Bento 3 : Total Vues Vidéos (Content Tracker) */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl group-hover:bg-amber-500/25 transition" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Vues Vidéos
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
              <Eye className="h-3 w-3" />
              {summary.totalTrackedPosts} Reels/Shorts
            </span>
          </div>

          <div className="my-3 flex items-end justify-between gap-2">
            <div>
              <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                {formatNum(summary.totalViews)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Audience organique & sponsorisée locale
              </div>
            </div>
            <svg className="h-10 w-24 shrink-0 overflow-visible" viewBox="0 0 100 36">
              <path
                d="M 2 29 C 22 28, 38 22, 58 14 C 74 8, 86 7, 98 2"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
            <span className="text-slate-400">Interactions J&apos;aime cumulées :</span>
            <span className="font-extrabold text-amber-300 tabular-nums">
              {formatNum(summary.totalLikes)} ♥
            </span>
          </div>
        </div>

        {/* Bento 4 : Clients Actifs & Synergie Multi-Portefeuille */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/15 blur-2xl group-hover:bg-indigo-500/25 transition" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Clients Actifs & Synergie
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/35 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
              <Users className="h-3 w-3" />
              {summary.dualPortfolioCount} en Double Portefeuille
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tabular-nums tracking-tight">
              {summary.activeClientsCount}{" "}
              <span className="text-sm font-semibold text-slate-400">
                enseignes actives
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {summary.upsellOpportunitiesCount} opportunité(s) d&apos;upsell prête(s) à closer
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-white/10">
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${Math.round(
                    (summary.alsekClientsCount /
                      Math.max(
                        summary.alsekClientsCount + summary.vitrineClientsCount,
                        1
                      )) *
                      100
                  )}%`,
                }}
              />
              <div className="h-full flex-1 bg-amber-500" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-cyan-400">
                Alsek : {summary.alsekClientsCount}
              </span>
              <span className="text-amber-400">
                Vitrine : {summary.vitrineClientsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WIDGET VEDETTE : OPPORTUNITÉS D'UPSELL (VITRINE ➔ ALSEK) */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/70 to-blue-950/35 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/35 px-3 py-0.5 text-[11px] font-extrabold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Pont de Croissance Interne
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex flex-wrap items-center gap-2">
              <span>Opportunités d&apos;Upsell (Vitrine Caladoise</span>
              <ArrowRight className="h-5 w-5 text-cyan-400" />
              <span className="text-cyan-400">Alsek Marketing)</span>
            </h2>
            <p className="text-xs text-slate-300">
              Ces commerçants performent sur le média local{" "}
              <strong className="text-amber-300">Vitrine Caladoise</strong> mais n&apos;ont pas encore d&apos;accompagnement agence récurrent chez{" "}
              <strong className="text-cyan-300">Alsek Marketing</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-300">
              ✓ {dualPortfolioClients.length} client(s) déjà converti(s) en Double Portefeuille
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vitrineToAlsekCandidates.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-white/15 bg-slate-950/60 p-4 flex flex-col justify-between gap-4 hover:border-cyan-500/50 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-amber-500/20 border border-amber-500/35 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                    VITRINE SEUL
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    ROI actuel x{client.kpis.roiMultiplier}
                  </span>
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="text-base font-extrabold text-white hover:text-cyan-400 transition block"
                >
                  {client.companyName}
                </Link>
                <p className="text-xs text-slate-400">
                  {client.sector} •{" "}
                  <strong className="text-white">
                    {formatNum(client.kpis.totalViews)} vues
                  </strong>{" "}
                  et{" "}
                  <strong className="text-emerald-300">
                    {formatEur(client.kpis.totalClientRevenue)}
                  </strong>{" "}
                  générés via Vitrine.
                </p>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleActivateUpsell(client.id, "ALSEK")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-600/25 transition cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                Activer chez Alsek en 1 clic
              </button>
            </div>
          ))}

          {alsekToVitrineCandidates.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-white/15 bg-slate-950/60 p-4 flex flex-col justify-between gap-4 hover:border-amber-500/50 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-blue-600/20 border border-blue-500/35 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300">
                    ALSEK SEUL → CROSS-SELL MÉDIA
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    ROI actuel x{client.kpis.roiMultiplier}
                  </span>
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="text-base font-extrabold text-white hover:text-amber-400 transition block"
                >
                  {client.companyName}
                </Link>
                <p className="text-xs text-slate-400">
                  {client.sector} •{" "}
                  <strong className="text-emerald-300">
                    {formatEur(client.kpis.totalClientRevenue)}
                  </strong>{" "}
                  générés. Idéal pour un reportage sponsorisé sur Vitrine Caladoise.
                </p>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleActivateUpsell(client.id, "VITRINE")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-amber-600/25 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Activer sur Vitrine en 1 clic
              </button>
            </div>
          ))}

          {dualPortfolioClients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                    ★ PONT D&apos;UPSELL ACTIF
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    ROI x{client.kpis.roiMultiplier}
                  </span>
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="text-base font-extrabold text-white hover:underline block"
                >
                  {client.companyName}
                </Link>
                <p className="text-xs text-slate-300">
                  Présent sur <strong className="text-amber-300">Vitrine</strong> +{" "}
                  <strong className="text-cyan-300">Alsek</strong> •{" "}
                  {formatEur(client.kpis.totalSoldHt)} HT facturés pour{" "}
                  <strong className="text-emerald-300">
                    {formatEur(client.kpis.totalClientRevenue)}
                  </strong>{" "}
                  de CA généré.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/p/${client.shareToken}?brand=vitrine`}
                  target="_blank"
                  className="rounded-xl border border-amber-500/35 bg-amber-500/15 py-2 text-center text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition"
                >
                  Portail Vitrine ↗
                </Link>
                <Link
                  href={`/p/${client.shareToken}?brand=alsek`}
                  target="_blank"
                  className="rounded-xl border border-blue-500/35 bg-blue-600/15 py-2 text-center text-[11px] font-bold text-cyan-300 hover:bg-blue-600/25 transition"
                >
                  Portail Alsek ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Basse : Rentabilité par Client + Suivi Commercial & Vidéos */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Suivi Commercial Éclair & Toggle Paiement Optimistic UI (7 cols) */}
        <div className="xl:col-span-7 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-white">
                Suivi Commercial & ROI en Ligne (Zéro PDF)
              </h2>
              <p className="text-xs text-slate-400">
                Cliquez sur une pastille (🟢 Payé / 🟡 En attente / 🔴 Retard) pour changer son statut instantanément.
              </p>
            </div>
            <Link
              href="/clients"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              Tous les dossiers <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Vue Cartes Mobile (< sm) sans scroll horizontal cassé */}
          <div className="sm:hidden space-y-3">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/clients/${sale.clientId}?tab=commercial`}
                      className="text-sm font-extrabold text-white"
                    >
                      {sale.clientName}
                    </Link>
                    <p className="text-xs text-slate-400">{sale.productName}</p>
                  </div>
                  {renderPaymentBadge(sale.paymentStatus, sale.id)}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <span className="font-bold text-white tabular-nums">
                    Facturé : {formatEur(sale.amountSoldHt)} HT
                  </span>
                  <span className="font-extrabold text-emerald-400 tabular-nums">
                    CA Client : {formatEur(sale.clientRevenueGenerated)} (x
                    {sale.roiMultiplier})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Vue Tableau Desktop (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-3">Client & Prestation</th>
                  <th className="py-3 px-3">Marque</th>
                  <th className="py-3 px-3 text-right">Facturé HT</th>
                  <th className="py-3 px-3 text-right">CA Client (ROI)</th>
                  <th className="py-3 pl-3 text-right">Statut (1-Clic)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {recentSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-white/[0.03] transition"
                  >
                    <td className="py-3.5 pr-3">
                      <Link
                        href={`/clients/${sale.clientId}?tab=commercial`}
                        className="font-bold text-white hover:text-cyan-400 block"
                      >
                        {sale.clientName}
                      </Link>
                      <span className="text-slate-400 text-[11px] block">
                        {sale.productName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          sale.workspace.slug === "ALSEK"
                            ? "bg-blue-600/15 text-cyan-300 border-blue-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {sale.workspace.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-white tabular-nums">
                      {formatEur(sale.amountSoldHt)}
                    </td>
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <span className="font-extrabold text-emerald-400 block">
                        {formatEur(sale.clientRevenueGenerated)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ROI x{sale.roiMultiplier} • {sale.leadsGenerated} leads
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      {renderPaymentBadge(sale.paymentStatus, sale.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barres de Rentabilité par Client */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Comparatif Investissement HT vs CA Généré par Enseigne
            </div>
            {clients.map((client) => {
              const revPct = Math.min(
                100,
                Math.max(
                  14,
                  Math.round(
                    (client.kpis.totalClientRevenue / maxClientRevenue) * 100
                  )
                )
              );
              return (
                <div
                  key={client.id}
                  className="rounded-xl border border-white/10 bg-slate-950/40 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-extrabold text-white hover:text-cyan-400"
                    >
                      {client.companyName}{" "}
                      <span className="text-slate-500 font-normal">
                        ({formatEur(client.kpis.totalSoldHt)} HT investi)
                      </span>
                    </Link>
                    <span className="font-black text-emerald-400 tabular-nums">
                      {formatEur(client.kpis.totalClientRevenue)} générés (x
                      {client.kpis.roiMultiplier})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${revPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne Droite : Top Vidéos & Timeline Automatisations IA (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-cyan-400" />
              Top Vidéos Trackées par Lien
            </h2>

            <div className="space-y-2.5">
              {topPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-3 hover:border-white/20 transition"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                        {post.platform}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          post.workspace.slug === "ALSEK"
                            ? "bg-blue-600/20 text-cyan-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {post.workspace.slug}
                      </span>
                      <Link
                        href={`/clients/${post.clientId}?tab=content`}
                        className="text-xs font-bold text-slate-300 hover:text-white truncate"
                      >
                        {post.clientName}
                      </Link>
                    </div>
                    <p className="text-xs text-slate-200 truncate">
                      {post.titleOrHook}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-white tabular-nums">
                      {formatNum(post.latestMetric.views)} vues
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      {post.latestMetric.engagementRate}% eng. •{" "}
                      {formatNum(post.latestMetric.likes)} ♥
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flux des Automatisations IA */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Activité Temps Réel des Plugins IA
            </h2>

            <div className="space-y-2.5">
              {recentAutomations.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-xl border border-white/10 bg-slate-950/50 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded">
                      {evt.moduleType}
                    </span>
                    {evt.status === "PENDING_APPROVAL" ? (
                      <button
                        type="button"
                        onClick={() => handleApproveEvent(evt.id, evt.clientId)}
                        className="rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950 transition cursor-pointer"
                      >
                        Approuver en 1 clic
                      </button>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {evt.status}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/clients/${evt.clientId}?tab=modules`}
                    className="text-xs font-bold text-white hover:text-cyan-400 block"
                  >
                    {evt.clientName} — {evt.title}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CreateClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        defaultWorkspace={activeFilter}
      />
    </div>
  );
}
