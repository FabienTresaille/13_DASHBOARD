export type ModuleTypeKey =
  | "GMB_AUTO_REPLY"
  | "COMPETITOR_WATCH"
  | "STATE_GRANTS_RADAR"
  | "CLARITY_UX_ALERTS";

export interface PluginConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "boolean" | "tags";
  placeholder?: string;
  options?: { label: string; value: string }[];
  helpText?: string;
  /** Pour les champs `tags` : nombre maximum d'éléments saisissables (ex: 3 concurrents) */
  maxItems?: number;
}

export interface PluginExecutionContext {
  clientId: string;
  companyName: string;
  sector: string;
  city: string;
  nafCode?: string | null;
  employeeCount?: number | null;
  gmbPlaceId?: string | null;
  clarityProjectId?: string | null;
  config: Record<string, unknown>;
}

export interface PluginExecutionResult {
  title: string;
  status: "SUCCESS" | "PENDING_APPROVAL" | "ALERT";
  payloadJson: Record<string, unknown>;
}

/**
 * Interface commune AutomationPlugin pour l'architecture extensible (Plugin-Ready)
 * Chaque brique métier dans /src/modules/[nom-du-module]/index.ts implémente ce contrat.
 */
export interface AutomationPlugin {
  moduleType: ModuleTypeKey;
  slug: string;
  name: string;
  shortDescription: string;
  category: "AI_REPUTATION" | "COMPETITIVE_INTEL" | "FINANCING_SUBSIDIES" | "UX_BEHAVIOR";
  accentColor: string;
  badgeLabel: string;
  /** Bénéfices clés affichés sur la carte "Fonctionnalité Pro" (optionnel, purement UI) */
  highlights?: string[];
  defaultConfig: Record<string, unknown>;
  configSchema: PluginConfigField[];
  validateConfig: (config: Record<string, unknown>) => boolean;
  execute: (ctx: PluginExecutionContext) => Promise<PluginExecutionResult>;
}
