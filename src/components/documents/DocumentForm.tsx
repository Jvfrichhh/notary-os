"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE, ALLOWED_EXTENSIONS_LABEL } from "@/lib/uploadValidation";
import type { DocumentFormState } from "@/app/(dashboard)/documents/actions";

const CATEGORIES = [
  { value: "CLIENT_DOCUMENT", label: "Client Document" },
  { value: "WORKING_DOCUMENT", label: "Working Document" },
  { value: "FINAL_DOCUMENT", label: "Final Document" },
  { value: "SUPPORTING_DOCUMENT", label: "Supporting Document" }
];

interface ClientOption {
  id: string;
  fullName: string;
  clientNumber: string;
}

interface JobOption {
  id: string;
  jobNumber: string;
  description: string | null;
}

interface DocumentFormProps {
  action: (prevState: DocumentFormState, formData: FormData) => Promise<DocumentFormState>;
  clients: ClientOption[];
  jobs: JobOption[];
  lockedClient?: { id: string; label: string };
  lockedJob?: { id: string; label: string };
  cancelHref: string;
}

const initialState: DocumentFormState = {};

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Mengunggah..." : "Upload Dokumen"}
    </button>
  );
}

export function DocumentForm({ action, clients, jobs, lockedClient, lockedJob, cancelHref }: DocumentFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div>
        <label htmlFor="file" className="mb-1 block text-sm font-medium text-foreground">
          File <span className="text-status-overdue">*</span>
        </label>
        <input id="file" name="file" type="file" required accept={ACCEPT_ATTRIBUTE} className={fieldClass} />
        <p className="mt-1 text-xs text-muted-foreground">Format yang didukung: {ALLOWED_EXTENSIONS_LABEL}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Client</label>
          {lockedClient ? (
            <>
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {lockedClient.label}
              </p>
              <input type="hidden" name="clientId" value={lockedClient.id} />
            </>
          ) : (
            <select name="clientId" defaultValue="" className={fieldClass}>
              <option value="">— Tidak terkait client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientNumber} — {c.fullName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Job</label>
          {lockedJob ? (
            <>
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{lockedJob.label}</p>
              <input type="hidden" name="jobId" value={lockedJob.id} />
            </>
          ) : (
            <select name="jobId" defaultValue="" className={fieldClass}>
              <option value="">— Tidak terkait job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber} {j.description ? `— ${j.description}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-foreground">
          Kategori <span className="text-status-overdue">*</span>
        </label>
        <select id="category" name="category" required defaultValue="" className={cn(fieldClass, errors.category?.length && "border-status-overdue")}>
          <option value="" disabled>
            — Pilih kategori —
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.category?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.category[0]}</p> : null}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-foreground">
          Deskripsi
        </label>
        <textarea id="description" name="description" rows={3} className={fieldClass} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
