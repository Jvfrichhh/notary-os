import Link from "next/link";
import { formatDateTime } from "@/lib/format";

type Item = {
  id: string;
  label: string;
  status: "MISSING" | "COMPLETE";
  reviewStatus: "PENDING_REVIEW" | "ACCEPTED" | "NEEDS_REVISION" | null;
  reviewNote: string | null;
  document: { id: string; fileName: string; uploadedAt: Date };
};

/**
 * Kartu kecil di halaman job internal untuk SATU unggahan klien:
 * nama file + tautan (jika punya view_documents) + tombol Terima / Perlu
 * Perbaikan (jika punya edit_jobs). Server component; aksi lewat form.
 */
export function ClientUploadReview({
  item,
  canReview,
  canViewDocuments,
  action
}: {
  item: Item;
  canReview: boolean;
  canViewDocuments: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const pending = item.reviewStatus === "PENDING_REVIEW";
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-foreground">Unggahan klien — {item.label}</span>
          <span className="text-muted-foreground">
            {" "}
            · {canViewDocuments ? (
              <Link href={`/documents/${item.document.id}`} className="text-primary hover:underline">
                {item.document.fileName}
              </Link>
            ) : (
              item.document.fileName
            )}{" "}
            · {formatDateTime(item.document.uploadedAt)}
          </span>
        </div>
        <span className="text-muted-foreground">
          {item.reviewStatus === "ACCEPTED" || item.status === "COMPLETE"
            ? "Diterima"
            : item.reviewStatus === "NEEDS_REVISION"
              ? `Diminta perbaikan: ${item.reviewNote ?? "-"}`
              : "Menunggu pemeriksaan"}
        </span>
      </div>

      {canReview && pending && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <form action={action}>
            <input type="hidden" name="decision" value="ACCEPTED" />
            <button
              type="submit"
              className="rounded-md bg-status-on-track px-3 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              Terima
            </button>
          </form>
          <form action={action} className="flex flex-1 gap-2">
            <input type="hidden" name="decision" value="NEEDS_REVISION" />
            <input
              name="note"
              required
              minLength={3}
              placeholder="Alasan perbaikan (ditampilkan ke klien)"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-md border border-status-overdue px-3 py-1 text-xs font-medium text-status-overdue hover:bg-status-overdue/10"
            >
              Perlu Perbaikan
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
