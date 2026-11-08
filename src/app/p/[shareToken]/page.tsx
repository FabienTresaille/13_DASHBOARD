import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TrendingUp,
  Eye,
  Euro,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Film,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { getClientByShareToken } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export default async function PublicClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ brand?: string }>;
}) {
  const { shareToken } = await params;
  const sp = await searchParams;
  const reqHeaders = await headers();

  const fullClient = await getClientByShareToken(shareToken, "ALL");
  if (!fullClient) {
    notFound();
  }

  const headerBrand = reqHeaders.get("x-pulse-brand");
  const queryBrand = (sp.brand || "").toLowerCase();

  let activeBrand: "ALSEK" | "VITRINE" = "ALSEK";

  if (queryBrand === "vitrine" || headerBrand === "VITRINE") {
    activeBrand = "VITRINE";
  } else if (queryBrand === "alsek" || headerBrand === "ALSEK") {
    activeBrand = "ALSEK";
  } else {
    const hasVitrineOnly =
      fullClient.workspaces.some((w) => w.workspace.slug === "VITRINE") &&
      !fullClient.workspaces.some((w) => w.workspace.slug === "ALSEK");
    activeBrand = hasVitrineOnly ? "VITRINE" : "ALSEK";
  }

  const brandFilteredClient = await getClientByShareToken(
    shareToken,
    activeBrand
  );
  const client =
    brandFilteredClient &&
    (brandFilteredClient.commercialEntries.length > 0 ||
      brandFilteredClient.trackedPosts.length > 0)
      ? brandFilteredClient
      : fullClient;

  const isVitrine = activeBrand === "VITRINE";

  const brandConfig = isVitrine
    ? {
        name: "Vitrine Caladoise",
        domain: "pro.vitrine-caladoise.fr",
        tagline: "Média Local & Terroir • Calade & Beaujolais",
        canvasBg: "bg-[#100C08]",
        primaryHex: "#D97706",
        secondaryHex: "#EA580C",
        logoUrl: "/logo-vitrine.png",
        accentBg: "bg-amber-500/15",
        accentBorder: "border-amber-500/35",
        accentText: "text-amber-300",
        heroGradient:
          "from-amber-950/50 via-[#15100B] to-[#0D0A07]",
      }
    : {
        name: "Alsek Marketing",
        domain: "app.alsek.fr",
        tagline: "Tech & Performance Agency • Acquisition & Vidéo",
        canvasBg: "bg-[#0A0A0F]",
        primaryHex: "#2563EB",
        secondaryHex: "#06B6D4",
        logoUrl: "/logo-alsek.png",
        accentBg: "bg-blue-600/15",
        accentBorder: "border-blue-500/35",
        accentText: "text-cyan-300",
        heroGradient:
          "from-blue-950/50 via-[#0E1220] to-[#0A0A0F]",
      };

  const t0 = client.initialAuditT0;
  const current = client.latestAudit;

  return (
    <div
      className={`min-h-screen ${brandConfig.canvasBg} text-slate-100 transition-colors duration-300 pb-12`}
    >
      {/* Sticky Native-App Top Bar (Idéal sur Smartphone & Tablette en RDV) */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandConfig.logoUrl}
              alt={brandConfig.name}
              className="h-7 w-auto object-contain rounded"
            />
            <div className="truncate">
              <div className="text-xs font-extrabold text-white truncate">
                {client.companyName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Rapport Live • {brandConfig.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/p/${shareToken}?brand=alsek`}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                !isVitrine
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Alsek
            </Link>
            <Link
              href={`/p/${shareToken}?brand=vitrine`}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                isVitrine
                  ? "bg-amber-600 text-white shadow"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Vitrine
            </Link>
          </div>
        </div>
      </div>

      {/* Main Mobile-First Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Hero Co-Brandé */}
        <header
          className={`rounded-3xl border ${brandConfig.accentBorder} bg-gradient-to-br ${brandConfig.heroGradient} p-5 sm:p-8 shadow-2xl`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="space-y-2">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-extrabold ${brandConfig.accentBg} ${brandConfig.accentBorder} ${brandConfig.accentText}`}
              >
                <Sparkles className="h-3 w-3" />
                Portail Client Partagé • {brandConfig.name}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {client.companyName}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {client.sector} — {client.city}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-3.5 text-center sm:text-right">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Multiplicateur de Rentabilité
              </div>
              <div className="text-3xl font-black text-emerald-400 tabular-nums">
                x{client.kpis.roiMultiplier}
              </div>
              <div className="text-[11px] text-slate-300">
                {formatEur(client.kpis.totalClientRevenue)} générés
              </div>
            </div>
          </div>
        </header>

        {/* 4 KPI Cards Mobile Bento (2x2 sur smartphone, 4 colonnes sur desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Vues Vidéos</span>
              <Eye
                className="h-4 w-4"
                style={{ color: brandConfig.primaryHex }}
              />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 tabular-nums">
              {formatNum(client.kpis.totalViews)}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold mt-1">
              {client.kpis.avgEngagementRate}% d&apos;engagement
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5">
            <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
              <span>CA Généré</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5 tabular-nums">
              {formatEur(client.kpis.totalClientRevenue)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              +{formatNum(client.kpis.totalLeads)} clients apportés
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Rentabilité</span>
              <Euro
                className="h-4 w-4"
                style={{ color: brandConfig.primaryHex }}
              />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 tabular-nums">
              x{client.kpis.roiMultiplier}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              1 € investi = {client.kpis.roiMultiplier} € générés
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Score Visibilité</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1.5 tabular-nums">
              {client.kpis.visibilityScoreCurrent}
              <span className="text-xs font-normal text-slate-500">/100</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-bold mt-1">
              +{client.kpis.visibilityDelta} pts vs départ
            </div>
          </div>
        </div>

        {/* Galerie Vidéos & Courbes */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Film
              className="h-5 w-5"
              style={{ color: brandConfig.primaryHex }}
            />
            Vos Vidéos & Courbes d&apos;Audience
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.trackedPosts.map((post) => {
              const maxViews = Math.max(
                ...post.metricsHistory.map((m) => m.views),
                1
              );
              return (
                <div
                  key={post.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        {post.platform}
                      </span>
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                        style={{ color: brandConfig.primaryHex }}
                      >
                        Voir la vidéo <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {post.titleOrHook}
                    </h3>
                  </div>

                  <div className="flex items-end gap-2 h-14 bg-black/40 rounded-xl p-2">
                    {post.metricsHistory.map((m) => {
                      const pct = Math.max(
                        18,
                        Math.round((m.views / maxViews) * 100)
                      );
                      return (
                        <div
                          key={m.id}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                        >
                          <div
                            className="w-full rounded-sm"
                            style={{
                              height: `${pct}%`,
                              background: `linear-gradient(180deg, ${brandConfig.secondaryHex}, ${brandConfig.primaryHex})`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-xl bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">Vues</div>
                      <div className="text-xs font-black text-white tabular-nums">
                        {formatNum(post.latestMetric.views)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">J&apos;aime</div>
                      <div className="text-xs font-bold text-rose-300 tabular-nums">
                        {formatNum(post.latestMetric.likes)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/30 p-2">
                      <div className="text-[10px] text-slate-400">Partages</div>
                      <div className="text-xs font-bold text-cyan-300 tabular-nums">
                        {formatNum(post.latestMetric.shares)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 p-2">
                      <div className="text-[10px] text-emerald-400">Engag.</div>
                      <div className="text-xs font-extrabold text-emerald-300 tabular-nums">
                        {post.latestMetric.engagementRate}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Transformation Avant / Après & Campagnes */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-black text-white">
              Évolution de votre Visibilité (Avant / Après)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Départ (Audit T₀)
                </div>
                <div className="text-2xl font-black text-slate-300">
                  {t0?.visibilityScore ?? 30}/100
                </div>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>
                    • Google : {t0?.gmbRating ?? "-"}★ ({t0?.gmbReviewsCount ?? 0}{" "}
                    avis)
                  </li>
                  <li>
                    • Instagram : {formatNum(t0?.igFollowers ?? 0)} abonnés
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 space-y-2">
                <div className="text-[10px] font-extrabold uppercase text-emerald-300">
                  Aujourd&apos;hui (Live)
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {current?.visibilityScore ?? 85}/100
                </div>
                <ul className="space-y-1 text-xs text-emerald-200">
                  <li>
                    • Google : {current?.gmbRating ?? "-"}★ (
                    {current?.gmbReviewsCount ?? 0} avis)
                  </li>
                  <li>
                    • Instagram : {formatNum(current?.igFollowers ?? 0)} abonnés
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-black text-white">
              Opérations & Retour sur Investissement
            </h2>
            <div className="space-y-2.5">
              {client.commercialEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 text-xs"
                >
                  <div className="pr-2">
                    <div className="font-bold text-white">
                      {entry.productName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      +{entry.leadsGenerated} nouveaux clients apportés
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-emerald-400 tabular-nums">
                      {formatEur(entry.clientRevenueGenerated)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      ROI x{entry.roiMultiplier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="pt-4 text-center text-xs text-slate-500">
          Propulsé par{" "}
          <strong className="text-slate-300">{brandConfig.name}</strong> (
          {brandConfig.domain}) • ALSEK PULSE
        </footer>
      </div>
    </div>
  );
}
