import { notFound } from "next/navigation";
import { getClient360ById } from "@/lib/db";
import { Client360View } from "@/components/Client360View";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient360ById(id, "ALL");

  if (!client) {
    notFound();
  }

  return <Client360View client={client} />;
}
