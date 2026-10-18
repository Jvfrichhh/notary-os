"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Upload } from "lucide-react";
import { uploadChecklistDocument, type PortalUploadState } from "@/app/portal/(app)/jobs/[id]/actions";

const initial: PortalUploadState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      <Upload className="h-3.5 w-3.5" />
      {pending ? "Mengirim..." : label}
    </button>
  );
}

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

  return (
    <form action={formAction} className="mt-2 space-y-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          required
          accept={accept}
          className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
        />
        <SubmitButton label={replace ? "Kirim ulang" : "Unggah"} />
      </div>
      <p className="text-[11px] text-muted-foreground">Format: {allowedLabel}. Pastikan dokumen terbaca jelas.</p>
      {state.error && <p className="text-xs text-status-overdue">{state.error}</p>}
      {state.success && <p className="text-xs text-status-on-track">{state.success}</p>}
    </form>
  );
}
