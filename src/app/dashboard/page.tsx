import { cookies } from "next/headers";
import { getDashboardOverview, type WorkspaceFilter } from "@/lib/db";
import { DashboardClientView } from "@/components/DashboardClientView";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const rawWs = cookieStore.get("pulse_workspace")?.value;
  const activeWorkspace: WorkspaceFilter =
    rawWs === "ALSEK" || rawWs === "VITRINE" ? rawWs : "ALL";

  const overview = await getDashboardOverview(activeWorkspace);

  return <DashboardClientView {...overview} />;
}
