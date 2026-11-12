import React from "react";
import { cookies, headers } from "next/headers";
import { getClientsList, type WorkspaceFilter } from "@/lib/db";
import { getWorkspaceKpisAction } from "@/app/actions";
import { BillingRoiView } from "@/components/BillingRoiView";

export const dynamic = "force-dynamic";

export default async function BillingRoiPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host = headerStore.get("host") || "";

  let activeWorkspace: WorkspaceFilter = "ALL";
  const cookieWs = cookieStore.get("pulse_workspace")?.value as
    | WorkspaceFilter
    | undefined;

  if (cookieWs && ["ALL", "ALSEK", "VITRINE"].includes(cookieWs)) {
    activeWorkspace = cookieWs;
  } else if (host.includes("vitrine-caladoise")) {
    activeWorkspace = "VITRINE";
  } else if (host.includes("alsek")) {
    activeWorkspace = "ALSEK";
  }

  const [kpis, clients] = await Promise.all([
    getWorkspaceKpisAction(activeWorkspace),
    getClientsList(activeWorkspace),
  ]);

  return (
    <BillingRoiView
      activeWorkspace={activeWorkspace}
      kpis={kpis}
      clients={clients}
    />
  );
}
