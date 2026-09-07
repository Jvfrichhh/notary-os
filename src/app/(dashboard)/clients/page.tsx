import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

interface ClientsPageProps {
  searchParams: { q?: string; status?: string };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_CLIENTS);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.CREATE_CLIENTS);

  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  const clients = await prisma.client.findMany({
    where: {
      status: statusFilter,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { clientNumber: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { jobs: true, visits: true } } }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">Daftar klien kantor notaris</p>
        </div>
        {canCreate && (
          <Link
            href="/clients/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Tambah Client
          </Link>
        )}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama, no. client, telepon, email..."
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {statusFilter === "ARCHIVED" && <input type="hidden" name="status" value="ARCHIVED" />}
          </form>

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={`/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${
                statusFilter === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Aktif
            </Link>
            <Link
              href={`/clients?status=ARCHIVED${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${
                statusFilter === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Arsip
            </Link>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q ? `Tidak ada client yang cocok dengan "${q}".` : "Belum ada client."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">No. Client</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium">Kontak</th>
                  <th className="px-4 py-3 font-medium">Kota</th>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{c.clientNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.fullName}
                      </Link>
                      {c.companyName && <p className="text-xs text-muted-foreground">{c.companyName}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.clientType ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{c.phone ?? "-"}</p>
                      <p className="text-xs">{c.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c._count.jobs}</td>
                    <td className="px-4 py-3 text-right">
                      {statusFilter === "ARCHIVED" ? (
                        <StatusBadge tone="archived" />
                      ) : (
                        <Link href={`/clients/${c.id}`} className="text-xs font-medium text-primary hover:underline">
                          Detail
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
