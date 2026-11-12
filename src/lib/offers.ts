import type { WorkspaceSlugType } from "./seed-data";

export type OfferTypeKey =
  | "ESSENTIEL"
  | "EVOLUTION"
  | "MAITRISE"
  | "PACK_MEDIA_VITRINE"
  | "SUR_MESURE";

/** Catalogue d'offres : prix HT de référence */
export const OFFER_CATALOG: Record<OfferTypeKey, { label: string; amountHt: number | null }> = {
  ESSENTIEL: { label: "Essentiel", amountHt: 160 },
  EVOLUTION: { label: "Évolution", amountHt: 300 },
  MAITRISE: { label: "Maîtrise", amountHt: 500 },
  PACK_MEDIA_VITRINE: { label: "Pack Média Vitrine", amountHt: null },
  SUR_MESURE: { label: "Sur-mesure", amountHt: null },
};

/** Déduit l'offre du catalogue à partir du portefeuille et du montant HT */
export function inferOffer(
  workspaceSlug: WorkspaceSlugType,
  amountHt: number
): OfferTypeKey {
  if (workspaceSlug === "VITRINE") return "PACK_MEDIA_VITRINE";
  if (amountHt === 160) return "ESSENTIEL";
  if (amountHt === 300) return "EVOLUTION";
  if (amountHt === 500) return "MAITRISE";
  return "SUR_MESURE";
}
