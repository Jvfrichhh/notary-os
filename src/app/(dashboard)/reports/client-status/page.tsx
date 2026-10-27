import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CountUp } from "@/components/motion/CountUp";
import { JOB_STATUSES } from "@/lib/jobStatus";
import { classifyDeadline, formatDate, formatDateJakarta, formatStatusLabel, getJakartaToday } from "@/lib/format";
import { gatherClientJobStatus } from "@/lib/reports/clientJobStatus";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

/**
 * Laporan tahunan status pekerjaan klien (untuk laporan PKJM). Hanya untuk
 * pemegang hak laporan Notaris (view_repertorium) -- sama dengan laporan MPD.
 */
export default async function ClientStatusReportPage(props: Async<{ searchParams: { year?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);

  const todayYear = getJakartaToday().getUTCFullYear();
  const parsed = Number(searchParams.year);
  const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : todayYear;
  const yearOptions = Array.from({ length: 5 }, (_, i) => todayYear - i);
  const d = await gatherClientJobStatus(year);

  const tiles = [
    { label: "Klien", value: d.clients.length },
    { label: "Pekerjaan masuk", value: d.total },
    { label: "Masih berjalan", value: d.active },
    { label: "Selesai", value: d.completed },
    { label: "Dibatalkan", value: d.cancelled }
  ];

  const dl = (format: "docx" | "xlsx") => `/api/reports/client-status?year=${year}&format=${format}`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Laporan
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Status Pekerjaan Klien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Laporan tahunan: semua pekerjaan yang masuk pada {year}, dikelompokkan per klien, dengan status terakhirnya.
          </p>
        </div>
        <nav aria-label="Pilih tahun" className="flex gap-1 rounded-md border border-border bg-background p-1 text-sm shadow-card">
          {yearOptions.map((y) => (
            <Link
              key={y}
              href={`/reports/client-status?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={`rounded-sm px-3.5 py-1.5 font-semibold ${y === year ? "bg-primary text-primary-foreground" : "text-fg-3 hover:bg-muted"}`}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={dl("docx")} className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Download className="h-4 w-4" /> Unduh Word (.docx)
        </a>
        <a href={dl("xlsx")} className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted">
          <FileSpreadsheet className="h-4 w-4" /> Unduh Excel (.xlsx)
        </a>
        <p className="w-full text-xs text-muted-foreground">
          File Word berisi surat laporan bertanda tangan Notaris + lampiran rincian; file Excel berisi rekap dan rincian untuk diolah. Setiap unduhan tercatat di log audit.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((k, i) => (
          <div key={k.label} style={{ ["--d" as string]: `${i * 60}ms` }} className="rise flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-card">
            <span className="text-[13px] font-semibold text-fg-3">{k.label}</span>
            <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground">
              <CountUp value={k.value} delay={i * 60} />
            </span>
          </div>
        ))}
      </div>

      <Card>
        <h2 className="text-base font-bold text-foreground">Rekap per status</h2>
        <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {JOB_STATUSES.map((s) => (
            <li key={s} className="flex items-center justify-between gap-3 border-b border-muted py-1.5">
              <span className="text-fg-2">{formatStatusLabel(s)}</span>
              <span className="font-bold tabular-nums text-foreground">{d.byStatus[s]}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="!p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Rincian per klien</h2>
          <span className="text-xs text-muted-foreground">
            {d.clients.length} klien · {d.total} pekerjaan
          </span>
        </div>
        {d.total === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Belum ada pekerjaan yang masuk pada {year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Klien</th>
                  <th className="px-4 py-3 font-medium">Pekerjaan</th>
                  <th className="px-4 py-3 font-medium">Layanan</th>
                  <th className="px-4 py-3 font-medium">Masuk</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tenggat / Selesai</th>
                  <th className="px-4 py-3 font-medium">PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.clients.flatMap((g) =>
                  g.jobs.map((j, i) => (
                    <tr key={j.id} className="hover:bg-muted/50">
                      <td data-label="Klien" className="px-4 py-3">
                        <Link href={`/clients/${g.client.id}`} className="font-medium text-foreground hover:underline">
                          {g.client.fullName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {g.client.clientNumber}
                          {i === 0 && g.jobs.length > 1 ? ` · ${g.jobs.length} pekerjaan` : ""}
                        </p>
                      </td>
                      <td data-label="Pekerjaan" className="px-4 py-3">
                        <Link href={`/jobs/${j.id}`} className="text-foreground hover:underline">
                          {j.jobNumber}
                        </Link>
                        {j.description && <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{j.description}</p>}
                      </td>
                      <td data-label="Layanan" className="px-4 py-3 text-muted-foreground">{j.serviceType?.name ?? "-"}</td>
                      <td data-label="Masuk" className="px-4 py-3 text-muted-foreground">{formatDateJakarta(j.createdAt)}</td>
                      <td data-label="Status" className="px-4 py-3 text-foreground">{formatStatusLabel(j.status)}</td>
                      <td data-label="Tenggat / Selesai" className="px-4 py-3">
                        {j.status === "COMPLETED" ? (
                          <span className="text-muted-foreground">{formatDate(j.completionDate)}</span>
                        ) : (
                          <StatusBadge tone={classifyDeadline(j.deadline, j.status)} label={formatDate(j.deadline)} />
                        )}
                      </td>
                      <td data-label="PIC" className="px-4 py-3 text-muted-foreground">{j.pic?.name ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
