"use client";

import { useFormState } from "react-dom";
import { Upload } from "lucide-react";
import {
  requestPortalUploadTicket,
  uploadChecklistDocument,
  type PortalUploadState
} from "@/app/portal/(app)/jobs/[id]/actions";
import { useDirectUpload } from "@/components/upload/useDirectUpload";

const initial: PortalUploadState = {};

export function ChecklistUploadForm({
  checklistItemId,
  accept,
  allowedLabel,
  replace
}: {
  checklistItemId: string;
  accept: string;
  allowedLabel: string;
  /** true = sudah pernah unggah (menunggu/perlu perbaikan), tombol berbunyi "Kirim ulang". */
  replace: boolean;
}) {
  const action = uploadChecklistDocument.bind(null, checklistItemId);
  const [state, formAction] = useFormState(action, initial);
  const { onSubmit, busy, uploading, uploadError } = useDirectUpload(
    (_form, meta) => requestPortalUploadTicket(checklistItemId, meta),
    formAction
  );

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          required
          accept={accept}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted sm:text-xs sm:file:py-1.5 sm:file:text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto sm:py-1.5 sm:text-xs"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Mengunggah..." : busy ? "Menyimpan..." : replace ? "Kirim ulang" : "Unggah"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">Format: {allowedLabel}, maks. 20 MB. Pastikan dokumen terbaca jelas.</p>
      {uploadError && <p className="text-xs text-status-overdue">{uploadError}</p>}
      {!uploadError && state.error && <p className="text-xs text-status-overdue">{state.error}</p>}
      {state.success && <p className="text-xs text-status-on-track">{state.success}</p>}
    </form>
  );
}
