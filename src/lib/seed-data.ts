import type { ModuleTypeKey } from "@/modules/types";

export type WorkspaceSlugType = "ALSEK" | "VITRINE";
export type ClientStatusType = "PROSPECT" | "ACTIVE" | "PAUSED" | "CHURNED";
export type BillingTypeKey = "ONE_SHOT" | "RECURRING_MRR";
export type PaymentStatusKey = "PENDING" | "PAID" | "OVERDUE";
export type SocialPlatformKey =
  | "INSTAGRAM"
  | "TIKTOK"
  | "FACEBOOK"
  | "YOUTUBE"
  | "LINKEDIN";

export interface WorkspaceRecord {
  id: string;
  slug: WorkspaceSlugType;
  name: string;
  domain: string;
  primaryColor: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface ClientWorkspaceRecord {
  id: string;
  clientId: string;
  workspaceId: string;
  status: ClientStatusType;
  joinedAt: string;
}

export interface AuditSnapshotRecord {
  id: string;
  clientId: string;
  isInitialT0: boolean;
  gmbRating: number | null;
  gmbReviewsCount: number | null;
  igFollowers: number | null;
  igPostsCount: number | null;
  hasWebsite: boolean;
  hasSsl: boolean;
  hasMetaPixel: boolean;
  hasClarity: boolean;
  visibilityScore: number;
  rawNotes: string | null;
  recordedAt: string;
}

export interface CommercialEntryRecord {
  id: string;
  clientId: string;
  workspaceId: string;
  productName: string;
  billingType: BillingTypeKey;
  amountSoldHt: number;
  paymentStatus: PaymentStatusKey;
  clientRevenueGenerated: number;
  leadsGenerated: number;
  periodDate: string;
  notes: string | null;
}

export interface PostMetricSnapshotRecord {
  id: string;
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  recordedAt: string;
}

export interface TrackedPostRecord {
  id: string;
  clientId: string;
  workspaceId: string;
  platform: SocialPlatformKey;
  postUrl: string;
  titleOrHook: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  isActiveTrack: boolean;
}

export interface WebMetricSnapshotRecord {
  id: string;
  clientId: string;
  sessionsCount: number;
  uniqueVisitors: number;
  clarityRageClicks: number;
  clarityDeadClicks: number;
  pixelPageViews: number;
  pixelLeadsOrCalls: number;
  recordedAt: string;
}

export interface ClientModuleRecord {
  id: string;
  clientId: string;
  moduleType: ModuleTypeKey;
  isEnabled: boolean;
  configJson: Record<string, unknown> | null;
  updatedAt: string;
}

export interface AutomationEventRecord {
  id: string;
  clientId: string;
  moduleType: ModuleTypeKey;
  title: string;
  payloadJson: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}

export interface ClientRecord {
  id: string;
  companyName: string;
  sector: string;
  city: string;
  nafCode: string | null;
  employeeCount: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  avgBasketValue: number;
  shareToken: string;
  websiteUrl: string | null;
  gmbPlaceId: string | null;
  igUsername: string | null;
  tiktokUsername: string | null;
  clarityProjectId: string | null;
  metaPixelId: string | null;
  ga4PropertyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PulseDatabaseState {
  workspaces: WorkspaceRecord[];
  clients: ClientRecord[];
  clientWorkspaces: ClientWorkspaceRecord[];
  audits: AuditSnapshotRecord[];
  commercialEntries: CommercialEntryRecord[];
  trackedPosts: TrackedPostRecord[];
  postMetrics: PostMetricSnapshotRecord[];
  webMetrics: WebMetricSnapshotRecord[];
  clientModules: ClientModuleRecord[];
  automationEvents: AutomationEventRecord[];
}

export function createInitialSeedData(): PulseDatabaseState {
  const workspaces: WorkspaceRecord[] = [
    {
      id: "ws_alsek",
      slug: "ALSEK",
      name: "Alsek Marketing",
      domain: "app.alsek.fr",
      primaryColor: "#2563EB",
      logoUrl: "/logo-alsek.png",
      createdAt: "2026-01-10T09:00:00.000Z",
    },
    {
      id: "ws_vitrine",
      slug: "VITRINE",
      name: "Vitrine Caladoise",
      domain: "pro.vitrine-caladoise.fr",
      primaryColor: "#D97706",
      logoUrl: "/logo-vitrine.png",
      createdAt: "2026-01-10T09:00:00.000Z",
    },
  ];

  const clients: ClientRecord[] = [
    {
      id: "client_bistrot_caladois",
      companyName: "Le Bistrot Caladois",
      sector: "Restaurant & Brasserie",
      city: "Villefranche-sur-Saône",
      nafCode: "5610A",
      employeeCount: 12,
      contactName: "Thomas Mercier",
      contactEmail: "thomas@bistrot-caladois.fr",
      contactPhone: "04 74 65 18 90",
      avgBasketValue: 42.0,
      shareToken: "bistrot-caladois",
      websiteUrl: "https://bistrot-caladois.fr",
      gmbPlaceId: "ChIJ_Calade_Bistrot_891",
      igUsername: "@lebistrotcaladois",
      tiktokUsername: "@bistrotcaladois",
      clarityProjectId: "clr_bistrot_9921",
      metaPixelId: "8849201938471",
      ga4PropertyId: "G-CALADE01",
      createdAt: "2026-06-15T10:00:00.000Z",
      updatedAt: "2026-11-08T18:30:00.000Z",
    },
    {
      id: "client_maison_celeste",
      companyName: "Maison Céleste — Concept Store",
      sector: "Boutique Prêt-à-porter & Déco",
      city: "Villefranche-sur-Saône",
      nafCode: "4771Z",
      employeeCount: 4,
      contactName: "Clara Garnier",
      contactEmail: "bonjour@maison-celeste.fr",
      contactPhone: "04 74 68 42 11",
      avgBasketValue: 65.0,
      shareToken: "maison-celeste",
      websiteUrl: "https://vitrine-caladoise.fr/commerces/maison-celeste",
      gmbPlaceId: "ChIJ_Calade_Celeste_204",
      igUsername: "@maisonceleste.calade",
      tiktokUsername: "@maisonceleste",
      clarityProjectId: "clr_vitrine_celeste",
      metaPixelId: null,
      ga4PropertyId: "G-VITRINE44",
      createdAt: "2026-08-01T14:00:00.000Z",
      updatedAt: "2026-11-08T16:15:00.000Z",
    },
    {
      id: "client_chai_pierres_dorees",
      companyName: "Le Chai des Pierres Dorées",
      sector: "Caviste & Bar à Dégustation",
      city: "Villefranche-sur-Saône",
      nafCode: "4725Z",
      employeeCount: 6,
      contactName: "Antoine Delorme",
      contactEmail: "contact@chai-pierres-dorees.fr",
      contactPhone: "04 74 60 77 35",
      avgBasketValue: 85.0,
      shareToken: "chai-pierres-dorees",
      websiteUrl: "https://chai-pierres-dorees.fr",
      gmbPlaceId: "ChIJ_Calade_Chai_552",
      igUsername: "@chaipierresdorees",
      tiktokUsername: "@chaipierresdorees",
      clarityProjectId: "clr_chai_7710",
      metaPixelId: "3391048572610",
      ga4PropertyId: "G-CHAI69400",
      createdAt: "2026-07-10T09:30:00.000Z",
      updatedAt: "2026-11-08T19:00:00.000Z",
    },
  ];

  // Pont d'Upsell : Le Bistrot Caladois est actif dans les DEUX Workspaces (VITRINE + ALSEK)
  const clientWorkspaces: ClientWorkspaceRecord[] = [
    {
      id: "cw_bistrot_vitrine",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_vitrine",
      status: "ACTIVE",
      joinedAt: "2026-06-15T10:00:00.000Z",
    },
    {
      id: "cw_bistrot_alsek",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_alsek",
      status: "ACTIVE",
      joinedAt: "2026-07-20T10:00:00.000Z",
    },
    {
      id: "cw_celeste_vitrine",
      clientId: "client_maison_celeste",
      workspaceId: "ws_vitrine",
      status: "ACTIVE",
      joinedAt: "2026-08-01T14:00:00.000Z",
    },
    {
      id: "cw_chai_alsek",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      status: "ACTIVE",
      joinedAt: "2026-07-10T09:30:00.000Z",
    },
  ];

  const audits: AuditSnapshotRecord[] = [
    // 1. Le Bistrot Caladois : T0 vs Actuel
    {
      id: "audit_bistrot_t0",
      clientId: "client_bistrot_caladois",
      isInitialT0: true,
      gmbRating: 4.1,
      gmbReviewsCount: 68,
      igFollowers: 420,
      igPostsCount: 18,
      hasWebsite: true,
      hasSsl: false,
      hasMetaPixel: false,
      hasClarity: false,
      visibilityScore: 34,
      rawNotes:
        "Audit initial (T0) : Site non sécurisé HTTP, aucune vidéo courte publiée, fiche GMB non optimisée et absence de module de réservation tracké.",
      recordedAt: "2026-06-15T11:00:00.000Z",
    },
    {
      id: "audit_bistrot_current",
      clientId: "client_bistrot_caladois",
      isInitialT0: false,
      gmbRating: 4.7,
      gmbReviewsCount: 194,
      igFollowers: 2850,
      igPostsCount: 64,
      hasWebsite: true,
      hasSsl: true,
      hasMetaPixel: true,
      hasClarity: true,
      visibilityScore: 88,
      rawNotes:
        "Audit M+5 : +126 avis Google 5★, refonte landing page réservation HTTPS avec Meta Pixel & Clarity, forte traction organique via Vitrine Caladoise + Alsek.",
      recordedAt: "2026-11-05T15:00:00.000Z",
    },
    // 2. Maison Céleste : T0 vs Actuel
    {
      id: "audit_celeste_t0",
      clientId: "client_maison_celeste",
      isInitialT0: true,
      gmbRating: 4.3,
      gmbReviewsCount: 19,
      igFollowers: 610,
      igPostsCount: 32,
      hasWebsite: false,
      hasSsl: false,
      hasMetaPixel: false,
      hasClarity: false,
      visibilityScore: 28,
      rawNotes:
        "Audit initial (T0) : Aucune présence web hors Instagram, notoriété limitée au passage piéton rue d'Anse.",
      recordedAt: "2026-08-01T15:00:00.000Z",
    },
    {
      id: "audit_celeste_current",
      clientId: "client_maison_celeste",
      isInitialT0: false,
      gmbRating: 4.8,
      gmbReviewsCount: 54,
      igFollowers: 1690,
      igPostsCount: 58,
      hasWebsite: true,
      hasSsl: true,
      hasMetaPixel: false,
      hasClarity: true,
      visibilityScore: 71,
      rawNotes:
        "Audit M+3 : Page vitrine dédiée sur vitrine-caladoise.fr avec tracking Clarity. Prête pour un upsell site e-commerce & Pixel Meta via Alsek.",
      recordedAt: "2026-11-04T10:00:00.000Z",
    },
    // 3. Le Chai des Pierres Dorées : T0 vs Actuel
    {
      id: "audit_chai_t0",
      clientId: "client_chai_pierres_dorees",
      isInitialT0: true,
      gmbRating: 4.4,
      gmbReviewsCount: 42,
      igFollowers: 380,
      igPostsCount: 14,
      hasWebsite: true,
      hasSsl: true,
      hasMetaPixel: false,
      hasClarity: false,
      visibilityScore: 45,
      rawNotes:
        "Audit initial (T0) : Belle cave physique mais 0 acquisition digitale sur les soirées dégustation entreprises et coffrets cadeaux B2B.",
      recordedAt: "2026-07-10T11:00:00.000Z",
    },
    {
      id: "audit_chai_current",
      clientId: "client_chai_pierres_dorees",
      isInitialT0: false,
      gmbRating: 4.9,
      gmbReviewsCount: 128,
      igFollowers: 3120,
      igPostsCount: 52,
      hasWebsite: true,
      hasSsl: true,
      hasMetaPixel: true,
      hasClarity: true,
      visibilityScore: 92,
      rawNotes:
        "Audit M+4 : Funnel B2B coffrets & réservations dégustations 100% tracké. Excellente conversion mobile mesurée sur Clarity.",
      recordedAt: "2026-11-06T17:00:00.000Z",
    },
  ];

  const commercialEntries: CommercialEntryRecord[] = [
    // Ventes Le Bistrot Caladois (Double Portefeuille : Vitrine + Alsek)
    {
      id: "sale_bistrot_1",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_vitrine",
      productName: "Pack Reportage Immersion + Mise en avant Vitrine Caladoise",
      billingType: "ONE_SHOT",
      amountSoldHt: 890,
      paymentStatus: "PAID",
      clientRevenueGenerated: 4200,
      leadsGenerated: 100,
      periodDate: "2026-06-20T10:00:00.000Z",
      notes: "100 couverts générés dès les 3 premières semaines via le code promo VITRINE.",
    },
    {
      id: "sale_bistrot_2",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_alsek",
      productName: "Refonte Landing Page Réservation + Setup Pixel & Clarity",
      billingType: "ONE_SHOT",
      amountSoldHt: 1600,
      paymentStatus: "PAID",
      clientRevenueGenerated: 5460,
      leadsGenerated: 130,
      periodDate: "2026-08-05T10:00:00.000Z",
      notes: "Tunnel de réservation table en 2 clics sur mobile.",
    },
    {
      id: "sale_bistrot_3",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_alsek",
      productName: "Accompagnement Mensuel — 4 Reels + Meta Ads Local",
      billingType: "RECURRING_MRR",
      amountSoldHt: 1250,
      paymentStatus: "PAID",
      clientRevenueGenerated: 9660,
      leadsGenerated: 230,
      periodDate: "2026-11-01T09:00:00.000Z",
      notes: "Service complet vendredi & samedi soir grâce aux Reels géolocalisés 15km.",
    },

    // Ventes Maison Céleste (Vitrine Caladoise)
    {
      id: "sale_celeste_1",
      clientId: "client_maison_celeste",
      workspaceId: "ws_vitrine",
      productName: "Pack Reel Découverte + Page Commerçant Vitrine Caladoise",
      billingType: "ONE_SHOT",
      amountSoldHt: 590,
      paymentStatus: "PAID",
      clientRevenueGenerated: 3575,
      leadsGenerated: 55,
      periodDate: "2026-08-12T10:00:00.000Z",
      notes: "Rupture de stock sur la collection capsule automne en 5 jours.",
    },
    {
      id: "sale_celeste_2",
      clientId: "client_maison_celeste",
      workspaceId: "ws_vitrine",
      productName: "Opération Noël Caladois — Reel + Story Jeu Concours",
      billingType: "ONE_SHOT",
      amountSoldHt: 450,
      paymentStatus: "PENDING",
      clientRevenueGenerated: 1950,
      leadsGenerated: 30,
      periodDate: "2026-11-02T14:00:00.000Z",
      notes: "Tournage effectué, règlement en attente de virement.",
    },

    // Ventes Le Chai des Pierres Dorées (Alsek Marketing)
    {
      id: "sale_chai_1",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      productName: "Création Site Vitrine & Catalogue Coffrets B2B",
      billingType: "ONE_SHOT",
      amountSoldHt: 2400,
      paymentStatus: "PAID",
      clientRevenueGenerated: 16150,
      leadsGenerated: 190,
      periodDate: "2026-07-22T09:00:00.000Z",
      notes: "14 entreprises locales ont commandé leurs coffrets clients via le formulaire.",
    },
    {
      id: "sale_chai_2",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      productName: "Retainer Mensuel Content & Acquisition Soirées Dégustation",
      billingType: "RECURRING_MRR",
      amountSoldHt: 1500,
      paymentStatus: "PAID",
      clientRevenueGenerated: 10200,
      leadsGenerated: 120,
      periodDate: "2026-10-05T09:00:00.000Z",
      notes: "Soirées accords mets & vins complètes 3 semaines à l'avance.",
    },
    {
      id: "sale_chai_3",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      productName: "Campagne Spéciale Beaujolais Nouveau — Pack 3 Shorts",
      billingType: "ONE_SHOT",
      amountSoldHt: 690,
      paymentStatus: "OVERDUE",
      clientRevenueGenerated: 2550,
      leadsGenerated: 30,
      periodDate: "2026-10-25T09:00:00.000Z",
      notes: "Échéance dépassée de 5 jours — relance cordiale prévue.",
    },
  ];

  const trackedPosts: TrackedPostRecord[] = [
    // Bistrot Caladois
    {
      id: "post_bistrot_1",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_vitrine",
      platform: "INSTAGRAM",
      postUrl: "https://www.instagram.com/reel/C9VitrineBistrot01/",
      titleOrHook: "On a testé la côte de bœuf maturée du Bistrot Caladois 🔥🥩",
      thumbnailUrl: null,
      publishedAt: "2026-09-12T17:30:00.000Z",
      isActiveTrack: true,
    },
    {
      id: "post_bistrot_2",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_alsek",
      platform: "TIKTOK",
      postUrl: "https://www.tiktok.com/@bistrotcaladois/video/74198201928374",
      titleOrHook: "Le secret de notre sauce au Morgon révélé par le Chef 🍷👨‍🍳",
      thumbnailUrl: null,
      publishedAt: "2026-10-08T18:00:00.000Z",
      isActiveTrack: true,
    },
    {
      id: "post_bistrot_3",
      clientId: "client_bistrot_caladois",
      workspaceId: "ws_alsek",
      platform: "INSTAGRAM",
      postUrl: "https://www.instagram.com/reel/DBAlsekBistrotService/",
      titleOrHook: "Immersion en cuisine : coup de feu du vendredi soir à Villefranche ⚡",
      thumbnailUrl: null,
      publishedAt: "2026-10-24T18:15:00.000Z",
      isActiveTrack: true,
    },

    // Maison Céleste
    {
      id: "post_celeste_1",
      clientId: "client_maison_celeste",
      workspaceId: "ws_vitrine",
      platform: "INSTAGRAM",
      postUrl: "https://www.instagram.com/reel/C_VitrineCelesteLook/",
      titleOrHook: "3 pépites mode & déco à découvrir rue d'Anse chez Maison Céleste ✨",
      thumbnailUrl: null,
      publishedAt: "2026-09-18T12:00:00.000Z",
      isActiveTrack: true,
    },
    {
      id: "post_celeste_2",
      clientId: "client_maison_celeste",
      workspaceId: "ws_vitrine",
      platform: "FACEBOOK",
      postUrl: "https://www.facebook.com/reel/109283746519283",
      titleOrHook: "Portrait de commerçante : Clara nous ouvre les portes de sa boutique 🛍️",
      thumbnailUrl: null,
      publishedAt: "2026-10-19T11:30:00.000Z",
      isActiveTrack: true,
    },

    // Le Chai des Pierres Dorées
    {
      id: "post_chai_1",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      platform: "INSTAGRAM",
      postUrl: "https://www.instagram.com/reel/DAAlsekChaiCru/",
      titleOrHook: "Comment choisir le cru du Beaujolais parfait pour votre repas ? 🍇",
      thumbnailUrl: null,
      publishedAt: "2026-09-28T18:30:00.000Z",
      isActiveTrack: true,
    },
    {
      id: "post_chai_2",
      clientId: "client_chai_pierres_dorees",
      workspaceId: "ws_alsek",
      platform: "YOUTUBE",
      postUrl: "https://www.youtube.com/shorts/ChaiDegustationB2B",
      titleOrHook: "Dans les coulisses de nos soirées dégustation privées en cave voûtée 🕯️🍷",
      thumbnailUrl: null,
      publishedAt: "2026-10-21T17:00:00.000Z",
      isActiveTrack: true,
    },
  ];

  // Historique temporel des KPIs vidéos pour tracer la courbe d'évolution (PostMetricSnapshot)
  const postMetrics: PostMetricSnapshotRecord[] = [
    // post_bistrot_1 (Vitrine IG Reel : 8k -> 19k -> 34k -> 48.2k)
    {
      id: "pm_b1_1",
      postId: "post_bistrot_1",
      views: 8400,
      likes: 410,
      comments: 38,
      shares: 95,
      saves: 140,
      engagementRate: 8.13,
      recordedAt: "2026-09-14T18:00:00.000Z",
    },
    {
      id: "pm_b1_2",
      postId: "post_bistrot_1",
      views: 19600,
      likes: 920,
      comments: 84,
      shares: 210,
      saves: 310,
      engagementRate: 7.78,
      recordedAt: "2026-09-21T18:00:00.000Z",
    },
    {
      id: "pm_b1_3",
      postId: "post_bistrot_1",
      views: 34800,
      likes: 1580,
      comments: 142,
      shares: 330,
      saves: 520,
      engagementRate: 7.39,
      recordedAt: "2026-10-05T18:00:00.000Z",
    },
    {
      id: "pm_b1_4",
      postId: "post_bistrot_1",
      views: 48200,
      likes: 2140,
      comments: 186,
      shares: 410,
      saves: 690,
      engagementRate: 7.11,
      recordedAt: "2026-11-07T18:00:00.000Z",
    },

    // post_bistrot_2 (Alsek TikTok : 12k -> 29k -> 51k -> 64.8k)
    {
      id: "pm_b2_1",
      postId: "post_bistrot_2",
      views: 12300,
      likes: 890,
      comments: 54,
      shares: 110,
      saves: 210,
      engagementRate: 10.28,
      recordedAt: "2026-10-10T18:00:00.000Z",
    },
    {
      id: "pm_b2_2",
      postId: "post_bistrot_2",
      views: 29400,
      likes: 2050,
      comments: 118,
      shares: 260,
      saves: 470,
      engagementRate: 9.86,
      recordedAt: "2026-10-18T18:00:00.000Z",
    },
    {
      id: "pm_b2_3",
      postId: "post_bistrot_2",
      views: 51200,
      likes: 3490,
      comments: 195,
      shares: 410,
      saves: 740,
      engagementRate: 9.44,
      recordedAt: "2026-10-29T18:00:00.000Z",
    },
    {
      id: "pm_b2_4",
      postId: "post_bistrot_2",
      views: 64800,
      likes: 4310,
      comments: 245,
      shares: 520,
      saves: 910,
      engagementRate: 9.24,
      recordedAt: "2026-11-08T10:00:00.000Z",
    },

    // post_bistrot_3 (Alsek IG Reel : 6.5k -> 18.2k -> 31.5k)
    {
      id: "pm_b3_1",
      postId: "post_bistrot_3",
      views: 6500,
      likes: 340,
      comments: 28,
      shares: 45,
      saves: 88,
      engagementRate: 7.71,
      recordedAt: "2026-10-26T18:00:00.000Z",
    },
    {
      id: "pm_b3_2",
      postId: "post_bistrot_3",
      views: 18200,
      likes: 860,
      comments: 62,
      shares: 115,
      saves: 210,
      engagementRate: 6.85,
      recordedAt: "2026-11-01T18:00:00.000Z",
    },
    {
      id: "pm_b3_3",
      postId: "post_bistrot_3",
      views: 31500,
      likes: 1420,
      comments: 94,
      shares: 185,
      saves: 340,
      engagementRate: 6.47,
      recordedAt: "2026-11-08T12:00:00.000Z",
    },

    // post_celeste_1 (Vitrine IG Reel)
    {
      id: "pm_c1_1",
      postId: "post_celeste_1",
      views: 5200,
      likes: 310,
      comments: 29,
      shares: 64,
      saves: 115,
      engagementRate: 9.96,
      recordedAt: "2026-09-20T18:00:00.000Z",
    },
    {
      id: "pm_c1_2",
      postId: "post_celeste_1",
      views: 14800,
      likes: 820,
      comments: 74,
      shares: 155,
      saves: 290,
      engagementRate: 9.05,
      recordedAt: "2026-10-04T18:00:00.000Z",
    },
    {
      id: "pm_c1_3",
      postId: "post_celeste_1",
      views: 26400,
      likes: 1390,
      comments: 118,
      shares: 240,
      saves: 460,
      engagementRate: 8.36,
      recordedAt: "2026-11-07T18:00:00.000Z",
    },

    // post_celeste_2 (Vitrine FB Reel)
    {
      id: "pm_c2_1",
      postId: "post_celeste_2",
      views: 4900,
      likes: 240,
      comments: 34,
      shares: 52,
      saves: 40,
      engagementRate: 7.47,
      recordedAt: "2026-10-22T18:00:00.000Z",
    },
    {
      id: "pm_c2_2",
      postId: "post_celeste_2",
      views: 15900,
      likes: 760,
      comments: 92,
      shares: 148,
      saves: 120,
      engagementRate: 7.04,
      recordedAt: "2026-11-08T09:00:00.000Z",
    },

    // post_chai_1 (Alsek IG Reel)
    {
      id: "pm_ch1_1",
      postId: "post_chai_1",
      views: 9100,
      likes: 520,
      comments: 44,
      shares: 130,
      saves: 260,
      engagementRate: 10.48,
      recordedAt: "2026-10-02T18:00:00.000Z",
    },
    {
      id: "pm_ch1_2",
      postId: "post_chai_1",
      views: 24700,
      likes: 1340,
      comments: 98,
      shares: 310,
      saves: 640,
      engagementRate: 9.67,
      recordedAt: "2026-10-16T18:00:00.000Z",
    },
    {
      id: "pm_ch1_3",
      postId: "post_chai_1",
      views: 42900,
      likes: 2280,
      comments: 164,
      shares: 540,
      saves: 1120,
      engagementRate: 9.57,
      recordedAt: "2026-11-08T11:00:00.000Z",
    },

    // post_chai_2 (Alsek YouTube Short)
    {
      id: "pm_ch2_1",
      postId: "post_chai_2",
      views: 7400,
      likes: 390,
      comments: 26,
      shares: 65,
      saves: 95,
      engagementRate: 7.78,
      recordedAt: "2026-10-25T18:00:00.000Z",
    },
    {
      id: "pm_ch2_2",
      postId: "post_chai_2",
      views: 21800,
      likes: 1150,
      comments: 72,
      shares: 190,
      saves: 280,
      engagementRate: 7.76,
      recordedAt: "2026-11-08T11:30:00.000Z",
    },
  ];

  const webMetrics: WebMetricSnapshotRecord[] = [
    // Bistrot Caladois
    {
      id: "wm_bistrot_1",
      clientId: "client_bistrot_caladois",
      sessionsCount: 1420,
      uniqueVisitors: 1150,
      clarityRageClicks: 24,
      clarityDeadClicks: 38,
      pixelPageViews: 2890,
      pixelLeadsOrCalls: 68,
      recordedAt: "2026-08-31T20:00:00.000Z",
    },
    {
      id: "wm_bistrot_2",
      clientId: "client_bistrot_caladois",
      sessionsCount: 2840,
      uniqueVisitors: 2290,
      clarityRageClicks: 9,
      clarityDeadClicks: 14,
      pixelPageViews: 5920,
      pixelLeadsOrCalls: 162,
      recordedAt: "2026-09-30T20:00:00.000Z",
    },
    {
      id: "wm_bistrot_3",
      clientId: "client_bistrot_caladois",
      sessionsCount: 4380,
      uniqueVisitors: 3610,
      clarityRageClicks: 3,
      clarityDeadClicks: 6,
      pixelPageViews: 9410,
      pixelLeadsOrCalls: 284,
      recordedAt: "2026-11-07T20:00:00.000Z",
    },

    // Maison Céleste
    {
      id: "wm_celeste_1",
      clientId: "client_maison_celeste",
      sessionsCount: 890,
      uniqueVisitors: 740,
      clarityRageClicks: 6,
      clarityDeadClicks: 11,
      pixelPageViews: 1620,
      pixelLeadsOrCalls: 34,
      recordedAt: "2026-09-30T20:00:00.000Z",
    },
    {
      id: "wm_celeste_2",
      clientId: "client_maison_celeste",
      sessionsCount: 1760,
      uniqueVisitors: 1490,
      clarityRageClicks: 2,
      clarityDeadClicks: 5,
      pixelPageViews: 3480,
      pixelLeadsOrCalls: 85,
      recordedAt: "2026-11-07T20:00:00.000Z",
    },

    // Le Chai des Pierres Dorées
    {
      id: "wm_chai_1",
      clientId: "client_chai_pierres_dorees",
      sessionsCount: 1950,
      uniqueVisitors: 1610,
      clarityRageClicks: 8,
      clarityDeadClicks: 12,
      pixelPageViews: 4210,
      pixelLeadsOrCalls: 114,
      recordedAt: "2026-09-30T20:00:00.000Z",
    },
    {
      id: "wm_chai_2",
      clientId: "client_chai_pierres_dorees",
      sessionsCount: 3520,
      uniqueVisitors: 2890,
      clarityRageClicks: 2,
      clarityDeadClicks: 4,
      pixelPageViews: 7850,
      pixelLeadsOrCalls: 226,
      recordedAt: "2026-11-07T20:00:00.000Z",
    },
  ];

  const clientModules: ClientModuleRecord[] = [
    // Bistrot Caladois
    {
      id: "cm_bistrot_gmb",
      clientId: "client_bistrot_caladois",
      moduleType: "GMB_AUTO_REPLY",
      isEnabled: true,
      configJson: {
        brandTone: "Chaleureux, commerçant & authentique",
        autoPublishMinStars: 4,
        seoKeywords: "restaurant Villefranche-sur-Saône, bistrot Calade, cuisine maison Beaujolais",
        signatureName: "Thomas & l'équipe du Bistrot Caladois",
      },
      updatedAt: "2026-11-06T10:00:00.000Z",
    },
    {
      id: "cm_bistrot_comp",
      clientId: "client_bistrot_caladois",
      moduleType: "COMPETITOR_WATCH",
      isEnabled: true,
      configJson: {
        competitorsList: "Brasserie du Théâtre, L'Atelier Gourmand Calade, Le Promenoir",
        alertThresholdViews: 15000,
        scanFrequency: "WEEKLY",
      },
      updatedAt: "2026-11-06T10:00:00.000Z",
    },
    {
      id: "cm_bistrot_grants",
      clientId: "client_bistrot_caladois",
      moduleType: "STATE_GRANTS_RADAR",
      isEnabled: true,
      configJson: {
        regionTarget: "Auvergne-Rhône-Alpes (69 - Villefranche Beaujolais)",
        focusThemes: "Numérique, Transition Écologique Restauration, Terrasses",
        minGrantAmountEur: 500,
      },
      updatedAt: "2026-11-06T10:00:00.000Z",
    },
    {
      id: "cm_bistrot_clarity",
      clientId: "client_bistrot_caladois",
      moduleType: "CLARITY_UX_ALERTS",
      isEnabled: true,
      configJson: {
        maxRageClicksThreshold: 10,
        maxDeadClicksThreshold: 15,
      },
      updatedAt: "2026-11-06T10:00:00.000Z",
    },

    // Maison Céleste
    {
      id: "cm_celeste_gmb",
      clientId: "client_maison_celeste",
      moduleType: "GMB_AUTO_REPLY",
      isEnabled: true,
      configJson: {
        brandTone: "Chaleureux, commerçant & authentique",
        autoPublishMinStars: 4,
        seoKeywords: "concept store Villefranche, boutique mode déco Calade",
        signatureName: "Clara — Maison Céleste",
      },
      updatedAt: "2026-11-05T10:00:00.000Z",
    },
    {
      id: "cm_celeste_grants",
      clientId: "client_maison_celeste",
      moduleType: "STATE_GRANTS_RADAR",
      isEnabled: true,
      configJson: {
        regionTarget: "Auvergne-Rhône-Alpes (69 - Calade)",
        focusThemes: "Chèque Numérique Commerce Local, Création Site E-commerce",
        minGrantAmountEur: 500,
      },
      updatedAt: "2026-11-05T10:00:00.000Z",
    },
    {
      id: "cm_celeste_comp",
      clientId: "client_maison_celeste",
      moduleType: "COMPETITOR_WATCH",
      isEnabled: false,
      configJson: {
        competitorsList: "Boutique Bohème Rue Nationale, L'Appartement Caladois",
        alertThresholdViews: 10000,
        scanFrequency: "WEEKLY",
      },
      updatedAt: "2026-11-05T10:00:00.000Z",
    },

    // Le Chai des Pierres Dorées
    {
      id: "cm_chai_gmb",
      clientId: "client_chai_pierres_dorees",
      moduleType: "GMB_AUTO_REPLY",
      isEnabled: true,
      configJson: {
        brandTone: "Premium, gastronomique & soigné",
        autoPublishMinStars: 5,
        seoKeywords: "caviste Villefranche-sur-Saône, bar à vin Beaujolais, dégustation Pierres Dorées",
        signatureName: "Antoine, Sommelier au Chai des Pierres Dorées",
      },
      updatedAt: "2026-11-06T12:00:00.000Z",
    },
    {
      id: "cm_chai_comp",
      clientId: "client_chai_pierres_dorees",
      moduleType: "COMPETITOR_WATCH",
      isEnabled: true,
      configJson: {
        competitorsList: "Cave Beaujolaise Centre, Les Grands Vins d'Anse",
        alertThresholdViews: 12000,
        scanFrequency: "WEEKLY",
      },
      updatedAt: "2026-11-06T12:00:00.000Z",
    },
    {
      id: "cm_chai_grants",
      clientId: "client_chai_pierres_dorees",
      moduleType: "STATE_GRANTS_RADAR",
      isEnabled: true,
      configJson: {
        regionTarget: "Auvergne-Rhône-Alpes / Oenotourisme Beaujolais",
        focusThemes: "Oenotourisme, Digitalisation Cave, Subvention Commerce Indépendant",
        minGrantAmountEur: 1000,
      },
      updatedAt: "2026-11-06T12:00:00.000Z",
    },
  ];

  const automationEvents: AutomationEventRecord[] = [
    {
      id: "evt_bistrot_1",
      clientId: "client_bistrot_caladois",
      moduleType: "GMB_AUTO_REPLY",
      title: "Nouvel avis 5★ de Laurent V. répondu automatiquement (SEO Local)",
      payloadJson: {
        reviewer: "Laurent V.",
        rating: 5,
        reviewExcerpt: "Meilleure côte de bœuf de Villefranche ! Service rapide et carte des vins au top.",
        aiDraftReply:
          "Merci beaucoup Laurent pour ces 5 étoiles ! Toute l'équipe du Bistrot Caladois à Villefranche-sur-Saône est ravie que notre côte de bœuf maturée et notre sélection de crus du Beaujolais vous aient conquis. À très vite en Calade ! — Thomas & l'équipe",
      },
      status: "SUCCESS",
      createdAt: "2026-11-08T08:15:00.000Z",
    },
    {
      id: "evt_bistrot_2",
      clientId: "client_bistrot_caladois",
      moduleType: "COMPETITOR_WATCH",
      title: "Veille Calade : Le Bistrot Caladois capte 62% des vues Reels restauration cette semaine",
      payloadJson: {
        monitoredCompetitors: ["Brasserie du Théâtre", "L'Atelier Gourmand Calade"],
        insight:
          "Votre Reel 'Sauce au Morgon' surpasse de +310% la moyenne des publications concurrentes locales sur les 7 derniers jours.",
      },
      status: "SUCCESS",
      createdAt: "2026-11-07T09:00:00.000Z",
    },
    {
      id: "evt_celeste_1",
      clientId: "client_maison_celeste",
      moduleType: "STATE_GRANTS_RADAR",
      title: "Aide détectée : Subvention 'Mon Commerce En Ligne AURA' (1 500 €) — Argument Upsell Alsek",
      payloadJson: {
        grantName: "Mon Commerce En Ligne — Région Auvergne-Rhône-Alpes",
        maxAmountEur: 1500,
        nafCode: "4771Z",
        employeeCount: 4,
        upsellOpportunity:
          "Éligibilité confirmée (TPE < 10 salariés, NAF 4771Z). Permet de financer 50% de la création du futur site e-commerce par Alsek Marketing !",
      },
      status: "PENDING_APPROVAL",
      createdAt: "2026-11-08T07:30:00.000Z",
    },
    {
      id: "evt_chai_1",
      clientId: "client_chai_pierres_dorees",
      moduleType: "GMB_AUTO_REPLY",
      title: "Avis 4★ de Nathalie B. — Brouillon IA en attente de validation",
      payloadJson: {
        reviewer: "Nathalie B.",
        rating: 4,
        reviewExcerpt: "Super soirée dégustation, un peu d'attente au moment du règlement mais vins incroyables.",
        aiDraftReply:
          "Merci Nathalie pour votre visite au Chai des Pierres Dorées ! Nous sommes ravis que notre sélection de crus vous ait plu et prenons bonne note pour fluidifier l'encaissement lors des soirées forte affluence. Au plaisir de vous conseiller à nouveau ! — Antoine",
      },
      status: "PENDING_APPROVAL",
      createdAt: "2026-11-08T09:45:00.000Z",
    },
  ];

  return {
    workspaces,
    clients,
    clientWorkspaces,
    audits,
    commercialEntries,
    trackedPosts,
    postMetrics,
    webMetrics,
    clientModules,
    automationEvents,
  };
}
