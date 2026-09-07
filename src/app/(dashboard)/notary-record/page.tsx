import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Tab = "repertorium" | "klapper";
const TABS: { key: Tab; label: string }[] = [
  { key: "repertorium", label: "Repertorium" },
  { key: "klapper", label: "Klapper" }
];

interface PageProps {
  searchParams: { tab?: string; q?: string; year?: string; date?: string };
}

export default async function NotaryRecordPage({ searchParams }: PageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);

  const tab: Tab = searchParams.tab === "klapper" ? "klapper" : "repertorium";
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
  const klapperGroups = new Map<string, typeof entries>();
  if (tab === "klapper") {
    for (const entry of entries) {
      const name = entry.appearerName || entry.client?.fullName || "-";
      const letter = name.trim()[0]?.toUpperCase() ?? "#";
      const list = klapperGroups.get(letter) ?? [];
      list.push(entry);
      klapperGroups.set(letter, list);
    }
  }
  const klapperLetters = [...klapperGroups.keys()].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notary Record</h1>
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

      <div className="flex w-fit gap-1 rounded-md bg-muted p-1 text-sm">
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
      ) : tab === "repertorium" ? (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                    <td className="px-4 py-3">
                      <Link href={`/notary-record/${r.id}`} className="font-medium text-foreground hover:underline">
                        {r.year}/{String(r.sequenceNumber).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.deed.deedNumber}</td>
                    <td className="px-4 py-3 text-foreground">{r.appearerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.deedType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.deedDate)}</td>
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
              <h2 className="mb-2 text-sm font-semibold text-foreground">{letter}</h2>
              <Card className="!p-0">
                <div className="divide-y divide-border">
                  {klapperGroups.get(letter)!.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/notary-record/${entry.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">{entry.appearerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.deedType} · {entry.deed.deedNumber}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.deedDate)}</span>
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
