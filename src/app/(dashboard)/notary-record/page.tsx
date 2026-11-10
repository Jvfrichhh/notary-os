import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markMinutaBundled } from "@/app/(dashboard)/notary-record/actions";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

type Tab = "repertorium" | "klapper" | "bundel";
const TABS: { key: Tab; label: string }[] = [
  { key: "repertorium", label: "Repertorium" },
  { key: "klapper", label: "Klapper" },
  { key: "bundel", label: "Bundel Minuta" }
];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** Paling banyak 50 akta per buku/jilid (Pasal 16 ayat (1) huruf g UUJN). */
const MAKS_PER_JILID = 50;

interface PageProps {
  searchParams: { tab?: string; q?: string; year?: string; date?: string };
}

export default async function NotaryRecordPage(props: Async<PageProps>) {
  const { searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);

  const tab: Tab = searchParams.tab === "klapper" ? "klapper" : searchParams.tab === "bundel" ? "bundel" : "repertorium";
  const q = searchParams.q?.trim();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : undefined;
  const date = searchParams.date; // YYYY-MM-DD

  const where: Prisma.RepertoriumWhereInput = {
    recordStatus: "ACTIVE",
    ...(year ? { year } : {}),
    ...(date
      ? {
          deedDate: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      : {}),
    ...(q
      ? {
          OR: [
            { appearerName: { contains: q, mode: "insensitive" } },
            { deedType: { contains: q, mode: "insensitive" } },
            { deed: { deedNumber: { contains: q, mode: "insensitive" } } },
            { client: { fullName: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const entries = await prisma.repertorium.findMany({
    where,
    orderBy: [{ year: "desc" }, { sequenceNumber: "desc" }],
    include: { deed: true, client: true, job: true }
  });

  const qs = (t: Tab) => {
    const params = new URLSearchParams();
    params.set("tab", t);
    if (q) params.set("q", q);
    if (year) params.set("year", String(year));
    if (date) params.set("date", date);
    return `/notary-record?${params.toString()}`;
  };

  // Klapper: dikelompokkan alfabetis berdasarkan nama penghadap (fallback ke nama client).
  // Bukan tabel baru -- murni derived dari data Repertorium di atas.
  // Satu akta dengan beberapa penghadap muncul di bawah huruf tiap nama; tiap huruf diurutkan abjad.
  const klapperGroups = new Map<string, { name: string; entry: (typeof entries)[number] }[]>();
  if (tab === "klapper") {
    for (const entry of entries) {
      const names = (entry.appearerName || entry.client?.fullName || "-")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      for (const name of names.length ? names : ["-"]) {
        const first = name[0]?.toUpperCase() ?? "#";
        const letter = /[A-Z]/.test(first) ? first : "#";
        const list = klapperGroups.get(letter) ?? [];
        list.push({ name, entry });
        klapperGroups.set(letter, list);
      }
    }
    for (const list of klapperGroups.values()) list.sort((a, b) => a.name.localeCompare(b.name, "id") || b.entry.deedDate.getTime() - a.entry.deedDate.getTime());
  }
  const klapperLetters = [...klapperGroups.keys()].sort();

  // Bundel minuta: akta per bulan, jumlah jilid (maks. 50 akta per jilid), dan status penjilidan.
  const bundles: { ym: string; label: string; count: number; first: number; last: number; jilid: number; bundledAt: Date | null; note: string | null }[] = [];
  if (tab === "bundel") {
    const perMonth = new Map<string, number[]>();
    for (const e of entries) {
      const ym = e.deedDate.toISOString().slice(0, 7);
      perMonth.set(ym, [...(perMonth.get(ym) ?? []), e.sequenceNumber]);
    }
    const marks = await prisma.auditLog.findMany({
      where: { action: "minuta_bundled", entityType: "MinutaBundle", entityId: { in: [...perMonth.keys()] } },
      orderBy: { timestamp: "desc" },
      select: { entityId: true, timestamp: true, newValue: true }
    });
    for (const ym of [...perMonth.keys()].sort().reverse()) {
      const seqs = perMonth.get(ym)!;
      const mark = marks.find((m) => m.entityId === ym);
      bundles.push({
        ym,
        label: `${BULAN[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`,
        count: seqs.length,
        first: Math.min(...seqs),
        last: Math.max(...seqs),
        jilid: Math.ceil(seqs.length / MAKS_PER_JILID),
        bundledAt: mark?.timestamp ?? null,
        note: (mark?.newValue as { note?: string | null } | null)?.note ?? null
      });
    }
  }
  const currentYm = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Repertorium & Klapper</h1>
          <p className="text-sm text-muted-foreground">Repertorium dan Klapper — dua tampilan dari data yang sama</p>
        </div>
        {canCreate && (
          <Link
            href="/notary-record/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + Catat Repertorium
          </Link>
        )}
      </div>

      <div className="flex w-fit max-w-full gap-1 overflow-x-auto whitespace-nowrap rounded-md bg-muted p-1 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs(t.key)}
            className={cn(
              "rounded px-3 py-1",
              tab === t.key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari nama penghadap, nomor akta, jenis akta..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
        />
        <input
          type="number"
          name="year"
          defaultValue={year}
          placeholder="Tahun"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-28"
        />
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-44"
        />
        <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Filter
        </button>
      </form>

      {entries.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada data repertorium yang cocok." />
        </Card>
      ) : tab === "bundel" ? (
        <Card className="!p-0">
          <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
            Minuta dijilid per bulan menjadi buku yang memuat paling banyak {MAKS_PER_JILID} akta; bila lebih, dijilid menjadi beberapa buku. Tandai
            setelah bundel bulan itu selesai dijilid dan diberi sampul.
          </p>
          <div className="divide-y divide-border">
            {bundles.map((b) => (
              <div key={b.ym} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{b.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.count} akta · nomor urut {b.first}–{b.last} · {b.jilid} jilid
                    {b.jilid > 1 ? ` (${MAKS_PER_JILID} akta per jilid)` : ""}
                  </p>
                </div>
                {b.bundledAt ? (
                  <span className="text-xs text-status-on-track">
                    Sudah dijilid ({formatDate(b.bundledAt)}){b.note ? ` · ${b.note}` : ""}
                  </span>
                ) : b.ym >= currentYm ? (
                  <span className="text-xs text-muted-foreground">Bulan berjalan</span>
                ) : canCreate ? (
                  <form action={markMinutaBundled.bind(null, b.ym)} className="flex flex-wrap items-center gap-2">
                    <input name="note" maxLength={200} placeholder="Catatan (opsional)" className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground" />
                    <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted">
                      Tandai sudah dijilid
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-status-due-soon">Belum dijilid</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : tab === "repertorium" ? (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="table-stack w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">No. Urut</th>
                  <th className="px-4 py-3 font-medium">Nomor Akta</th>
                  <th className="px-4 py-3 font-medium">Nama Penghadap</th>
                  <th className="px-4 py-3 font-medium">Jenis Akta</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td data-label="No. Urut" className="px-4 py-3">
                      <Link href={`/notary-record/${r.id}`} className="font-medium text-foreground hover:underline">
                        {r.year}/{String(r.sequenceNumber).padStart(4, "0")}
                      </Link>
                    </td>
                    <td data-label="Nomor Akta" className="px-4 py-3 text-muted-foreground">{r.deed.deedNumber}</td>
                    <td data-label="Nama Penghadap" className="px-4 py-3 text-foreground">{r.appearerName}</td>
                    <td data-label="Jenis Akta" className="px-4 py-3 text-muted-foreground">{r.deedType}</td>
                    <td data-label="Tanggal" className="px-4 py-3 text-muted-foreground">{formatDate(r.deedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {klapperLetters.map((letter) => (
            <div key={letter}>
              <h2 className="mb-2 text-base font-bold text-foreground">{letter}</h2>
              <Card className="!p-0">
                <div className="divide-y divide-border">
                  {klapperGroups.get(letter)!.map(({ name, entry }) => (
                    <Link
                      key={`${entry.id}:${name}`}
                      href={`/notary-record/${entry.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
                    >
                      <div className="min-w-0 break-words">
                        <p className="font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.deedType} · {entry.deed.deedNumber}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.deedDate)}</span>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
