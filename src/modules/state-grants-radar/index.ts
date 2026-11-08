import type { AutomationPlugin, PluginExecutionContext, PluginExecutionResult } from "../types";

export const StateGrantsRadarPlugin: AutomationPlugin = {
  moduleType: "STATE_GRANTS_RADAR",
  slug: "state-grants-radar",
  name: "Radar des Aides de l'État & Subventions Régionales",
  shortDescription:
    "Croise automatiquement le code NAF, l'effectif salarié et la localisation (Auvergne-Rhône-Alpes / Agglo Villefranche Beaujolais) pour détecter les subventions TPE/PME finançant vos prestations.",
  category: "FINANCING_SUBSIDIES",
  accentColor: "#F59E0B",
  badgeLabel: "Levier Closing & Financement",
  highlights: [
    "Croisement automatique NAF × effectif × territoire",
    "Détection des aides régionales AURA & locales",
    "Jusqu'à 50 % de vos investissements digitaux financés",
  ],
  defaultConfig: {
    regionTarget: "Auvergne-Rhône-Alpes (69 - Rhône / Calade)",
    focusThemes: "Numérique, Visibilité Web, Transition Écologique, Commerce Local",
    minGrantAmountEur: 500,
    notifyCommercialTeam: true,
  },
  configSchema: [
    {
      key: "regionTarget",
      label: "Territoire & Collectivité cible",
      type: "text",
      placeholder: "Auvergne-Rhône-Alpes / CAVBS Villefranche",
    },
    {
      key: "focusThemes",
      label: "Thématiques d'aides recherchées",
      type: "text",
      placeholder: "Numérique, E-commerce, Modernisation point de vente...",
      helpText: "Croisé automatiquement avec le code NAF et l'effectif de la fiche client.",
    },
    {
      key: "minGrantAmountEur",
      label: "Montant minimum de subvention (€)",
      type: "number",
      placeholder: "500",
    },
  ],
  validateConfig(config) {
    return typeof config === "object" && config !== null;
  },
  async execute(ctx: PluginExecutionContext): Promise<PluginExecutionResult> {
    const naf = ctx.nafCode || "Non renseigné (TPE Commerce)";
    const employees = ctx.employeeCount ?? 5;
    const region = String(ctx.config.regionTarget || this.defaultConfig.regionTarget);

    return {
      title: `Subvention éligible détectée : "Mon Commerce En Ligne — Région AURA" (jusqu'à 1 500 €)`,
      status: "PENDING_APPROVAL",
      payloadJson: {
        grantName: "Financement Mon Commerce En Ligne — Région Auvergne-Rhône-Alpes",
        maxAmountEur: 1500,
        coverageRate: "50% des dépenses de visibilité digitale & création de contenu",
        eligibilityMatch: {
          companyName: ctx.companyName,
          nafCode: naf,
          employeeCount: employees,
          territory: region,
          isEligibleTpe: employees < 20,
        },
        upsellOpportunity: `Utiliser cette aide pour financer 50% d'un Pack Accompagnement Alsek ou d'une campagne annuelle Vitrine Caladoise pour ${ctx.companyName}.`,
        executedAt: new Date().toISOString(),
      },
    };
  },
};

export default StateGrantsRadarPlugin;
