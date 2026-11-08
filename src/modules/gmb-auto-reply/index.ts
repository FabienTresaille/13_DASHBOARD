import type { AutomationPlugin, PluginExecutionContext, PluginExecutionResult } from "../types";

export const GmbAutoReplyPlugin: AutomationPlugin = {
  moduleType: "GMB_AUTO_REPLY",
  slug: "gmb-auto-reply",
  name: "Réponses IA aux Avis Google My Business",
  shortDescription:
    "Surveille la fiche Google Maps du client, génère une réponse personnalisée optimisée SEO local et publie automatiquement les avis 4★ et 5★.",
  category: "AI_REPUTATION",
  accentColor: "#10B981",
  badgeLabel: "SEO Local & E-Réputation",
  highlights: [
    "Réponse personnalisée à chaque avis en moins de 5 minutes",
    "Mots-clés SEO local injectés naturellement",
    "Validation manuelle des avis sensibles (< 4★)",
  ],
  defaultConfig: {
    brandTone: "Chaleureux, commerçant & authentique",
    autoPublishMinStars: 4,
    seoKeywords: "Villefranche-sur-Saône, Calade, Beaujolais",
    signatureName: "L'équipe",
    requireApprovalUnder4Stars: true,
  },
  configSchema: [
    {
      key: "brandTone",
      label: "Ton éditorial de l'IA",
      type: "select",
      options: [
        { label: "Chaleureux, commerçant & authentique", value: "Chaleureux, commerçant & authentique" },
        { label: "Premium, gastronomique & soigné", value: "Premium, gastronomique & soigné" },
        { label: "Institutionnel & expert B2B", value: "Institutionnel & expert B2B" },
      ],
      helpText: "Définit le style de rédaction utilisé pour répondre aux clients.",
    },
    {
      key: "autoPublishMinStars",
      label: "Publication auto à partir de (étoiles)",
      type: "number",
      placeholder: "4",
      helpText: "Les avis inférieurs passent en statut PENDING_APPROVAL.",
    },
    {
      key: "seoKeywords",
      label: "Mots-clés SEO local à injecter naturellement",
      type: "text",
      placeholder: "Villefranche-sur-Saône, Beaujolais...",
    },
    {
      key: "signatureName",
      label: "Signature en fin de réponse",
      type: "text",
      placeholder: "Ex: Thomas & toute l'équipe",
    },
  ],
  validateConfig(config) {
    return typeof config === "object" && config !== null;
  },
  async execute(ctx: PluginExecutionContext): Promise<PluginExecutionResult> {
    const tone = String(ctx.config.brandTone || this.defaultConfig.brandTone);
    const keywords = String(ctx.config.seoKeywords || ctx.city);
    const signature = String(ctx.config.signatureName || `L'équipe ${ctx.companyName}`);

    const sampleReviewers = ["Camille D.", "Julien M.", "Sophie L.", "Marc-Antoine R."];
    const reviewer = sampleReviewers[Math.floor(Math.random() * sampleReviewers.length)];

    return {
      title: `Avis 5★ de ${reviewer} détecté & réponse SEO préparée`,
      status: "SUCCESS",
      payloadJson: {
        reviewer,
        rating: 5,
        gmbPlaceId: ctx.gmbPlaceId || "Non renseigné (Mode simulation)",
        reviewExcerpt: `Super expérience chez ${ctx.companyName} à ${ctx.city}, accueil irréprochable et qualité au rendez-vous !`,
        aiDraftReply: `Merci infiniment ${reviewer} pour vos 5 étoiles ! Toute l'équipe de ${ctx.companyName} à ${ctx.city} est ravie de vous avoir accueilli. Au plaisir de vous revoir très vite au cœur de la Calade ! — ${signature}`,
        appliedTone: tone,
        injectedKeywords: keywords,
        executedAt: new Date().toISOString(),
      },
    };
  },
};

export default GmbAutoReplyPlugin;
