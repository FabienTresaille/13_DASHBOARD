"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Building2,
  Sparkles,
  MapPin,
  Euro,
  Globe,
  Instagram,
  Phone,
  Mail,
  User,
  Hash,
  Users,
  CheckCircle2,
} from "lucide-react";
import { createClientAction } from "@/app/actions";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkspace?: "ALL" | "ALSEK" | "VITRINE";
}

export function CreateClientModal({
  isOpen,
  onClose,
  defaultWorkspace = "ALL",
}: CreateClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectAlsek, setSelectAlsek] = useState(
    defaultWorkspace === "ALL" || defaultWorkspace === "ALSEK"
  );
  const [selectVitrine, setSelectVitrine] = useState(
    defaultWorkspace === "ALL" || defaultWorkspace === "VITRINE"
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (selectAlsek) formData.set("ws_alsek", "on");
    else formData.delete("ws_alsek");
    if (selectVitrine) formData.set("ws_vitrine", "on");
    else formData.delete("ws_vitrine");

    startTransition(async () => {
      const res = await createClientAction(formData);
      if (res?.ok && res.clientId) {
        onClose();
        router.push(`/clients/${res.clientId}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0D1322] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Nouveau Client & Ouverture Dossier 360°
              </h2>
              <p className="text-xs text-slate-400">
                Création rapide multi-portefeuille (Alsek Marketing & Vitrine Caladoise)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Choix du Portefeuille (Multi-Workspace / Pont d'Upsell) */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Portefeuille(s) de rattachement (Pont d&apos;Upsell possible)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectAlsek(!selectAlsek)}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  selectAlsek
                    ? "border-blue-500 bg-blue-600/15 text-white"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Alsek Marketing
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Agence B2B (Reels, Web, Meta Ads)
                  </p>
                </div>
                <CheckCircle2
                  className={`h-5 w-5 ${
                    selectAlsek ? "text-blue-400" : "text-slate-700"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setSelectVitrine(!selectVitrine)}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  selectVitrine
                    ? "border-amber-500 bg-amber-500/15 text-white"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Vitrine Caladoise
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Média Local (Reportages, Mise en avant)
                  </p>
                </div>
                <CheckCircle2
                  className={`h-5 w-5 ${
                    selectVitrine ? "text-amber-400" : "text-slate-700"
                  }`}
                />
              </button>
            </div>
            {selectAlsek && selectVitrine && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 text-xs text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                Client en Double Portefeuille (Pont d&apos;Upsell actif dès l&apos;ouverture).
              </div>
            )}
          </div>

          {/* Identité Entreprise */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom de l&apos;enseigne / société *
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  name="companyName"
                  required
                  placeholder="Ex: Boulangerie Maison Dorée"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Secteur d&apos;activité *
              </label>
              <select
                name="sector"
                defaultValue="Restaurant & Brasserie"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Restaurant & Brasserie">Restaurant & Brasserie</option>
                <option value="Boutique Prêt-à-porter & Déco">Boutique Prêt-à-porter & Déco</option>
                <option value="Caviste & Bar à Dégustation">Caviste & Bar à Dégustation</option>
                <option value="Artisan & Bâtiment">Artisan & Bâtiment</option>
                <option value="Beauté, Bien-être & Coiffure">Beauté, Bien-être & Coiffure</option>
                <option value="Automobile & Concession">Automobile & Concession</option>
                <option value="Services B2B & Libéral">Services B2B & Libéral</option>
              </select>
            </div>
          </div>

          {/* Ville, Panier Moyen, NAF, Effectif */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ville
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="city"
                  defaultValue="Villefranche-sur-Saône"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-2.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Panier Moyen (€)
              </label>
              <div className="relative">
                <Euro className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="avgBasketValue"
                  type="number"
                  step="0.5"
                  defaultValue="45"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-2.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Code NAF (Aides)
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="nafCode"
                  placeholder="Ex: 5610A"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Effectif salarié
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="employeeCount"
                  type="number"
                  placeholder="Ex: 5"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-2.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact & Liens de Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Dirigeant / Contact
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="contactName"
                  placeholder="Prénom Nom"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="contactEmail"
                  type="email"
                  placeholder="contact@client.fr"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="contactPhone"
                  placeholder="04 74 ..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Site Web ou Page Vitrine Caladoise
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="websiteUrl"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Compte Instagram (@username)
              </label>
              <div className="relative">
                <Instagram className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  name="igUsername"
                  placeholder="@enseigne.calade"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {isPending ? "Création en cours..." : "Créer la Fiche Client 360°"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
