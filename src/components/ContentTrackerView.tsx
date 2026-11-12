"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Film,
  LayoutGrid,
  Table2,
  Plus,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Check,
  Play,
  Sparkles,
} from "lucide-react";
import type {
  EnrichedClient360,
  EnrichedTrackedPost,
  WorkspaceFilter,
} from "@/lib/db";
import type {
  SocialPlatformKey,
  WorkspaceSlugType,
} from "@/lib/seed-data";
import {
  addTrackedPostAction,
  updatePostStatsAction,
  deleteTrackedPostAction,
  triggerSocialSyncAction,
} from "@/app/actions";

interface ContentTrackerViewProps {
  activeWorkspace: WorkspaceFilter;
  clients: EnrichedClient360[];
}

const PLATFORM_META: Record<
  SocialPlatformKey,
  {
    label: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    gradientBg: string;
  }
> = {
  INSTAGRAM: {
    label: "Instagram Reel",
    badgeBg: "bg-pink-500/15",
    badgeBorder: "border-pink-500/40",
    badgeText: "text-pink-300",
    gradientBg: "from-fuchsia-950/90 via-rose-950/70 to-slate-950",
  },
  TIKTOK: {
    label: "TikTok Video",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/40",
    badgeText: "text-cyan-300",
    gradientBg: "from-cyan-950/90 via-blue-950/70 to-slate-950",
  },
  YOUTUBE: {
    label: "YouTube Short",
    badgeBg: "bg-red-500/15",
    badgeBorder: "border-red-500/40",
    badgeText: "text-red-300",
    gradientBg: "from-red-950/90 via-orange-950/70 to-slate-950",
  },
  FACEBOOK: {
    label: "Facebook Reel",
    badgeBg: "bg-blue-500/15",
    badgeBorder: "border-blue-500/40",
    badgeText: "text-blue-300",
    gradientBg: "from-blue-950/90 via-indigo-950/70 to-slate-950",
  },
  LINKEDIN: {
    label: "LinkedIn Video",
    badgeBg: "bg-sky-500/15",
    badgeBorder: "border-sky-500/40",
    badgeText: "text-sky-300",
    gradientBg: "from-sky-950/90 via-slate-900 to-slate-950",
  },
};

function formatNum(val: number): string {
  return new Intl.NumberFormat("fr-FR").format(val);
}

function formatDateFr(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function ContentTrackerView({
  activeWorkspace,
  clients,
}: ContentTrackerViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Palette dynamique Alsek (#1E3AFF / #00E676) vs Vitrine (#4B0082 / #D4AF37)
  const brandColors =
    activeWorkspace === "VITRINE"
      ? {
          primary: "#4B0082",
          secondary: "#D4AF37",
          ctaClass:
            "bg-gradient-to-r from-[#4B0082] to-[#D4AF37] text-white shadow-lg shadow-[#4B0082]/30",
        }
      : {
          primary: "#1E3AFF",
          secondary: "#00E676",
          ctaClass:
            "bg-gradient-to-r from-[#1E3AFF] to-[#00E676] text-white shadow-lg shadow-[#1E3AFF]/30",
        };

  // Mode d'affichage : GRID (9:16) vs TABLE
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Filtres : Client & Plateforme
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<
    "ALL" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK"
  >("ALL");

  // État Synchronisation BullMQ
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Modale Ajout Publication (addTrackedPostAction)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPostClientId, setNewPostClientId] = useState<string>(
    clients[0]?.id || ""
  );
  const [newPostWorkspace, setNewPostWorkspace] = useState<WorkspaceSlugType>(
    activeWorkspace === "VITRINE" ? "VITRINE" : "ALSEK"
  );
  const [newPostUrl, setNewPostUrl] = useState<string>("");
  const [newPostTitle, setNewPostTitle] = useState<string>("");

  // Modale Édition Manuelle des Compteurs (updatePostStatsAction)
  const [editingPost, setEditingPost] = useState<EnrichedTrackedPost | null>(
    null
  );
  const [editViews, setEditViews] = useState<number>(0);
  const [editLikes, setEditLikes] = useState<number>(0);
  const [editComments, setEditComments] = useState<number>(0);
  const [editShares, setEditShares] = useState<number>(0);
  const [editSaves, setEditSaves] = useState<number>(0);

  // Consolidation de tous les TrackedPost
  const allPosts = useMemo(() => {
    return clients
      .flatMap((c) => c.trackedPosts)
      .sort((a, b) => b.latestMetric.views - a.latestMetric.views);
  }, [clients]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((p) => {
      if (clientFilter !== "ALL" && p.clientId !== clientFilter) return false;
      if (platformFilter !== "ALL" && p.platform !== platformFilter)
        return false;
      return true;
    });
  }, [allPosts, clientFilter, platformFilter]);

  // Totaux agrégés des vidéos filtrées
  const summaryStats = useMemo(() => {
    const views = filteredPosts.reduce(
      (s, p) => s + p.latestMetric.views,
      0
    );
    const likes = filteredPosts.reduce(
      (s, p) => s + p.latestMetric.likes,
      0
    );
    const comments = filteredPosts.reduce(
      (s, p) => s + p.latestMetric.comments,
      0
    );
    const shares = filteredPosts.reduce(
      (s, p) => s + p.latestMetric.shares,
      0
    );
    const avgEng =
      filteredPosts.length > 0
        ? (
            filteredPosts.reduce(
              (s, p) => s + p.latestMetric.engagementRate,
              0
            ) / filteredPosts.length
          ).toFixed(2)
        : "0.00";
    return { views, likes, comments, shares, avgEng };
  }, [filteredPosts]);

  // Déclenchement du job BullMQ sync-social-metrics
  const handleSyncAll = (postId?: string) => {
    startTransition(async () => {
      const res = await triggerSocialSyncAction(postId);
      setSyncMessage(
        res.queued
          ? `Job BullMQ sync-social-metrics envoyé (${res.syncedCount} vidéo(s))`
          : `Statistiques synchronisées (${res.syncedCount} vidéo(s))`
      );
      setTimeout(() => setSyncMessage(null), 3500);
      router.refresh();
    });
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostUrl.trim() || !newPostClientId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("postUrl", newPostUrl.trim());
      fd.set("workspaceSlug", newPostWorkspace);
      if (newPostTitle.trim()) fd.set("titleOrHook", newPostTitle.trim());
      await addTrackedPostAction(newPostClientId, fd);
      setNewPostUrl("");
      setNewPostTitle("");
      setIsAddOpen(false);
      router.refresh();
    });
  };

  const openEditStatsModal = (post: EnrichedTrackedPost) => {
    setEditingPost(post);
    setEditViews(post.latestMetric.views);
    setEditLikes(post.latestMetric.likes);
    setEditComments(post.latestMetric.comments);
    setEditShares(post.latestMetric.shares);
    setEditSaves(post.latestMetric.saves);
  };

  const handleSaveStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    startTransition(async () => {
      await updatePostStatsAction(editingPost.id, editingPost.clientId, {
        views: editViews,
        likes: editLikes,
        comments: editComments,
        shares: editShares,
        saves: editSaves,
      });
      setEditingPost(null);
      router.refresh();
    });
  };

  const handleDeletePost = (post: EnrichedTrackedPost) => {
    startTransition(async () => {
      await deleteTrackedPostAction(post.id, post.clientId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-7">
      {/* =====================================================================
          HEADER & BOUTONS D'ACTION (BULLMQ SYNC + AJOUT + SWITCH 9:16 / TABLE)
      ===================================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
            <Film
              className="h-3.5 w-3.5"
              style={{ color: brandColors.secondary }}
            />
            Content Tracker 9:16 • Reels, TikTok & Shorts
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Content Tracker 9:16 ({filteredPosts.length} vidéos)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Suivi des performances organiques & sponsorisées (`TrackedPost`), édition rapide des compteurs et synchronisation Worker BullMQ (`sync-social-metrics`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch Grille 9:16 vs Tableau */}
          <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-white/15 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grille 9:16
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-white/15 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Vue Tableau
            </button>
          </div>

          {/* Bouton Synchroniser les stats (BullMQ sync-social-metrics) */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSyncAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white transition cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin text-[#00E676]" : "text-[#00E676]"}`}
            />
            Synchroniser les stats
          </button>

          {/* Bouton Ajouter une publication */}
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${brandColors.ctaClass}`}
          >
            <Plus className="h-4 w-4" />
            Ajouter une vidéo
          </button>
        </div>
      </div>

      {/* Toast Notification BullMQ Sync */}
      {syncMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-[#00E676]/40 bg-[#00E676]/10 px-4 py-3 text-xs font-bold text-[#00E676]">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {syncMessage}
          </span>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          BANDEAU SYNTHÈSE & FILTRES (CLIENT + PLATEFORME)
      ===================================================================== */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Vues Cumulées
            </div>
            <div className="text-xl font-black text-white mt-0.5 tabular-nums">
              {formatNum(summaryStats.views)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Likes Cumulés
            </div>
            <div className="text-xl font-black text-pink-400 mt-0.5 tabular-nums">
              {formatNum(summaryStats.likes)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Partages Viraux
            </div>
            <div className="text-xl font-black text-cyan-300 mt-0.5 tabular-nums">
              {formatNum(summaryStats.shares)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Engagement Moyen
            </div>
            <div className="text-xl font-black text-[#00E676] mt-0.5 tabular-nums">
              {summaryStats.avgEng} %
            </div>
          </div>
        </div>

        {/* Filtres par Plateforme et par Client */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "ALL", label: "Toutes plateformes" },
                { key: "INSTAGRAM", label: "Instagram" },
                { key: "TIKTOK", label: "TikTok" },
                { key: "YOUTUBE", label: "YouTube" },
                { key: "FACEBOOK", label: "Facebook" },
              ] as const
            ).map((plat) => (
              <button
                key={plat.key}
                type="button"
                onClick={() => setPlatformFilter(plat.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  platformFilter === plat.key
                    ? "bg-white/15 text-white border border-white/25"
                    : "text-slate-400 hover:text-white bg-black/25 border border-white/5"
                }`}
              >
                {plat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Client :</span>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              <option value="ALL">Toutes les enseignes ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================================
          VUE 1 : GRILLE 9:16 VERTICALE AVEC MINIATURES
      ===================================================================== */}
      {viewMode === "GRID" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredPosts.map((post) => {
            const pMeta =
              PLATFORM_META[post.platform] || PLATFORM_META.INSTAGRAM;
            const isAlsek = post.workspace.slug === "ALSEK";

            return (
              <div
                key={post.id}
                className="group rounded-3xl border border-white/10 bg-slate-900/75 overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/25 transition"
              >
                {/* Carte Format Vertical 9:16 */}
                <div
                  className={`relative aspect-[9/16] w-full bg-gradient-to-b ${pMeta.gradientBg} p-4 flex flex-col justify-between overflow-hidden`}
                >
                  {/* Image miniature si présente */}
                  {post.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt={post.titleOrHook || "Miniature vidéo"}
                      className="absolute inset-0 h-full w-full object-cover opacity-45 group-hover:scale-105 transition duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30" />

                  {/* Top Badges : Plateforme + Workspace */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur-md ${pMeta.badgeBg} ${pMeta.badgeBorder} ${pMeta.badgeText}`}
                    >
                      {pMeta.label}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border backdrop-blur-md ${
                        isAlsek
                          ? "bg-[#1E3AFF]/30 text-[#00E676] border-[#1E3AFF]/60"
                          : "bg-[#4B0082]/50 text-[#D4AF37] border-[#D4AF37]/60"
                      }`}
                    >
                      {isAlsek ? "ALSEK" : "VITRINE"}
                    </span>
                  </div>

                  {/* Bouton Play Central */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2">
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 border border-white/30 backdrop-blur-md text-white group-hover:scale-110 group-hover:bg-white/25 transition shadow-xl"
                      title="Ouvrir la vidéo originale"
                    >
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </a>
                    <span className="mt-2 rounded-full bg-black/60 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      Engagement {post.latestMetric.engagementRate}%
                    </span>
                  </div>

                  {/* Bas de la carte 9:16 : Client, Hook & Compteurs */}
                  <div className="relative z-10 space-y-3">
                    <div>
                      <Link
                        href={`/clients/${post.clientId}`}
                        className="text-[11px] font-extrabold uppercase tracking-wider text-[#00E676] hover:underline"
                      >
                        {post.clientName}
                      </Link>
                      <p className="text-xs font-bold text-white line-clamp-2 mt-0.5 leading-snug">
                        {post.titleOrHook || post.postUrl}
                      </p>
                    </div>

                    {/* Grille des 4 compteurs */}
                    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-black/65 backdrop-blur-md p-2.5 text-center">
                      <div>
                        <Eye className="h-3.5 w-3.5 text-amber-300 mx-auto" />
                        <div className="text-[11px] font-black text-white mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.views)}
                        </div>
                      </div>
                      <div>
                        <Heart className="h-3.5 w-3.5 text-pink-400 mx-auto" />
                        <div className="text-[11px] font-black text-white mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.likes)}
                        </div>
                      </div>
                      <div>
                        <MessageCircle className="h-3.5 w-3.5 text-sky-300 mx-auto" />
                        <div className="text-[11px] font-black text-white mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.comments)}
                        </div>
                      </div>
                      <div>
                        <Share2 className="h-3.5 w-3.5 text-emerald-300 mx-auto" />
                        <div className="text-[11px] font-black text-white mt-0.5 tabular-nums">
                          {formatNum(post.latestMetric.shares)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barre d'actions sous la carte 9:16 */}
                <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/90 px-4 py-2.5 text-[11px]">
                  <span className="text-slate-500 truncate">
                    Sync: {formatDateFr(post.lastSyncedAt)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditStatsModal(post)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/15 transition cursor-pointer"
                      title="Modifier manuellement les compteurs"
                    >
                      <Edit3 className="h-3 w-3" />
                      Stats
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSyncAll(post.id)}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-[#00E676] transition cursor-pointer"
                      title="Synchroniser ce post"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post)}
                      className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Supprimer ce post"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===================================================================
           VUE 2 : TABLEAU ANALYTIQUE DES TRACKEDPOST
        =================================================================== */
        <div className="rounded-3xl border border-white/10 bg-slate-900/65 backdrop-blur-xl p-6 shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Publication & Hook</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Plateforme</th>
                <th className="py-3 px-3 text-right">Vues</th>
                <th className="py-3 px-3 text-right">Likes</th>
                <th className="py-3 px-3 text-right">Comms</th>
                <th className="py-3 px-3 text-right">Partages</th>
                <th className="py-3 px-3 text-right">Saves</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredPosts.map((post) => {
                const pMeta =
                  PLATFORM_META[post.platform] || PLATFORM_META.INSTAGRAM;
                return (
                  <tr
                    key={post.id}
                    className="hover:bg-white/[0.03] transition"
                  >
                    <td className="py-3.5 px-3 max-w-xs">
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-white hover:text-[#00E676] inline-flex items-center gap-1.5"
                      >
                        <span className="truncate">
                          {post.titleOrHook || post.postUrl}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Dernière sync : {formatDateFr(post.lastSyncedAt)}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-200">
                      <Link
                        href={`/clients/${post.clientId}`}
                        className="hover:underline"
                      >
                        {post.clientName}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${pMeta.badgeBg} ${pMeta.badgeBorder} ${pMeta.badgeText}`}
                      >
                        {pMeta.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-amber-300 tabular-nums">
                      {formatNum(post.latestMetric.views)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-pink-300 tabular-nums">
                      {formatNum(post.latestMetric.likes)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-sky-300 tabular-nums">
                      {formatNum(post.latestMetric.comments)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-300 tabular-nums">
                      {formatNum(post.latestMetric.shares)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-purple-300 tabular-nums">
                      {formatNum(post.latestMetric.saves)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditStatsModal(post)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/15 cursor-pointer"
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSyncAll(post.id)}
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:text-[#00E676] cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          MODALE AJOUT D'UNE PUBLICATION (addTrackedPostAction)
      ===================================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0B1020] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">
                  Ajouter une vidéo (`TrackedPost`)
                </h3>
                <p className="text-xs text-slate-400">
                  Collez le lien Instagram Reel, TikTok, YouTube Short ou Facebook
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPost} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Client
                  </label>
                  <select
                    value={newPostClientId}
                    onChange={(e) => setNewPostClientId(e.target.value)}
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
                    Portefeuille
                  </label>
                  <select
                    value={newPostWorkspace}
                    onChange={(e) =>
                      setNewPostWorkspace(e.target.value as WorkspaceSlugType)
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <option value="ALSEK">Alsek Marketing</option>
                    <option value="VITRINE">Vitrine Caladoise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  URL de la vidéo (Reel / TikTok / Short)
                </label>
                <input
                  type="url"
                  required
                  value={newPostUrl}
                  onChange={(e) => setNewPostUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Titre ou Hook de la vidéo
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Ex: Immersion en cuisine : coup de feu du vendredi soir ⚡"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`rounded-xl px-5 py-2.5 text-xs font-extrabold cursor-pointer ${brandColors.ctaClass}`}
                >
                  Ajouter au Content Tracker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALE ÉDITION MANUELLE DES COMPTEURS (updatePostStatsAction)
      ===================================================================== */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0B1020] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  Édition Manuelle des Compteurs (`updatePostStatsAction`)
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">
                  {editingPost.titleOrHook || editingPost.postUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStats} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-amber-300 mb-1">
                    Vues (Views)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editViews}
                    onChange={(e) => setEditViews(Number(e.target.value || 0))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-black text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-pink-300 mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editLikes}
                    onChange={(e) => setEditLikes(Number(e.target.value || 0))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-black text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-sky-300 mb-1">
                    Commentaires
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editComments}
                    onChange={(e) =>
                      setEditComments(Number(e.target.value || 0))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-black text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">
                    Partages (Shares)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editShares}
                    onChange={(e) =>
                      setEditShares(Number(e.target.value || 0))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-black text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-purple-300 mb-1">
                    Enregistrements / Favoris (Saves)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editSaves}
                    onChange={(e) => setEditSaves(Number(e.target.value || 0))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-black text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-extrabold cursor-pointer ${brandColors.ctaClass}`}
                >
                  <Check className="h-4 w-4" />
                  Enregistrer les stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
