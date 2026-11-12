import React from "react";
import { cookies, headers } from "next/headers";
import { getClientsList, type WorkspaceFilter } from "@/lib/db";
import { ContentTrackerView } from "@/components/ContentTrackerView";

export const dynamic = "force-dynamic";

export default async function ContentTrackerPage() {
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

  const clients = await getClientsList(activeWorkspace);

  return (
    <ContentTrackerView activeWorkspace={activeWorkspace} clients={clients} />
  );
}
