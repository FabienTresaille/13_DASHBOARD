/**
 * Connecteur Apify — Instagram Reel Scraper (appel synchrone).
 * Endpoint : https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items
 * Module sans dépendance (fetch natif) : partagé entre le worker BullMQ et le service de scraping.
 */

export interface InstagramCurrentMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface InstagramApifyResult extends InstagramCurrentMetrics {
  thumbnailUrl: string | null;
  caption: string | null;
}

const APIFY_IG_REEL_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items";

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Retourne null si le token est absent, si l'appel échoue ou si aucun item exploitable n'est renvoyé
 * (les compteurs existants restent alors inchangés — aucune donnée inventée).
 */
export async function fetchInstagramReelViaApify(
  postUrl: string,
  current: InstagramCurrentMetrics,
  token: string | undefined = process.env.APIFY_API_TOKEN
): Promise<InstagramApifyResult | null> {
  if (!token || token.trim().length === 0) return null;

  try {
    const res = await fetch(
      `${APIFY_IG_REEL_ENDPOINT}?token=${encodeURIComponent(token.trim())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: [postUrl], resultsLimit: 1 }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!res.ok) {
      console.error(`⚠️ Apify Instagram : HTTP ${res.status} pour ${postUrl}`);
      return null;
    }

    const items = (await res.json()) as Array<Record<string, unknown>>;
    const item = Array.isArray(items) ? items[0] : null;
    if (!item || item.error) {
      console.error(
        `⚠️ Apify Instagram : aucun résultat exploitable pour ${postUrl}`
      );
      return null;
    }

    return {
      views: num(
        item.videoPlayCount || item.videoViewCount,
        current.views
      ),
      likes: num(item.likesCount ?? current.likes, current.likes),
      comments: num(item.commentsCount ?? current.comments, current.comments),
      shares: num(item.sharesCount ?? current.shares, current.shares),
      saves: current.saves,
      thumbnailUrl:
        typeof item.displayUrl === "string" && item.displayUrl
          ? item.displayUrl
          : null,
      caption:
        typeof item.caption === "string" && item.caption
          ? item.caption.slice(0, 140)
          : null,
    };
  } catch (err) {
    console.error(
      `⚠️ Apify Instagram : échec pour ${postUrl} :`,
      (err as Error).message
    );
    return null;
  }
}
