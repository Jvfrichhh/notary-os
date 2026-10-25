import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { q?: string; status?: string; recordStatus?: string };
}

export default async function WaarmerkingPage(props: Async<PageProps>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_WAARMERKING);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_WAARMERKING);

  const q = searchParams.q?.trim() ?? "";
  const recordStatus = searchParams.recordStatus === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  const records = await prisma.waarmerking.findMany({
    where: {
      recordStatus,
      ...(searchParams.status ? { status: searchParams.status as "DRAFT" | "PROCESS" | "DONE" } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { client: { fullName: { contains: q, mode: "insensitive" } } },
              { serviceType: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { client: true, pic: true, document: true },
    orderBy: { date: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Waarmerking</h1>
          <p className="text-sm text-muted-foreground">Pencatatan layanan waarmerking dokumen.</p>
        </div>
        {canEdit && (
          <Link href="/waarmerking/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            + Catat Waarmerking
          </Link>
        )}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex w-full flex-wrap gap-2 sm:max-w-xl">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nomor, klien, jenis layanan..."
              className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PROCESS">Process</option>
              <option value="DONE">Done</option>
            </select>
            {recordStatus === "ARCHIVED" && <input type="hidden" name="recordStatus" value="ARCHIVED" />}
          </form>

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={`/waarmerking${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Aktif
            </Link>
            <Link
              href={`/waarmerking?recordStatus=ARCHIVED${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Arsip
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Belum ada record Waarmerking." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nomor</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Klien</th>
                  <th className="px-4 py-3 font-medium">Jenis Layanan</th>
                  <th className="px-4 py-3 font-medium">PIC</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label="Nomor" className="px-4 py-3 font-medium text-foreground">
                      <Link href={`/waarmerking/${r.id}`} className="hover:underline">
                        {r.number}
                      </Link>
                    </td>
                    <td data-label="Tanggal" className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td data-label="Klien" className="px-4 py-3">
                      <Link href={`/clients/${r.client.id}`} className="text-foreground hover:underline">
                        {r.client.fullName}
                      </Link>
                    </td>
                    <td data-label="Jenis Layanan" className="px-4 py-3 text-muted-foreground">{r.serviceType ?? "-"}</td>
                    <td data-label="PIC" className="px-4 py-3 text-muted-foreground">{r.pic?.name ?? "-"}</td>
                    <td data-label="Status" className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {formatStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/waarmerking/${r.id}`} className="text-xs font-medium text-primary hover:underline">
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
