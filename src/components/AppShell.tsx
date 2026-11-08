"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Plus,
  Sparkles,
  ChevronDown,
  Building2,
  Activity,
  Menu,
  X,
  ArrowUpRight,
  Compass,
} from "lucide-react";
import { setActiveWorkspaceAction } from "@/app/actions";
import type { WorkspaceFilter } from "@/lib/db";
import { CreateClientModal } from "./CreateClientModal";

interface AppShellProps {
  children: React.ReactNode;
  activeWorkspace: WorkspaceFilter;
  clientsQuickList: {
    id: string;
    companyName: string;
    sector: string;
    shareToken: string;
    isDualPortfolio: boolean;
    workspaces: string[];
  }[];
}

const WORKSPACE_THEMES: Record<
  WorkspaceFilter,
  {
    label: string;
    sublabel: string;
    domain: string;
    tagline: string;
    bgCanvas: string;
    sidebarBg: string;
    headerBg: string;
    ambientGlow: string;
    accentHex: string;
    secondaryHex: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    dotColor: string;
    ctaGradient: string;
    activePillBg: string;
    logoUrl: string | null;
  }
> = {
  ALL: {
    label: "Vue Globale (Holding)",
    sublabel: "Alsek Marketing + Vitrine Caladoise",
    domain: "holding.alsek-pulse.fr",
    tagline: "Consolidation Financière & Multi-Portefeuille",
    bgCanvas: "bg-[#090D16]",
    sidebarBg: "bg-[#070A12]/95",
    headerBg: "bg-[#090D16]/80",
    ambientGlow:
      "radial-gradient(circle at 15% 0%, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08) 40%, transparent 70%)",
    accentHex: "#10B981",
    secondaryHex: "#6366F1",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-300",
    dotColor: "bg-emerald-400",
    ctaGradient:
      "bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 shadow-indigo-500/20",
    activePillBg: "bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md",
    logoUrl: "/logo-alsek.png",
  },
  ALSEK: {
    label: "Alsek Marketing",
    sublabel: "Tech & Performance Agency",
    domain: "app.alsek.fr",
    tagline: "Production Reels, Création Web & Meta Ads B2B",
    bgCanvas: "bg-[#0A0A0F]",
    sidebarBg: "bg-[#07070C]/95",
    headerBg: "bg-[#0A0A0F]/80",
    ambientGlow:
      "radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.14), rgba(6, 182, 212, 0.08) 45%, transparent 70%)",
    accentHex: "#2563EB",
    secondaryHex: "#06B6D4",
    badgeBg: "bg-blue-600/15",
    badgeBorder: "border-blue-500/40",
    badgeText: "text-cyan-300",
    dotColor: "bg-cyan-400",
    ctaGradient:
      "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-600/25",
    activePillBg: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md",
    logoUrl: "/logo-alsek.png",
  },
  VITRINE: {
    label: "Vitrine Caladoise",
    sublabel: "Média Local & Terroir Premium",
    domain: "pro.vitrine-caladoise.fr",
    tagline: "Ancrage Local Calade & Beaujolais • Commerces & Artisans",
    bgCanvas: "bg-[#100C08]",
    sidebarBg: "bg-[#0C0906]/95",
    headerBg: "bg-[#100C08]/80",
    ambientGlow:
      "radial-gradient(circle at 20% 0%, rgba(217, 119, 6, 0.15), rgba(234, 88, 12, 0.09) 45%, transparent 70%)",
    accentHex: "#D97706",
    secondaryHex: "#EA580C",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/40",
    badgeText: "text-amber-300",
    dotColor: "bg-amber-400",
    ctaGradient:
      "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/25",
    activePillBg: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md",
    logoUrl: "/logo-vitrine.png",
  },
};

export function AppShell({
  children,
  activeWorkspace,
  clientsQuickList,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  if (pathname?.startsWith("/p/")) {
    return <>{children}</>;
  }

  const currentTheme = WORKSPACE_THEMES[activeWorkspace] || WORKSPACE_THEMES.ALL;

  const handleSelectWorkspace = (ws: WorkspaceFilter) => {
    setSwitcherOpen(false);
    setMobileMenuOpen(false);
    startTransition(async () => {
      await setActiveWorkspaceAction(ws);
      router.refresh();
    });
  };

  const navItems = [
    {
      label: "Dashboard & Bento KPIs",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "Portefeuille Clients 360°",
      href: "/clients",
      icon: Users,
      active: pathname === "/clients" || pathname?.startsWith("/clients/"),
    },
  ];

  return (
    <div
      data-workspace={activeWorkspace}
      className={`min-h-screen ${currentTheme.bgCanvas} text-slate-100 flex flex-col lg:flex-row transition-colors duration-300 relative`}
    >
      {/* Halo Caméléon Dynamique en arrière-plan */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
        style={{ background: currentTheme.ambientGlow }}
      />

      {/* Header Mobile & Tablette (Mode Terrain) */}
      <div
        className={`lg:hidden flex items-center justify-between border-b border-white/10 ${currentTheme.headerBg} backdrop-blur-xl px-4 py-3 sticky top-0 z-30 transition-colors duration-300`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${currentTheme.dotColor}`}
          />
          <span className="font-extrabold text-sm tracking-tight text-white truncate">
            ALSEK PULSE
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate ${currentTheme.badgeBg} ${currentTheme.badgeBorder} ${currentTheme.badgeText}`}
          >
            {currentTheme.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewClientOpen(true)}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white ${currentTheme.ctaGradient}`}
          >
            + Client
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 transition"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Caméléon (Drawer fluide sur mobile, Sticky sur Desktop) */}
      <aside
        className={`${
          mobileMenuOpen
            ? "fixed inset-y-0 left-0 z-40 w-80 translate-x-0 shadow-2xl"
            : "fixed inset-y-0 left-0 z-40 w-80 -translate-x-full lg:translate-x-0"
        } lg:sticky lg:top-0 lg:h-screen lg:w-72 flex flex-col shrink-0 border-r border-white/10 ${currentTheme.sidebarBg} backdrop-blur-2xl select-none transition-all duration-300`}
      >
        {/* Bandeau Supérieur d'identité de Workspace */}
        <div
          className="h-1 w-full transition-colors duration-300"
          style={{
            background: `linear-gradient(90deg, ${currentTheme.accentHex}, ${currentTheme.secondaryHex})`,
          }}
        />

        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3.5 px-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs text-white shadow-lg transition-colors duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.accentHex}, ${currentTheme.secondaryHex})`,
                }}
              >
                AP
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    ALSEK PULSE
                  </span>
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {activeWorkspace === "VITRINE"
                    ? "Média Calade & Beaujolais"
                    : activeWorkspace === "ALSEK"
                      ? "Tech & Growth Agency"
                      : "Holding Multi-Marques"}
                </p>
              </div>
            </Link>

            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* WORKSPACE SWITCHER CAMÉLÉON */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen(!switcherOpen)}
              disabled={isPending}
              className={`w-full flex items-center justify-between rounded-2xl border p-3 text-left transition-all duration-300 ${currentTheme.badgeBg} ${currentTheme.badgeBorder} hover:border-white/30`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentTheme.dotColor}`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${currentTheme.dotColor}`}
                  />
                </span>
                <div className="truncate">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Portefeuille Actif
                  </div>
                  <div className="text-xs font-extrabold text-white truncate">
                    {currentTheme.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate font-mono">
                    {currentTheme.domain}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-300 shrink-0 transition-transform duration-200 ${
                  switcherOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {switcherOpen && (
              <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-white/15 bg-[#0D1322]/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-1">
                {(["ALL", "ALSEK", "VITRINE"] as WorkspaceFilter[]).map(
                  (wsKey) => {
                    const theme = WORKSPACE_THEMES[wsKey];
                    const isSelected = activeWorkspace === wsKey;
                    return (
                      <button
                        key={wsKey}
                        type="button"
                        onClick={() => handleSelectWorkspace(wsKey)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "bg-white/10 text-white border border-white/15"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${theme.dotColor}`}
                          />
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">
                              {theme.label}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {theme.sublabel}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white shrink-0">
                            Actif
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA Nouveau Client */}
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setIsNewClientOpen(true);
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-300 cursor-pointer ${currentTheme.ctaGradient}`}
          >
            <Plus className="h-4 w-4" />
            Nouveau Client 360°
          </button>
        </div>

        {/* Navigation Principale */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cockpit Exécutif
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                    item.active
                      ? "bg-white/10 text-white border border-white/15 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={
                      item.active ? { color: currentTheme.accentHex } : undefined
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Accès Direct Fiches Clients 360° */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Accès Direct Enseignes
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {clientsQuickList.length}
              </span>
            </div>
            <div className="space-y-1">
              {clientsQuickList.map((client) => {
                const isClientActive = pathname === `/clients/${client.id}`;
                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                      isClientActive
                        ? "bg-white/10 text-white border border-white/15"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-300" />
                      <span className="truncate font-medium">
                        {client.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {client.workspaces.includes("ALSEK") && (
                        <span
                          title="Alsek Marketing"
                          className="h-2 w-2 rounded-full bg-blue-500"
                        />
                      )}
                      {client.workspaces.includes("VITRINE") && (
                        <span
                          title="Vitrine Caladoise"
                          className="h-2 w-2 rounded-full bg-amber-500"
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Simulateur Portail Client White-Label */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Portail Public White-Label</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Testez l&apos;interface vue par le commerçant sur son mobile :
            </p>
            <div className="space-y-1.5">
              <Link
                href="/p/bistrot-caladois?brand=alsek"
                target="_blank"
                className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-[11px] font-bold text-cyan-300 hover:bg-blue-600/20 transition"
              >
                <span>app.alsek.fr</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/p/bistrot-caladois?brand=vitrine"
                target="_blank"
                className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <span>pro.vitrine-caladoise.fr</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* Footer Statut Système */}
        <div className="p-3.5 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-300">
                Mode Terrain Ready
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Activity className="h-3 w-3" />
              Live Sync
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        {/* Top Context Bar Desktop */}
        <header
          className={`hidden lg:flex items-center justify-between border-b border-white/10 ${currentTheme.headerBg} backdrop-blur-xl px-8 py-3.5 sticky top-0 z-20 transition-colors duration-300`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors duration-300 ${currentTheme.badgeBg} ${currentTheme.badgeBorder} ${currentTheme.badgeText}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${currentTheme.dotColor}`}
              />
              {currentTheme.label}
            </span>
            <span className="text-xs text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">
              {currentTheme.tagline}
            </span>
            {activeWorkspace === "VITRINE" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-[11px] font-bold text-orange-300">
                <Compass className="h-3 w-3" />
                Ancrage Calade & Beaujolais
              </span>
            )}
          </div>

          {/* Switcher Rapide dans la Topbar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
              {(["ALL", "ALSEK", "VITRINE"] as WorkspaceFilter[]).map((ws) => {
                const active = activeWorkspace === ws;
                const theme = WORKSPACE_THEMES[ws];
                const label =
                  ws === "ALL"
                    ? "Holding (Global)"
                    : ws === "ALSEK"
                      ? "Alsek Marketing"
                      : "Vitrine Caladoise";
                return (
                  <button
                    key={ws}
                    type="button"
                    onClick={() => handleSelectWorkspace(ws)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                      active
                        ? theme.activePillBg
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      <CreateClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        defaultWorkspace={activeWorkspace}
      />
    </div>
  );
}
