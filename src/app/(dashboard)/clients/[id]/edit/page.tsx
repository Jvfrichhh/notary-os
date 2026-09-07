import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/clients/ClientForm";
import { updateClient } from "@/app/(dashboard)/clients/actions";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.EDIT_CLIENTS);

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();

  const action = updateClient.bind(null, client.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{client.clientNumber}</p>
        <h1 className="text-xl font-semibold text-foreground">Edit {client.fullName}</h1>
      </div>

      <Card>
        <ClientForm action={action} client={client} cancelHref={`/clients/${client.id}`} />
      </Card>
    </div>
  );
}
