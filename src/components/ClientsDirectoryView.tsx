"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Building2,
  MapPin,
  TrendingUp,
  Eye,
  Euro,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Cpu,
  CheckCircle2,
  Globe,
  Instagram,
  Copy,
  Check,
} from "lucide-react";
import type { EnrichedClient360, WorkspaceFilter } from "@/lib/db";
import { toggleClientWorkspaceAction } from "@/app/actions";
import { CreateClientModal } from "./CreateClientModal";

interface ClientsDirectoryViewProps {
  clients: EnrichedClient360[];
  activeWorkspace: WorkspaceFilter;
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

export function ClientsDirectoryView({
  clients,
  activeWorkspace,
}: ClientsDirectoryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState<
    "ALL" | "ALSEK" | "VITRINE" | "DUAL"
  >("ALL");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyShareLink = (shareToken: string) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://app.alsek.fr";
    const url = `${origin}/share/${shareToken}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedToken(shareToken);
    setTimeout(() => setCopiedToken(null), 2200);
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.companyName.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      (c.nafCode && c.nafCode.toLowerCase().includes(q)) ||
      (c.contactName && c.contactName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (portfolioFilter === "DUAL") return c.isDualPortfolio;
    if (portfolioFilter === "ALSEK")
      return c.workspaces.some((w) => w.workspace.slug === "ALSEK");
    if (portfolioFilter === "VITRINE")
      return c.workspaces.some((w) => w.workspace.slug === "VITRINE");

    return true;
  });

  const handleToggleWorkspace = (
    clientId: string,
    slug: "ALSEK" | "VITRINE"
  ) => {
    startTransition(async () => {
      await toggleClientWorkspaceAction(clientId, slug);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Portefeuille Clients 360° ({filteredClients.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gérez vos clients Alsek Marketing, vos commerçants Vitrine Caladoise et activez les ponts d&apos;upsell en 1 clic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewClientOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
        >
          <Plus className="h-4 w-4" />
          Nouveau Client
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-[#0B1120] p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par enseigne, secteur, code NAF, ville, dirigeant..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "Tous les clients" },
            { key: "ALSEK", label: "Alsek Marketing" },
            { key: "VITRINE", label: "Vitrine Caladoise" },
            { key: "DUAL", label: "★ Double Portefeuille" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setPortfolioFilter(
                  tab.key as "ALL" | "ALSEK" | "VITRINE" | "DUAL"
                )
              }
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                portfolioFilter === tab.key
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {filteredClients.map((client) => {
          const activeModulesCount = client.addonModules.filter(
            (m) => m.isEnabled
          ).length;

          return (
            <div
              key={client.id}
              className="group rounded-2xl border border-slate-800/90 bg-[#0B1120] hover:border-slate-700 transition flex flex-col justify-between overflow-hidden shadow-lg"
            >
              <div className="p-5 space-y-4">
                {/* Top Badges : Workspaces & Upsell */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {client.workspaces.map((w) => (
                      <span
                        key={w.workspace.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          w.workspace.slug === "ALSEK"
                            ? "bg-blue-600/15 text-blue-300 border-blue-500/35"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/35"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            w.workspace.slug === "ALSEK"
                              ? "bg-blue-400"
                              : "bg-amber-400"
                          }`}
                        />
                        {w.workspace.name}
                      </span>
                    ))}

                    {client.isDualPortfolio && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                        <Sparkles className="h-3 w-3" />
                        Shared
                      </span>
                    )}
                  </div>

                  {client.upsellTarget && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleToggleWorkspace(client.id, client.upsellTarget!)
                      }
                      title="Rattacher en 1 clic au second portefeuille (Pont d'Upsell)"
                      className="rounded-lg border border-dashed border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition"
                    >
                      + Pont {client.upsellTarget}
                    </button>
                  )}
                </div>

                {/* Company Identity */}
                <div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-lg font-extrabold text-white group-hover:text-blue-400 transition block"
                  >
                    {client.companyName}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{client.sector}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      {client.city}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {client.nafCode && (
                      <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 font-mono">
                        NAF: {client.nafCode}
                      </span>
                    )}
                    {client.employeeCount !== null && (
                      <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5">
                        {client.employeeCount} salarié(s)
                      </span>
                    )}
                    <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5">
                      Panier moy. {client.avgBasketValue} €
                    </span>
                  </div>
                </div>

                {/* Score Visibilité T0 -> Actuel */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Score Visibilité (Audit T0 → Actuel)
                    </span>
                    <span className="font-bold text-emerald-400">
                      {client.kpis.visibilityScoreT0}/100 →{" "}
                      {client.kpis.visibilityScoreCurrent}/100 (+
                      {client.kpis.visibilityDelta} pts)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-slate-600"
                      style={{ width: `${client.kpis.visibilityScoreT0}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.max(0, client.kpis.visibilityDelta)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3 KPIs : Facturé HT, CA Généré & Vues */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-2.5">
                    <div className="text-[10px] uppercase text-slate-400">
                      Facturé HT
                    </div>
                    <div className="text-sm font-extrabold text-white mt-0.5 tabular-nums">
                      {formatEur(client.kpis.totalSoldHt)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                    <div className="text-[10px] uppercase text-emerald-400">
                      CA Client (x{client.kpis.roiMultiplier})
                    </div>
                    <div className="text-sm font-extrabold text-emerald-300 mt-0.5 tabular-nums">
                      {formatEur(client.kpis.totalClientRevenue)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-2.5">
                    <div className="text-[10px] uppercase text-slate-400">
                      Vues Vidéos
                    </div>
                    <div className="text-sm font-extrabold text-amber-300 mt-0.5 tabular-nums">
                      {formatNum(client.kpis.totalViews)}
                    </div>
                  </div>
                </div>

                {/* Modules IA & Liens Sociaux */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-indigo-300">
                    <Cpu className="h-3.5 w-3.5" />
                    {activeModulesCount}/4 Modules IA actifs
                  </span>
                  <span className="text-slate-500">
                    {client.trackedPosts.length} vidéo(s) •{" "}
                    {client.commercialEntries.length} vente(s)
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-900/60 px-5 py-3 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(client.shareToken)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#00E676]/40 bg-[#1E3AFF]/20 hover:bg-[#1E3AFF]/35 px-2.5 py-1 text-[11px] font-bold text-[#00E676] transition cursor-pointer"
                    title={`/share/${client.shareToken}`}
                  >
                    {copiedToken === client.shareToken ? (
                      <>
                        <Check className="h-3 w-3" />
                        Lien copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copier le lien rapport client
                      </>
                    )}
                  </button>
                  <Link
                    href={`/share/${client.shareToken}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white"
                    title="Ouvrir le Rapport Client Partageable (/share)"
                  >
                    Ouvrir <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition shrink-0"
                >
                  Fiche 360°
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <CreateClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        defaultWorkspace={activeWorkspace}
      />
    </div>
  );
}
