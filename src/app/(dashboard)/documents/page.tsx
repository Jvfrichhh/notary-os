import Link from "next/link";
import { ChevronRight, FileText, Folder, FolderOpen, LayoutGrid, List, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatDateTime, formatFileSize, formatStatusLabel } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORIES = ["CLIENT_DOCUMENT", "WORKING_DOCUMENT", "FINAL_DOCUMENT", "SUPPORTING_DOCUMENT"] as const;
const PAGE_SIZE = 20;
const FOLDER_LIMIT = 60;
/** Nilai clientId untuk folder dokumen yang tidak terkait klien mana pun. */
const NO_CLIENT = "none";

interface DocumentsPageProps {
  searchParams: {
    q?: string;
    category?: string;
    status?: string;
    clientId?: string;
    jobId?: string;
    page?: string;
    view?: string;
  };
}

/**
 * Document Vault dengan tampilan folder:
 *  - default: satu folder per klien (cari dengan nama/nomor klien);
 *  - klik folder: dokumen klien itu, dikelompokkan per pekerjaan;
 *  - "Semua file": daftar file seperti sebelumnya (cari nama file/deskripsi).
 */
export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_DOCUMENTS);
  const canUpload = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);

  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const category = CATEGORIES.includes(searchParams.category as never) ? searchParams.category : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const clientId = searchParams.clientId || undefined;
  const view: "folders" | "files" | "client" = clientId ? "client" : searchParams.view === "files" || searchParams.jobId ? "files" : "folders";

  function href(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      category,
      status: statusFilter === "ARCHIVED" ? "ARCHIVED" : undefined,
      clientId,
      view: view === "files" ? "files" : undefined,
      page: page > 1 ? String(page) : undefined,
      ...overrides
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/documents${qs ? `?${qs}` : ""}`;
  }

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Document Vault</h1>
        <p className="text-sm text-muted-foreground">Dokumen tersusun dalam folder per klien</p>
      </div>
      {canUpload && (
        <Link
          href={clientId && clientId !== NO_CLIENT ? `/documents/new?clientId=${clientId}` : "/documents/new"}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Upload Dokumen
        </Link>
      )}
    </div>
  );

  const statusTabs = (
    <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
      <Link
        href={href({ status: undefined, page: undefined })}
        className={`rounded px-3 py-1 ${statusFilter === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
      >
        Aktif
      </Link>
      <Link
        href={href({ status: "ARCHIVED", page: undefined })}
        className={`rounded px-3 py-1 ${statusFilter === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
      >
        Arsip
      </Link>
    </div>
  );

  const viewTabs = (
    <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
      <Link
        href={href({ view: undefined, clientId: undefined, q: undefined, category: undefined, page: undefined })}
        className={`flex items-center gap-1.5 rounded px-3 py-1 ${view !== "files" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Folder klien
      </Link>
      <Link
        href={href({ view: "files", clientId: undefined, q: undefined, page: undefined })}
        className={`flex items-center gap-1.5 rounded px-3 py-1 ${view === "files" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
      >
        <List className="h-3.5 w-3.5" />
        Semua file
      </Link>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* 1. Folder per klien                                               */
  /* ---------------------------------------------------------------- */
  if (view === "folders") {
    const groups = await prisma.document.groupBy({
      by: ["clientId"],
      where: { status: statusFilter },
      _count: { _all: true },
      _max: { uploadedAt: true }
    });
    const stats = new Map(groups.map((g) => [g.clientId ?? NO_CLIENT, { count: g._count._all, last: g._max.uploadedAt }]));
    const ids = groups.map((g) => g.clientId).filter((x): x is string => !!x);
    const clients = ids.length
      ? await prisma.client.findMany({
          where: {
            id: { in: ids },
            ...(q
              ? {
                  OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { clientNumber: { contains: q, mode: "insensitive" } },
                    { companyName: { contains: q, mode: "insensitive" } }
                  ]
                }
              : {})
          },
          select: { id: true, fullName: true, clientNumber: true, companyName: true }
        })
      : [];
    const folders = clients
      .map((c) => ({ ...c, ...stats.get(c.id)! }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "id"));
    const shown = folders.slice(0, FOLDER_LIMIT);
    const noClient = !q ? stats.get(NO_CLIENT) : undefined;

    return (
      <div className="space-y-6">
        {header}
        <Card className="!p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <form className="flex flex-1 gap-2">
              <input
                type="text"
                name="q"
                defaultValue={q}
                autoFocus
                placeholder="Ketik nama atau nomor klien..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-sm"
              />
              {statusFilter === "ARCHIVED" && <input type="hidden" name="status" value="ARCHIVED" />}
              <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Cari
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {viewTabs}
              {statusTabs}
            </div>
          </div>

          {shown.length === 0 && !noClient ? (
            <div className="p-6">
              <EmptyState title={q ? `Tidak ada folder klien yang cocok dengan "${q}".` : "Belum ada dokumen."} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((f) => (
                <Link
                  key={f.id}
                  href={href({ clientId: f.id, q: undefined, page: undefined })}
                  className="group flex items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/50"
                >
                  <Folder className="mt-0.5 h-8 w-8 shrink-0 fill-amber-100 text-amber-500 group-hover:fill-amber-200" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{f.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.clientNumber}
                      {f.companyName ? ` · ${f.companyName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.count} dokumen{f.last ? ` · ${formatDate(f.last)}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
              {noClient && (
                <Link
                  href={href({ clientId: NO_CLIENT, page: undefined })}
                  className="group flex items-start gap-3 rounded-lg border border-dashed border-border p-3 hover:bg-muted/50"
                >
                  <Folder className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">Tanpa klien</p>
                    <p className="mt-1 text-xs text-muted-foreground">{noClient.count} dokumen</p>
                  </div>
                </Link>
              )}
            </div>
          )}
          {folders.length > FOLDER_LIMIT && (
            <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              Menampilkan {FOLDER_LIMIT} dari {folders.length} folder. Ketik nama klien untuk mempersempit.
            </p>
          )}
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* 2. Isi folder satu klien (dikelompokkan per pekerjaan)            */
  /* ---------------------------------------------------------------- */
  if (view === "client") {
    const isNone = clientId === NO_CLIENT;
    const client = isNone
      ? null
      : await prisma.client.findUnique({ where: { id: clientId! }, select: { id: true, fullName: true, clientNumber: true } });
    if (!isNone && !client) {
      return (
        <div className="space-y-6">
          {header}
          <EmptyState title="Folder klien tidak ditemukan." />
        </div>
      );
    }
    const docs = await prisma.document.findMany({
      where: {
        status: statusFilter,
        clientId: isNone ? null : clientId,
        ...(category ? { category: category as (typeof CATEGORIES)[number] } : {}),
        ...(q
          ? {
              OR: [
                { fileName: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { uploadedAt: "desc" },
      include: {
        job: { select: { id: true, jobNumber: true, description: true, serviceType: { select: { name: true } } } },
        uploader: { select: { name: true } },
        uploadedByClientAccount: { select: { name: true } }
      },
      take: 500
    });

    // Kelompok: per pekerjaan (terbaru dahulu), lalu dokumen umum klien.
    const groups = new Map<string, { title: string; sub: string | null; jobId: string | null; docs: typeof docs }>();
    for (const d of docs) {
      const key = d.job?.id ?? "_umum";
      if (!groups.has(key)) {
        groups.set(key, {
          title: d.job ? `${d.job.jobNumber}${d.job.serviceType?.name ? ` · ${d.job.serviceType.name}` : ""}` : "Dokumen umum klien",
          sub: d.job?.description ?? null,
          jobId: d.job?.id ?? null,
          docs: []
        });
      }
      groups.get(key)!.docs.push(d);
    }
    const ordered = Array.from(groups.values()).sort((a, b) => (a.jobId === null ? 1 : b.jobId === null ? -1 : 0));

    return (
      <div className="space-y-6">
        {header}
        <Card className="!p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <nav className="flex items-center gap-1 text-sm">
              <Link href={href({ clientId: undefined, q: undefined, category: undefined, page: undefined })} className="text-muted-foreground hover:text-foreground">
                Semua folder
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <FolderOpen className="h-4 w-4 text-amber-500" />
                {client ? `${client.fullName} (${client.clientNumber})` : "Tanpa klien"}
              </span>
              {client && (
                <Link href={`/clients/${client.id}`} className="ml-2 text-xs text-primary hover:underline">
                  Buka halaman klien
                </Link>
              )}
            </nav>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <form className="flex flex-1 flex-col gap-2 sm:flex-row">
                <input type="hidden" name="clientId" value={clientId} />
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Cari file di folder ini..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
                />
                <select
                  name="category"
                  defaultValue={category ?? ""}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Semua kategori</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {formatStatusLabel(c)}
                    </option>
                  ))}
                </select>
                {statusFilter === "ARCHIVED" && <input type="hidden" name="status" value="ARCHIVED" />}
                <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  Cari
                </button>
              </form>
              {statusTabs}
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="p-6">
              <EmptyState title={q || category ? "Tidak ada dokumen yang cocok di folder ini." : "Folder ini masih kosong."} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ordered.map((g) => (
                <section key={g.jobId ?? "_umum"}>
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="truncate text-sm font-medium text-foreground">{g.title}</span>
                      {g.sub && <span className="hidden truncate text-xs text-muted-foreground md:inline">— {g.sub}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span>{g.docs.length} dokumen</span>
                      {g.jobId && (
                        <Link href={`/jobs/${g.jobId}`} className="text-primary hover:underline">
                          Buka pekerjaan
                        </Link>
                      )}
                    </div>
                  </div>
                  <DocTable docs={g.docs} showClient={false} />
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* 3. Semua file (daftar datar, cari nama file)                      */
  /* ---------------------------------------------------------------- */
  const where: Prisma.DocumentWhereInput = {
    status: statusFilter,
    ...(category ? { category: category as (typeof CATEGORIES)[number] } : {}),
    ...(searchParams.jobId ? { jobId: searchParams.jobId } : {}),
    ...(q
      ? {
          OR: [
            { fileName: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { client: { fullName: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };
  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: {
        client: { select: { id: true, fullName: true } },
        job: { select: { id: true, jobNumber: true, description: true, serviceType: { select: { name: true } } } },
        uploader: { select: { name: true } },
        uploadedByClientAccount: { select: { name: true } }
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.document.count({ where })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {header}
      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input type="hidden" name="view" value="files" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama file, deskripsi, atau klien..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-xs"
            />
            <select
              name="category"
              defaultValue={category ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Semua kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatStatusLabel(c)}
                </option>
              ))}
            </select>
            {statusFilter === "ARCHIVED" && <input type="hidden" name="status" value="ARCHIVED" />}
            <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              Cari
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {viewTabs}
            {statusTabs}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q || category ? "Tidak ada dokumen yang cocok dengan filter." : "Belum ada dokumen."} />
          </div>
        ) : (
          <DocTable docs={documents} showClient />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Halaman {page} dari {totalPages} ({total} dokumen)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link href={href({ page: String(page + 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Berikutnya
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type DocRow = {
  id: string;
  fileName: string;
  description: string | null;
  category: string;
  fileSize: number;
  uploadedAt: Date;
  client?: { id: string; fullName: string } | null;
  job: { id: string; jobNumber: string } | null;
  uploader: { name: string } | null;
  uploadedByClientAccount: { name: string | null } | null;
};

function DocTable({ docs, showClient }: { docs: DocRow[]; showClient: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nama File</th>
            <th className="px-4 py-3 font-medium">Kategori</th>
            {showClient && <th className="px-4 py-3 font-medium">Klien / Pekerjaan</th>}
            <th className="px-4 py-3 font-medium">Ukuran</th>
            <th className="px-4 py-3 font-medium">Diunggah oleh</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {docs.map((doc) => (
            <tr key={doc.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link href={`/documents/${doc.id}`} className="flex items-start gap-2 font-medium text-foreground hover:underline">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="break-all">{doc.fileName}</span>
                </Link>
                {doc.description && <p className="ml-6 max-w-xs truncate text-xs text-muted-foreground">{doc.description}</p>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatStatusLabel(doc.category)}</td>
              {showClient && (
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.client && (
                    <Link href={`/documents?clientId=${doc.client.id}`} className="hover:underline">
                      {doc.client.fullName}
                    </Link>
                  )}
                  {doc.job && <p className="text-xs">{doc.job.jobNumber}</p>}
                  {!doc.client && !doc.job && "-"}
                </td>
              )}
              <td className="px-4 py-3 text-muted-foreground">{formatFileSize(doc.fileSize)}</td>
              <td className="px-4 py-3 text-muted-foreground">{doc.uploader?.name ?? (doc.uploadedByClientAccount ? "Klien (portal)" : "-")}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(doc.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
