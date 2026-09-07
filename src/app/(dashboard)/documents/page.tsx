import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatFileSize, formatStatusLabel } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORIES = ["CLIENT_DOCUMENT", "WORKING_DOCUMENT", "FINAL_DOCUMENT", "SUPPORTING_DOCUMENT"] as const;
const PAGE_SIZE = 20;

interface DocumentsPageProps {
  searchParams: {
    q?: string;
    category?: string;
    status?: string;
    clientId?: string;
    jobId?: string;
    page?: string;
  };
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await requirePermission(PERMISSIONS.VIEW_DOCUMENTS);
  const canUpload = await userHasPermission(user.id, PERMISSIONS.UPLOAD_DOCUMENTS);

  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const category = CATEGORIES.includes(searchParams.category as never) ? searchParams.category : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.DocumentWhereInput = {
    status: statusFilter,
    ...(category ? { category: category as (typeof CATEGORIES)[number] } : {}),
    ...(searchParams.clientId ? { clientId: searchParams.clientId } : {}),
    ...(searchParams.jobId ? { jobId: searchParams.jobId } : {}),
    ...(q
      ? {
          OR: [
            { fileName: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: { client: true, job: true, uploader: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.document.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged: { q: string; category?: string; status: string; page: string } = {
      q,
      category,
      status: statusFilter,
      page: String(page),
      ...overrides
    };
    if (merged.q) params.set("q", merged.q);
    if (merged.category) params.set("category", merged.category);
    if (merged.status === "ARCHIVED") params.set("status", "ARCHIVED");
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return `/documents${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Document Vault</h1>
          <p className="text-sm text-muted-foreground">Semua dokumen client dan job</p>
        </div>
        {canUpload && (
          <Link
            href="/documents/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Upload Dokumen
          </Link>
        )}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama file atau deskripsi..."
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

          <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
            <Link
              href={pageHref({ status: "ACTIVE", page: "1" })}
              className={`rounded px-3 py-1 ${statusFilter === "ACTIVE" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Aktif
            </Link>
            <Link
              href={pageHref({ status: "ARCHIVED", page: "1" })}
              className={`rounded px-3 py-1 ${statusFilter === "ARCHIVED" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Arsip
            </Link>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-6">
            <EmptyState title={q || category ? "Tidak ada dokumen yang cocok dengan filter." : "Belum ada dokumen."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nama File</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Client / Job</th>
                  <th className="px-4 py-3 font-medium">Ukuran</th>
                  <th className="px-4 py-3 font-medium">Uploader</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:underline">
                        {doc.fileName}
                      </Link>
                      {doc.description && <p className="max-w-xs truncate text-xs text-muted-foreground">{doc.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStatusLabel(doc.category)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {doc.client && <p>{doc.client.fullName}</p>}
                      {doc.job && <p className="text-xs">{doc.job.jobNumber}</p>}
                      {!doc.client && !doc.job && "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.uploader?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(doc.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>
              Halaman {page} dari {totalPages} ({total} dokumen)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref({ page: String(page - 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageHref({ page: String(page + 1) })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
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
