import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/motion/CountUp";
import { formatDateJakarta, getJakartaToday } from "@/lib/format";
import { EMPTY_CATEGORY, gatherClientOccupation, parsePeriod } from "@/lib/reports/clientOccupation";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

/**
 * Laporan tahunan pekerjaan/profesi klien (untuk laporan PKJM). Hanya untuk
 * pemegang hak laporan Notaris (view_repertorium) -- sama dengan laporan MPD.
 */
export default async function ClientOccupationReportPage(props: Async<{ searchParams: { year?: string; missing?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);

  const todayYear = getJakartaToday().getUTCFullYear();
  const period = parsePeriod(searchParams.year, todayYear);
  const yearParam = period === "all" ? "all" : String(period);
  const onlyMissing = searchParams.missing === "1";
  const options: { key: string; label: string }[] = [
    ...Array.from({ length: 4 }, (_, i) => ({ key: String(todayYear - i), label: String(todayYear - i) })),
    { key: "all", label: "Semua klien" }
  ];
  const d = await gatherClientOccupation(period);
  const listed = onlyMissing ? d.clients.filter((c) => c.category === EMPTY_CATEGORY) : d.clients;
  const maxCount = Math.max(1, ...d.summary.map((s) => s.count));
  const dl = (format: "docx" | "xlsx") => `/api/reports/client-occupation?year=${yearParam}&format=${format}`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Laporan
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Pekerjaan / Profesi Klien</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Laporan tahunan PKJM: jumlah klien per jenis pekerjaan (karyawan swasta, pelajar/mahasiswa, tidak bekerja, dst.), {period === "all" ? "seluruh klien terdaftar" : `klien yang terdaftar tahun ${period}`}.
          </p>
        </div>
        <nav aria-label="Pilih periode" className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1 text-sm shadow-card">
          {options.map((o) => (
            <Link
              key={o.key}
              href={`/reports/client-occupation?year=${o.key}`}
              aria-current={o.key === yearParam ? "page" : undefined}
              className={`rounded-sm px-3.5 py-1.5 font-semibold ${o.key === yearParam ? "bg-primary text-primary-foreground" : "text-fg-3 hover:bg-muted"}`}
            >
              {o.label}
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
          Word: surat laporan bertanda tangan Notaris + rekap + daftar klien. Excel: rekap dan daftar untuk diolah. Setiap unduhan tercatat di log audit.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Klien", value: d.total },
          { label: "Jenis pekerjaan", value: d.summary.filter((s) => s.label !== EMPTY_CATEGORY).length },
          { label: "Badan usaha (tanpa pekerjaan)", value: d.companies },
          { label: "Belum diisi", value: d.missing, warn: d.missing > 0 }
        ].map((k, i) => (
          <div
            key={k.label}
            style={{ ["--d" as string]: `${i * 60}ms` }}
            className={`rise flex flex-col gap-2 rounded-xl border p-4 shadow-card ${k.warn ? "border-warn-border bg-warn-soft" : "border-border bg-background"}`}
          >
            <span className={`text-[13px] font-semibold ${k.warn ? "text-warn-strong" : "text-fg-3"}`}>{k.label}</span>
            <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground">
              <CountUp value={k.value} delay={i * 60} />
            </span>
          </div>
        ))}
      </div>

      {d.missing > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn-border bg-warn-soft px-4 py-3 text-sm text-warn-strong">
          <span>
            <strong>{d.missing} klien</strong> belum ada data pekerjaannya, jadi di laporan masuk kelompok &ldquo;Belum diisi&rdquo;. Lengkapi lewat tombol ubah di tiap klien.
          </span>
          <Link
            href={`/reports/client-occupation?year=${yearParam}${onlyMissing ? "" : "&missing=1"}`}
            className="font-bold underline-offset-2 hover:underline"
          >
            {onlyMissing ? "Tampilkan semua klien" : "Tampilkan yang belum diisi"}
          </Link>
        </div>
      )}

      <Card>
        <h2 className="text-base font-bold text-foreground">Rekap per jenis pekerjaan</h2>
        {d.total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada klien pada periode ini.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {d.summary.map((s, i) => (
              <li key={s.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className={`truncate font-medium ${s.label === EMPTY_CATEGORY ? "text-warn-strong" : "text-fg-2"}`}>{s.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    <span className="font-bold text-foreground">{s.count}</span> · {s.pct.toLocaleString("id-ID")}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`bar-grow h-2 rounded-full ${s.label === EMPTY_CATEGORY ? "bg-status-due-soon" : "bg-primary"}`}
                    style={{ width: `${Math.max(2, (s.count / maxCount) * 100)}%`, ["--d" as string]: `${150 + i * 50}ms` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="!p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-foreground">{onlyMissing ? "Klien yang belum diisi pekerjaannya" : "Daftar klien"}</h2>
          <span className="text-xs text-muted-foreground">{listed.length} klien</span>
        </div>
        {listed.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Tidak ada klien untuk ditampilkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Klien</th>
                  <th className="px-4 py-3 font-medium">Pekerjaan / Profesi</th>
                  <th className="px-4 py-3 font-medium">Kota</th>
                  <th className="px-4 py-3 font-medium">Terdaftar</th>
                  <th className="px-4 py-3 font-medium">Pekerjaan di kantor</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listed.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50">
                    <td data-label="Klien" className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.clientNumber}
                        {c.companyName && c.companyName !== c.fullName ? ` · ${c.companyName}` : ""}
                      </p>
                    </td>
                    <td data-label="Pekerjaan / Profesi" className={`px-4 py-3 ${c.category === EMPTY_CATEGORY ? "font-semibold text-warn-strong" : "text-foreground"}`}>
                      {c.category}
                      {c.occupation && c.occupation.trim() !== c.category && <span className="block text-xs text-muted-foreground">isian: {c.occupation}</span>}
                    </td>
                    <td data-label="Kota" className="px-4 py-3 text-muted-foreground">{c.city ?? "-"}</td>
                    <td data-label="Terdaftar" className="px-4 py-3 text-muted-foreground">{formatDateJakarta(c.createdAt)}</td>
                    <td data-label="Pekerjaan di kantor" className="px-4 py-3 text-muted-foreground">{c._count.jobs}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/clients/${c.id}/edit`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <Pencil className="h-3.5 w-3.5" /> Ubah
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
