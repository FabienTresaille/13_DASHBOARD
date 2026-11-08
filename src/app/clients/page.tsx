import { cookies } from "next/headers";
import { getClientsList, type WorkspaceFilter } from "@/lib/db";
import { ClientsDirectoryView } from "@/components/ClientsDirectoryView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const cookieStore = await cookies();
  const rawWs = cookieStore.get("pulse_workspace")?.value;
  const activeWorkspace: WorkspaceFilter =
    rawWs === "ALSEK" || rawWs === "VITRINE" ? rawWs : "ALL";

  const clients = await getClientsList(activeWorkspace);

  return (
    <ClientsDirectoryView
      clients={clients}
      activeWorkspace={activeWorkspace}
    />
  );
}
