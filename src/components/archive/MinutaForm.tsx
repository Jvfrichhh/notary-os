"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { ArchiveFormState } from "@/app/(dashboard)/archive/actions";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

interface DeedOption {
  id: string;
  deedNumber: string;
  deedType: string;
}
interface DocumentOption {
  id: string;
  fileName: string;
}

interface MinutaFormProps {
  action: (prevState: ArchiveFormState, formData: FormData) => Promise<ArchiveFormState>;
  deeds: DeedOption[];
  documents: DocumentOption[];
  lockedDeed?: { id: string; label: string };
  defaultValues?: { documentId?: string | null; repertoriumId?: string | null; notes?: string | null };
  cancelHref: string;
  submitLabel?: string;
}

const initialState: ArchiveFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

export function MinutaForm({ action, deeds, documents, lockedDeed, defaultValues, cancelHref, submitLabel = "Simpan Minuta" }: MinutaFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Akta <span className="text-status-overdue">*</span>
        </label>
        {lockedDeed ? (
          <>
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{lockedDeed.label}</p>
            <input type="hidden" name="deedId" value={lockedDeed.id} />
          </>
        ) : (
          <select name="deedId" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              — Pilih akta —
            </option>
            {deeds.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deedNumber} — {d.deedType}
              </option>
            ))}
          </select>
        )}
        {errors.deedId?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedId[0]}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Dokumen (Document Vault)</label>
        <select name="documentId" defaultValue={defaultValues?.documentId ?? ""} className={fieldClass}>
          <option value="">— Belum ada file terkait —</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.fileName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Daftar ini berisi dokumen yang sudah diupload lewat Document Vault untuk job terkait. Upload dulu di sana kalau file belum ada.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">Catatan</label>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className={fieldClass} />
        <p className="mt-1 text-xs text-muted-foreground">
          Repertorium bisa ditautkan setelah Minuta ini disimpan, dari halaman detailnya.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
