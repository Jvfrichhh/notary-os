import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getJakartaToday } from "@/lib/format";

export const dynamic = "force-dynamic";

interface VisitsPageProps {
  searchParams: { range?: string; q?: string };
}

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_VISITS);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.CREATE_VISITS);

  const q = searchParams.q?.trim() ?? "";
  const range = searchParams.range === "all" ? "all" : "today";

  // "Hari ini" versi kantor (Asia/Jakarta), bukan timezone server.
  const startOfToday = getJakartaToday();
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const visits = await prisma.visit.findMany({
    where: {
      status: "ACTIVE",
      ...(range === "today" ? { visitDate: { gte: startOfToday, lt: startOfTomorrow } } : {}),
      ...(q
        ? {
            OR: [
              { visitorName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { purpose: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { visitDate: "desc" },
    include: { client: true, staff: true, jobs: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Visits</h1>
          <p className="text-sm text-muted-foreground">Buku tamu / log kunjungan klien</p>
        </div>
        {canCreate && (
          <Link
            href="/visits/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Catat Kunjungan
          </Link>
        )}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="w-full sm:max-w-xs">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama, telepon, keperluan..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {range === "all" && <input type="hidden" name="range" value="all" />}
          </form>

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={`/visits${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${range === "today" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Hari Ini
            </Link>
            <Link
              href={`/visits?range=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${range === "all" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Semua
            </Link>
          </div>
        </div>

        {visits.length === 0 ? (
          <div className="p-6">
            <EmptyState title={range === "today" ? "Belum ada kunjungan hari ini." : "Belum ada kunjungan."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Pengunjung</th>
                  <th className="px-4 py-3 font-medium">Keperluan</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(v.visitDate).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/visits/${v.id}`} className="font-medium text-foreground hover:underline">
                        {v.visitorName}
                      </Link>
                      {v.client && <p className="text-xs text-muted-foreground">{v.client.clientNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.purpose ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.staff?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      {v.jobs.length > 0 ? (
                        <span className="rounded-full bg-status-on-track/10 px-2.5 py-0.5 text-xs font-medium text-status-on-track">
                          {v.jobs.length > 1 ? `${v.jobs.length} job dibuat` : "Job dibuat"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum jadi job</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/visits/${v.id}`} className="text-xs font-medium text-primary hover:underline">
                        Detail
                      </Link>
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
