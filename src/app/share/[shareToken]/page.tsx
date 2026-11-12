import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Eye,
  Heart,
  Share2,
  MessageCircle,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Play,
  Calendar,
  Sparkles,
  Award,
} from "lucide-react";
import { getClientByShareToken, type WorkspaceFilter } from "@/lib/db";

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

export default async function ClientShareReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ brand?: string }>;
}) {
  const { shareToken } = await params;
  const { brand } = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("host") || "";

  const baseClient = await getClientByShareToken(shareToken, "ALL");
  if (!baseClient) {
    notFound();
  }

  // Détermination de l'identité Workspace (ALSEK vs VITRINE)
  const hasVitrine = baseClient.workspaces.some(
    (w) => w.workspace.slug === "VITRINE"
  );
  const hasAlsek = baseClient.workspaces.some(
    (w) => w.workspace.slug === "ALSEK"
  );

  let activeBrand: "ALSEK" | "VITRINE" = "ALSEK";
  if (brand?.toLowerCase() === "vitrine" || host.includes("vitrine-caladoise")) {
    activeBrand = "VITRINE";
  } else if (brand?.toLowerCase() === "alsek" || host.includes("alsek")) {
    activeBrand = "ALSEK";
  } else if (hasVitrine && !hasAlsek) {
    activeBrand = "VITRINE";
  }

  const brandFilter: WorkspaceFilter =
    brand?.toLowerCase() === "all" ? "ALL" : activeBrand;
  const client = (await getClientByShareToken(shareToken, brandFilter)) || baseClient;

  // Thème haute précision Alsek (#1E3AFF / #00E676) vs Vitrine Caladoise (#4B0082 / #D4AF37)
  const theme =
    activeBrand === "VITRINE"
      ? {
          brandName: "Vitrine Caladoise",
          tagline: "Média Local & Rayonnement Commerçants • Calade & Beaujolais",
          domain: "pro.vitrine-caladoise.fr",
          primaryHex: "#4B0082",
          secondaryHex: "#D4AF37",
          bgCanvas: "bg-[#0B0612]",
          ambientGlow:
            "radial-gradient(circle at 50% 0%, rgba(75, 0, 130, 0.32), rgba(212, 175, 55, 0.14) 45%, transparent 75%)",
          badgeClass:
            "bg-[#4B0082]/40 border-[#D4AF37]/50 text-[#D4AF37]",
          ctaClass:
            "bg-gradient-to-r from-[#4B0082] to-[#D4AF37] text-white shadow-lg shadow-[#4B0082]/40",
        }
      : {
          brandName: "Alsek Marketing",
          tagline: "Agence Performance Vidéo 9:16, Acquisition & Conversion B2B",
          domain: "app.alsek.fr",
          primaryHex: "#1E3AFF",
          secondaryHex: "#00E676",
          bgCanvas: "bg-[#060913]",
          ambientGlow:
            "radial-gradient(circle at 50% 0%, rgba(30, 58, 255, 0.25), rgba(0, 230, 118, 0.10) 45%, transparent 75%)",
          badgeClass:
            "bg-[#1E3AFF]/20 border-[#1E3AFF]/50 text-[#00E676]",
          ctaClass:
            "bg-gradient-to-r from-[#1E3AFF] to-[#00E676] text-white shadow-lg shadow-[#1E3AFF]/40",
        };

  const posts =
    client.trackedPosts.length > 0
      ? client.trackedPosts
      : baseClient.trackedPosts;
  const roiMetrics = baseClient.roiMetrics || [];

  const totalViews = posts.reduce((s, p) => s + p.latestMetric.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p.latestMetric.likes, 0);
  const totalShares = posts.reduce((s, p) => s + p.latestMetric.shares, 0);
  const totalComments = posts.reduce((s, p) => s + p.latestMetric.comments, 0);

  const totalRoiLeads =
    roiMetrics.length > 0
      ? roiMetrics.reduce((s, r) => s + r.leadsGenerated, 0)
      : baseClient.kpis.totalLeads;
  const totalRoiRevenue =
    roiMetrics.length > 0
      ? roiMetrics.reduce((s, r) => s + r.estimatedRevenue, 0)
      : baseClient.kpis.totalClientRevenue;

  return (
    <div
      className={`min-h-screen ${theme.bgCanvas} text-slate-100 relative overflow-x-hidden`}
    >
      {/* Halo de marque */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: theme.ambientGlow }}
      />

      {/* Ligne supérieure lumineuse */}
      <div
        className="h-1.5 w-full relative z-10"
        style={{
          background: `linear-gradient(90deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
        }}
      />

      {/* Topbar Publique Épurée */}
      <header className="relative z-10 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl font-black text-sm text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
              }}
            >
              {activeBrand === "VITRINE" ? "VC" : "AK"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">
                  {theme.brandName}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${theme.badgeClass}`}
                >
                  Rapport Client Certifié
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{theme.tagline}</p>
            </div>
          </div>

          {/* Switcher de marque si le client est accompagné par les 2 entités */}
          <div className="flex items-center gap-2">
            <Link
              href={`/share/${shareToken}?brand=alsek`}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition ${
                activeBrand === "ALSEK"
                  ? "border-[#00E676]/50 bg-[#1E3AFF]/30 text-white"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Alsek Marketing
            </Link>
            <Link
              href={`/share/${shareToken}?brand=vitrine`}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition ${
                activeBrand === "VITRINE"
                  ? "border-[#D4AF37]/50 bg-[#4B0082]/40 text-[#D4AF37]"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Vitrine Caladoise
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ===================================================================
            HERO IDENTITÉ CLIENT & SYNTHÈSE EXÉCUTIVE
        =================================================================== */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                <MapPin
                  className="h-3.5 w-3.5"
                  style={{ color: theme.secondaryHex }}
                />
                <span>
                  {baseClient.sector} • {baseClient.city}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {baseClient.companyName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Synthèse en temps réel des contenus vidéos produits (`TrackedPost`) et de l&apos;impact commercial mesuré (`ClientRoiMetric`) par{" "}
                <strong className="text-white">{theme.brandName}</strong>.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold ${theme.badgeClass}`}
              >
                <ShieldCheck className="h-4 w-4" />
                Score Visibilité : {baseClient.kpis.visibilityScoreT0}/100 ➔{" "}
                {baseClient.kpis.visibilityScoreCurrent}/100 (+
                {baseClient.kpis.visibilityDelta} pts)
              </span>
              <span className="text-[11px] text-slate-400">
                Panier moyen de référence :{" "}
                <strong className="text-white">
                  {baseClient.avgBasketValue} €
                </strong>
              </span>
            </div>
          </div>

          {/* 4 KPIs Majeurs du Rapport */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Vues Générées</span>
                <Eye
                  className="h-4 w-4"
                  style={{ color: theme.secondaryHex }}
                />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2 tabular-nums">
                {formatNum(totalViews)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Sur {posts.length} vidéo(s) publiée(s)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Interactions & Partages</span>
                <Heart className="h-4 w-4 text-pink-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-2 tabular-nums">
                {formatNum(totalLikes + totalShares + totalComments)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {formatNum(totalLikes)} likes • {formatNum(totalShares)}{" "}
                partages
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>Leads / Clients Générés</span>
                <Award className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-300 mt-2 tabular-nums">
                +{formatNum(totalRoiLeads)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                 Contacts, réservations ou visites
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: `${theme.secondaryHex}66`,
                backgroundColor: `${theme.primaryHex}22`,
              }}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase">
                <span style={{ color: theme.secondaryHex }}>
                  CA Client Estimé (ROI)
                </span>
                <TrendingUp
                  className="h-4 w-4"
                  style={{ color: theme.secondaryHex }}
                />
              </div>
              <div
                className="text-2xl sm:text-3xl font-black mt-2 tabular-nums"
                style={{ color: theme.secondaryHex }}
              >
                {formatEur(totalRoiRevenue)}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                Multiplicateur moyen{" "}
                <strong>x{baseClient.kpis.roiMultiplier}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            RÉCAPITULATIF DES VIDÉOS PRODUITES (TRACKEDPOST 9:16)
        =================================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Vidéos & Reels Produits ({posts.length})
              </h2>
              <p className="text-xs text-slate-400">
                Performances détaillées par publication avec accès direct à la vidéo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => {
              const isPostAlsek = post.workspace.slug === "ALSEK";
              return (
                <div
                  key={post.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 overflow-hidden shadow-xl flex flex-col justify-between hover:border-white/25 transition"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-extrabold text-white">
                        {post.platform}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isPostAlsek
                            ? "bg-[#1E3AFF]/25 text-[#00E676] border-[#1E3AFF]/50"
                            : "bg-[#4B0082]/40 text-[#D4AF37] border-[#D4AF37]/50"
                        }`}
                      >
                        {post.workspace.name}
                      </span>
                    </div>

                    <div className="min-h-[48px]">
                      <p className="text-sm font-extrabold text-white leading-snug">
                        {post.titleOrHook || "Publication vidéo"}
                      </p>
                    </div>

                    {/* Statistiques Vues, Likes, Partages */}
                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 text-center">
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">
                          Vues
                        </div>
                        <div className="text-sm font-black text-amber-300 mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.views)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">
                          Likes
                        </div>
                        <div className="text-sm font-black text-pink-400 mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.likes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 font-bold">
                          Partages
                        </div>
                        <div className="text-sm font-black text-emerald-300 mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.shares)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/40 px-5 py-3.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      Engagement :{" "}
                      <strong className="text-white">
                        {post.latestMetric.engagementRate}%
                      </strong>
                    </span>

                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${theme.ctaClass}`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Voir le Reel
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            MÉTRIQUES DE ROI MENSUELLES (CLIENTROIMETRIC)
        =================================================================== */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles
                  className="h-3.5 w-3.5"
                  style={{ color: theme.secondaryHex }}
                />
                Impact Commercial & Retour sur Investissement
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">
                Suivi Mensuel du ROI (`ClientRoiMetric`)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roiMetrics.map((metric) => (
              <div
                key={metric.id}
                className="rounded-2xl border border-white/10 bg-black/35 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono font-bold text-white">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {metric.month.slice(0, 7)}
                  </span>
                  <span
                    className="text-xs font-extrabold"
                    style={{ color: theme.secondaryHex }}
                  >
                    +{formatNum(metric.leadsGenerated)} leads
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Chiffre d&apos;Affaires Généré Estimé
                  </div>
                  <div className="text-2xl font-black text-white mt-0.5 tabular-nums">
                    {formatEur(metric.estimatedRevenue)}
                  </div>
                </div>

                {metric.notes && (
                  <p className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2.5">
                    {metric.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
