"use client";

import { useFormState } from "react-dom";
import { requestOfficeUploadTicket, uploadNewVersion, type VersionUploadState } from "@/app/(dashboard)/documents/actions";
import { useDirectUpload } from "@/components/upload/useDirectUpload";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Unggah versi baru sebuah dokumen (unggah langsung ke storage, s.d. 20 MB). */
export function VersionUploadForm({ documentId, accept }: { documentId: string; accept: string }) {
  const [state, formAction] = useFormState(uploadNewVersion.bind(null, documentId), {} as VersionUploadState);
  const { onSubmit, busy, uploading, uploadError } = useDirectUpload(
    (_form, meta) => requestOfficeUploadTicket({ kind: "version", documentId }, meta),
    formAction
  );
  const error = uploadError ?? state.error;

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">Unggah Versi Baru</p>
      <input type="file" name="file" required accept={accept} className={inputCls} />
      <input type="text" name="notes" placeholder="Catatan versi (opsional)" className={inputCls} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {uploading ? "Mengunggah..." : busy ? "Menyimpan..." : "Upload sebagai Versi Baru"}
        </button>
        {error && <span className="text-sm text-status-overdue">{error}</span>}
        {!error && state.success && <span className="text-sm text-status-on-track">{state.success}</span>}
      </div>
      <p className="text-xs text-muted-foreground">Maksimal 20 MB.</p>
    </form>
  );
}
