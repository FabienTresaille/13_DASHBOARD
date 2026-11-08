import type { AutomationPlugin, ModuleTypeKey } from "./types";
import { GmbAutoReplyPlugin } from "./gmb-auto-reply";
import { CompetitorWatchPlugin } from "./competitor-watch";
import { StateGrantsRadarPlugin } from "./state-grants-radar";
import { ClarityUxAlertsPlugin } from "./clarity-ux-alerts";

export const AUTOMATION_PLUGINS: Record<ModuleTypeKey, AutomationPlugin> = {
  GMB_AUTO_REPLY: GmbAutoReplyPlugin,
  COMPETITOR_WATCH: CompetitorWatchPlugin,
  STATE_GRANTS_RADAR: StateGrantsRadarPlugin,
  CLARITY_UX_ALERTS: ClarityUxAlertsPlugin,
};

export const ALL_PLUGINS_LIST: AutomationPlugin[] = [
  GmbAutoReplyPlugin,
  CompetitorWatchPlugin,
  StateGrantsRadarPlugin,
  ClarityUxAlertsPlugin,
];

export function getPluginByType(moduleType: ModuleTypeKey): AutomationPlugin {
  return AUTOMATION_PLUGINS[moduleType];
}
