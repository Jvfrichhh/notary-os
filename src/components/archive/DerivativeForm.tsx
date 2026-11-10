"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { ArchiveFormState } from "@/app/(dashboard)/archive/actions";
import { usePhrase } from "@/components/i18n/LocaleProvider";

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

interface DerivativeFormProps {
  action: (prevState: ArchiveFormState, formData: FormData) => Promise<ArchiveFormState>;
  label: string; // "Salinan" | "Grosse" | "Kutipan"
  deeds: DeedOption[];
  documents: DocumentOption[];
  lockedDeed?: { id: string; label: string };
  cancelHref: string;
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
      {pending ? "Menyimpan..." : `Simpan ${label}`}
    </button>
  );
}

export function DerivativeForm({ action, label, deeds, documents, lockedDeed, cancelHref }: DerivativeFormProps) {
  const tp = usePhrase();
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {tp("Akta")} <span className="text-status-overdue">*</span>
        </label>
        {lockedDeed ? (
          <>
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{lockedDeed.label}</p>
            <input type="hidden" name="deedId" value={lockedDeed.id} />
          </>
        ) : (
          <select name="deedId" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              {tp("— Pilih akta —")}
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
        <label className="mb-1 block text-sm font-medium text-foreground">{tp("Dokumen (Document Vault)")}</label>
        <select name="documentId" defaultValue="" className={fieldClass}>
          <option value="">{tp("— Belum ada file terkait —")}</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.fileName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          {tp("Upload file lewat Document Vault dulu kalau belum ada di daftar ini.")}
        </p>
      </div>

      {label === "Salinan" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{tp("Diberikan kepada")}</label>
            <input name="recipient" maxLength={200} placeholder={tp("mis. Tuan Budi (Pihak Pertama)")} className={fieldClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{tp("Tanggal diberikan")}</label>
            <input type="date" name="issuedAt" className={fieldClass} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={label} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          {tp("Batal")}
        </Link>
      </div>
    </form>
  );
}
