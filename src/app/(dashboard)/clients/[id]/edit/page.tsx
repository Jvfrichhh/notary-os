import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { ClientForm } from "@/components/clients/ClientForm";
import { updateClient } from "@/app/(dashboard)/clients/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";

export default async function EditClientPage(props: Async<{ params: { id: string } }>) {
  const { params } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.EDIT_CLIENTS);

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) notFound();

  const action = updateClient.bind(null, client.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{client.clientNumber}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Edit {client.fullName}</h1>
      </div>

      <Card>
        <ClientForm action={action} client={client} cancelHref={`/clients/${client.id}`} />
      </Card>
    </div>
  );
}
