import { fetchInstagramReelViaApify } from "../worker/apify-instagram";

export type SocialPlatformType =
  | "INSTAGRAM"
  | "TIKTOK"
  | "FACEBOOK"
  | "YOUTUBE"
  | "LINKEDIN";

export interface ScrapedPostData {
  platform: SocialPlatformType;
  titleOrHook: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  source: "APIFY_API" | "OPENGRAPH_META" | "SMART_ESTIMATION";
}

export class SocialScraperService {
  /**
   * Détecte automatiquement le réseau social à partir de l'URL collée
   */
  static detectPlatform(url: string): SocialPlatformType {
    const lower = url.toLowerCase();
    if (lower.includes("tiktok.com")) return "TIKTOK";
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YOUTUBE";
    if (lower.includes("facebook.com") || lower.includes("fb.watch") || lower.includes("fb.com"))
      return "FACEBOOK";
    if (lower.includes("linkedin.com")) return "LINKEDIN";
    return "INSTAGRAM";
  }

  /**
   * Normalise l'URL collée : Instagram `/reels/` → `/reel/`, suppression des paramètres
   * de tracking (`?igsh=...`, utm_*, fbclid) et du fragment.
   */
  static normalizePostUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("instagram.com")) {
        parsed.pathname = parsed.pathname.replace(/\/reels\//i, "/reel/");
        parsed.search = "";
        parsed.hash = "";
        if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
        return parsed.toString();
      }
      for (const key of Array.from(parsed.searchParams.keys())) {
        if (/^(utm_|igsh|igshid|fbclid|si$|feature$)/i.test(key)) {
          parsed.searchParams.delete(key);
        }
      }
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  /**
   * Calcule le taux d'engagement en % : ((Likes + Comments + Shares + Saves) / Views) * 100
   */
  static computeEngagementRate(metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }): number {
    if (!metrics.views || metrics.views <= 0) return 0;
    const interactions =
      (metrics.likes || 0) +
      (metrics.comments || 0) +
      (metrics.shares || 0) +
      (metrics.saves || 0);
    return Number(((interactions / metrics.views) * 100).toFixed(2));
  }

  /**
   * Parse les nombres abrégés (ex: "14.2K", "1,5M", "840") dans les balises OpenGraph
   */
  private static parseAbbreviatedNumber(raw: string): number {
    const clean = raw.replace(/\s/g, "").replace(",", ".");
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    if (/k/i.test(clean)) return Math.round(num * 1000);
    if (/m/i.test(clean)) return Math.round(num * 1000000);
    return Math.round(num);
  }

  /**
   * Tente de récupérer les métadonnées et statistiques d'un post via :
   * 1. API Apify (si APIFY_API_TOKEN configuré)
   * 2. Scraping léger OpenGraph / oEmbed
   * 3. Fallback intelligent garantissant une expérience sans erreur (avec édition 1-clic dans l'UI)
   */
  static async fetchPostMetrics(
    postUrl: string,
    options?: {
      customTitle?: string;
      previousMetrics?: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        saves: number;
      };
    }
  ): Promise<ScrapedPostData> {
    const platform = this.detectPlatform(postUrl);
    const apifyToken = process.env.APIFY_API_TOKEN;

    // 0. Instagram : Apify Reel Scraper dédié (appel synchrone)
    if (platform === "INSTAGRAM" && apifyToken && apifyToken.trim().length > 0) {
      const current = options?.previousMetrics ?? {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };
      const ig = await fetchInstagramReelViaApify(postUrl, current, apifyToken);
      if (ig) {
        return {
          platform,
          titleOrHook:
            options?.customTitle ||
            ig.caption ||
            this.extractCleanHookFromUrl(postUrl, platform),
          thumbnailUrl: ig.thumbnailUrl,
          views: ig.views,
          likes: ig.likes,
          comments: ig.comments,
          shares: ig.shares,
          saves: ig.saves,
          engagementRate: this.computeEngagementRate(ig),
          source: "APIFY_API",
        };
      }
    }

    // 1. Connecteur API Apify (autres plateformes, si token présent en production)
    if (
      platform !== "INSTAGRAM" &&
      apifyToken &&
      apifyToken.trim().length > 10
    ) {
      try {
        const actorMap: Record<SocialPlatformType, string> = {
          INSTAGRAM: "apify~instagram-post-scraper",
          TIKTOK: "clockworks~free-tiktok-scraper",
          YOUTUBE: "streamers~youtube-scraper",
          FACEBOOK: "apify~facebook-posts-scraper",
          LINKEDIN: "apify~linkedin-post-scraper",
        };
        const actorId = actorMap[platform];
        const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directUrls: [postUrl], resultsLimit: 1 }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const item = items[0];
            const views = Number(item.videoViewCount || item.playCount || item.views || 0);
            const likes = Number(item.likesCount || item.diggCount || item.likes || 0);
            const comments = Number(item.commentsCount || item.commentCount || 0);
            const shares = Number(item.sharesCount || item.shareCount || 0);
            const saves = Number(item.collectCount || item.savesCount || 0);

            return {
              platform,
              titleOrHook:
                options?.customTitle ||
                String(item.caption || item.text || item.title || "").slice(0, 110) ||
                `Publication ${platform}`,
              thumbnailUrl: item.displayUrl || item.coverUrl || item.thumbnailUrl || null,
              views,
              likes,
              comments,
              shares,
              saves,
              engagementRate: this.computeEngagementRate({
                views,
                likes,
                comments,
                shares,
                saves,
              }),
              source: "APIFY_API",
            };
          }
        }
      } catch {
        // Bascule transparente sur OpenGraph / Smart Estimation
      }
    }

    // 2. Tentative d'extraction OpenGraph directe (sans clé API)
    try {
      const response = await fetch(postUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(3500),
      });

      if (response.ok) {
        const html = await response.text();
        const ogTitleMatch =
          html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
        const ogDescMatch =
          html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["']\s+property=["']og:description["']/i);
        const ogImageMatch =
          html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
          html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);

        const desc = ogDescMatch?.[1] || "";
        const likesMatch = desc.match(/([\d.,]+\s*[KMkm]?)\s*(likes|j'aime)/i);
        const commentsMatch = desc.match(/([\d.,]+\s*[KMkm]?)\s*(comments|commentaires)/i);
        const viewsMatch = desc.match(/([\d.,]+\s*[KMkm]?)\s*(views|vues|lectures)/i);

        if (likesMatch || viewsMatch) {
          const likes = likesMatch ? this.parseAbbreviatedNumber(likesMatch[1]) : 0;
          const comments = commentsMatch ? this.parseAbbreviatedNumber(commentsMatch[1]) : 0;
          const views = viewsMatch ? this.parseAbbreviatedNumber(viewsMatch[1]) : 0;
          const shares = 0;
          const saves = 0;

          return {
            platform,
            titleOrHook:
              options?.customTitle ||
              ogTitleMatch?.[1]?.slice(0, 110) ||
              this.extractCleanHookFromUrl(postUrl, platform),
            thumbnailUrl: ogImageMatch?.[1] || null,
            views,
            likes,
            comments,
            shares,
            saves,
            engagementRate: this.computeEngagementRate({
              views,
              likes,
              comments,
              shares,
              saves,
            }),
            source: "OPENGRAPH_META",
          };
        }
      }
    } catch {
      // Ignorer erreurs réseau/CORS ou blocage méta et passer au fallback déterministe
    }

    // 3. Aucune source fiable : AUCUNE donnée inventée — on conserve les compteurs existants (ou 0)
    const prev = options?.previousMetrics ?? {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
    const { views, likes, comments, shares, saves } = prev;
    return {
      platform,
      titleOrHook:
        options?.customTitle || this.extractCleanHookFromUrl(postUrl, platform),
      thumbnailUrl: null,
      views,
      likes,
      comments,
      shares,
      saves,
      engagementRate: this.computeEngagementRate({
        views,
        likes,
        comments,
        shares,
        saves,
      }),
      source: "SMART_ESTIMATION",
    };
  }

  static extractCleanHookFromUrl(
    url: string,
    platform: SocialPlatformType
  ): string {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const code = parts[parts.length - 1] || "video";
      const platformLabels: Record<SocialPlatformType, string> = {
        INSTAGRAM: "Reel Instagram",
        TIKTOK: "Vidéo TikTok",
        YOUTUBE: "YouTube Short",
        FACEBOOK: "Reel Facebook",
        LINKEDIN: "Post Vidéo LinkedIn",
      };
      return `${platformLabels[platform]} (#${code.slice(0, 10)})`;
    } catch {
      return `Publication ${platform}`;
    }
  }
}
