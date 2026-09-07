import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "minuta" | "salinan" | "grosse" | "kutipan";
const TABS: { key: Tab; label: string }[] = [
  { key: "minuta", label: "Minuta" },
  { key: "salinan", label: "Salinan" },
  { key: "grosse", label: "Grosse" },
  { key: "kutipan", label: "Kutipan" }
];

interface ArchivePageProps {
  searchParams: { tab?: string; q?: string; year?: string };
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_MINUTA);
  const canCreate = await userHasPermission(user.id, PERMISSIONS.EDIT_MINUTA);

  const tab: Tab = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as Tab) : "minuta";
  const q = searchParams.q?.trim();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : undefined;

  const deedFilter = {
    ...(q
      ? {
          OR: [
            { deedNumber: { contains: q, mode: "insensitive" as const } },
            { client: { fullName: { contains: q, mode: "insensitive" as const } } }
          ]
        }
      : {}),
    ...(year ? { deedDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } : {})
  };

  const commonInclude = { deed: { include: { client: true } }, document: true } as const;

  const [minuta, salinan, grosse, kutipan] = await Promise.all([
    tab === "minuta"
      ? prisma.minuta.findMany({
          where: { recordStatus: "ACTIVE", deed: deedFilter },
          include: commonInclude,
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    tab === "salinan"
      ? prisma.salinan.findMany({
          where: { recordStatus: "ACTIVE", deed: deedFilter },
          include: commonInclude,
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    tab === "grosse"
      ? prisma.grosse.findMany({
          where: { recordStatus: "ACTIVE", deed: deedFilter },
          include: commonInclude,
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    tab === "kutipan"
      ? prisma.kutipan.findMany({
          where: { recordStatus: "ACTIVE", deed: deedFilter },
          include: commonInclude,
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  const rows = tab === "minuta" ? minuta : tab === "salinan" ? salinan : tab === "grosse" ? grosse : kutipan;

  const qs = (t: Tab) => {
    const params = new URLSearchParams();
    params.set("tab", t);
    if (q) params.set("q", q);
    if (year) params.set("year", String(year));
    return `/archive?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lemari Arsip</h1>
          <p className="text-sm text-muted-foreground">Minuta, Salinan, Grosse, dan Kutipan — semua terhubung ke Akta</p>
        </div>
        {canCreate && (
          <Link
            href="/archive/deed/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + Akta Baru
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
          placeholder="Cari nomor akta atau nama client..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
        />
        <input
          type="number"
          name="year"
          defaultValue={year}
          placeholder="Tahun akta"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-32"
        />
        <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={`Belum ada ${tab} yang cocok.`} />
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nomor Akta</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Jenis Akta</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/archive/${tab}/${row.id}`} className="font-medium text-foreground hover:underline">
                        {row.deed.deedNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${row.deed.client.id}`} className="text-foreground hover:underline">
                        {row.deed.client.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.deed.deedType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.deed.deedDate)}</td>
                    <td className="px-4 py-3">
                      {row.document ? (
                        <a
                          href={`/api/documents/${row.document.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Buka File
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum ada file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
