"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { authenticateAdminAction } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await authenticateAdminAction(email, password);
      if (!result.ok) {
        setErrorMsg(
          result.error ||
            "Identifiants invalides. Vérifiez votre adresse email et votre mot de passe."
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0F29] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Halos lumineux Alsek Pulse (#1E3AFF & #00E676) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(30, 58, 255, 0.28), rgba(0, 230, 118, 0.08) 42%, transparent 72%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* En-tête de marque Alsek Pulse Pro */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1E3AFF]/50 bg-[#1E3AFF]/15 px-3.5 py-1 text-xs font-extrabold text-[#00E676] shadow-lg shadow-[#1E3AFF]/20">
            <Sparkles className="h-3.5 w-3.5 text-[#00E676]" />
            <span>Alsek Pulse Pro</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl font-black text-base text-white shadow-xl"
              style={{
                background: "linear-gradient(135deg, #1E3AFF, #00E676)",
              }}
            >
              AP
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight text-white">
                ALSEK PULSE
              </h1>
              <p className="text-xs text-slate-400">
                Cockpit Exécutif • Alsek Marketing & Vitrine Caladoise
              </p>
            </div>
          </div>
        </div>

        {/* Carte de connexion */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white">
              Connexion Administrateur
            </h2>
            <p className="text-xs text-slate-400">
              Accès réservé à la direction. Les rapports clients partagés (`/share/*`) restent accessibles publiquement.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5"
              >
                Email Administrateur
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@alsek.fr"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F29]/90 pl-10 pr-4 py-2.5 text-xs font-semibold text-white placeholder-slate-500 focus:border-[#1E3AFF] focus:outline-none focus:ring-2 focus:ring-[#1E3AFF]/40 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F29]/90 pl-10 pr-4 py-2.5 text-xs font-semibold text-white placeholder-slate-500 focus:border-[#1E3AFF] focus:outline-none focus:ring-2 focus:ring-[#1E3AFF]/40 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3AFF] to-[#00E676] hover:opacity-95 py-3 text-xs font-extrabold text-white shadow-lg shadow-[#1E3AFF]/35 transition cursor-pointer disabled:opacity-60"
            >
              <span>
                {isPending
                  ? "Vérification en cours..."
                  : "Accéder au Cockpit Alsek Pulse"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00E676]" />
              Protection Auth.js v5 • Traefik TLS
            </span>
            <span className="font-mono text-slate-500">app.alsek.fr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
