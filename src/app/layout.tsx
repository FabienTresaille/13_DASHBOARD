import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getClientsList, type WorkspaceFilter } from "@/lib/db";

export const metadata: Metadata = {
  title: "ALSEK PULSE — SaaS Multi-Brand & Tracking Engine",
  description:
    "Cockpit de pilotage interne & Portail Client Multi-Marques pour Alsek Marketing (app.alsek.fr) et Vitrine Caladoise (pro.vitrine-caladoise.fr).",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawWs = cookieStore.get("pulse_workspace")?.value;
  const activeWorkspace: WorkspaceFilter =
    rawWs === "ALSEK" || rawWs === "VITRINE" ? rawWs : "ALL";

  const clients = await getClientsList(activeWorkspace);
  const clientsQuickList = clients.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    sector: c.sector,
    shareToken: c.shareToken,
    isDualPortfolio: c.isDualPortfolio,
    workspaces: c.workspaces.map((w) => w.workspace.slug),
  }));

  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-[#070B14] text-slate-100 antialiased">
        <AppShell
          activeWorkspace={activeWorkspace}
          clientsQuickList={clientsQuickList}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
