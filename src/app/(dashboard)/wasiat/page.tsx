import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { q?: string; status?: string; recordStatus?: string };
}

export default async function WasiatPage(props: Async<PageProps>) {
  const { tp } = await getT();
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_WASIAT);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_WASIAT);

  const q = searchParams.q?.trim() ?? "";
  const recordStatus = searchParams.recordStatus === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  const records = await prisma.wasiat.findMany({
    where: {
      recordStatus,
      ...(searchParams.status ? { status: searchParams.status as "DIBUAT" | "DICATAT" | "DILAPORKAN" | "BUKTI_TERSEDIA" } : {}),
      ...(q
        ? {
            OR: [
              { deedNumber: { contains: q, mode: "insensitive" } },
              { client: { fullName: { contains: q, mode: "insensitive" } } },
              { wasiatType: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { client: true, job: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-status-due-soon/30 bg-status-due-soon/10 px-3 py-2 text-xs text-foreground">
        {tp("Pencatatan internal kantor saja — bukan pengganti sistem AHU maupun kewajiban pelaporan resmi wasiat.")}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Wasiat")}</h1>
          <p className="text-sm text-muted-foreground">{tp("Pelacakan internal pencatatan wasiat.")}</p>
        </div>
        {canEdit && (
          <Link href="/wasiat/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {tp("+ Catat Wasiat")}
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
              placeholder={tp("Cari nomor akta, klien, jenis wasiat...")}
              className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">{tp("Semua Status")}</option>
              <option value="DIBUAT">{tp("Dibuat")}</option>
              <option value="DICATAT">{tp("Dicatat")}</option>
              <option value="DILAPORKAN">{tp("Dilaporkan")}</option>
              <option value="BUKTI_TERSEDIA">{tp("Bukti Tersedia")}</option>
            </select>
            {recordStatus === "ARCHIVED" && <input type="hidden" name="recordStatus" value="ARCHIVED" />}
          </form>

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={`/wasiat${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {tp("Aktif")}
            </Link>
            <Link
              href={`/wasiat?recordStatus=ARCHIVED${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-3 py-1 ${recordStatus === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {tp("Arsip")}
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-6">
            <EmptyState title={tp("Belum ada record Wasiat.")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{tp("Klien")}</th>
                  <th className="px-4 py-3 font-medium">{tp("Nomor Akta")}</th>
                  <th className="px-4 py-3 font-medium">{tp("Tanggal")}</th>
                  <th className="px-4 py-3 font-medium">{tp("Jenis")}</th>
                  <th className="px-4 py-3 font-medium">{tp("Pekerjaan")}</th>
                  <th className="px-4 py-3 font-medium">{tp("Status")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label={tp("Klien")} className="px-4 py-3">
                      <Link href={`/clients/${r.client.id}`} className="font-medium text-foreground hover:underline">
                        {r.client.fullName}
                      </Link>
                    </td>
                    <td data-label={tp("Nomor Akta")} className="px-4 py-3 text-muted-foreground">
                      <Link href={`/wasiat/${r.id}`} className="hover:underline">
                        {r.deedNumber ?? "-"}
                      </Link>
                    </td>
                    <td data-label={tp("Tanggal")} className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    <td data-label={tp("Jenis")} className="px-4 py-3 text-muted-foreground">{r.wasiatType ?? "-"}</td>
                    <td data-label={tp("Pekerjaan")} className="px-4 py-3 text-muted-foreground">
                      {r.job ? (
                        <Link href={`/jobs/${r.job.id}`} className="hover:underline">
                          {r.job.jobNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td data-label={tp("Status")} className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {formatStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/wasiat/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                        {tp("Detail")}
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
