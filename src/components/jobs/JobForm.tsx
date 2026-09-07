"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { JobFormState } from "@/app/(dashboard)/jobs/actions";

interface ClientOption {
  id: string;
  fullName: string;
  clientNumber: string;
}

interface ServiceTypeOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface JobFormProps {
  action: (prevState: JobFormState, formData: FormData) => Promise<JobFormState>;
  clients: ClientOption[];
  serviceTypes: ServiceTypeOption[];
  users: UserOption[];
  cancelHref: string;
  defaultClientId?: string;
  defaultVisitId?: string;
}

const initialState: JobFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Buat Job"}
    </button>
  );
}

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function JobForm({
  action,
  clients,
  serviceTypes,
  users,
  cancelHref,
  defaultClientId,
  defaultVisitId
}: JobFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      {defaultVisitId && <input type="hidden" name="visitId" value={defaultVisitId} />}

      <div>
        <label htmlFor="clientId" className={labelClass}>
          Client <span className="text-status-overdue">*</span>
        </label>
        <select
          id="clientId"
          name="clientId"
          defaultValue={defaultClientId ?? ""}
          disabled={!!defaultClientId}
          className={cn(fieldClass, errors.clientId?.length && "border-status-overdue")}
        >
          <option value="">— Pilih client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientNumber} — {c.fullName}
            </option>
          ))}
        </select>
        {defaultClientId && <input type="hidden" name="clientId" value={defaultClientId} />}
        {errors.clientId?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.clientId[0]}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="serviceTypeId" className={labelClass}>
            Jenis Layanan
          </label>
          <select id="serviceTypeId" name="serviceTypeId" className={fieldClass} defaultValue="">
            <option value="">— Pilih jenis layanan —</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Kalau ada Service Template, checklist &amp; task otomatis dibuat.
          </p>
        </div>

        <div>
          <label htmlFor="priority" className={labelClass}>
            Prioritas
          </label>
          <select id="priority" name="priority" className={fieldClass} defaultValue="NORMAL">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div>
          <label htmlFor="deadline" className={labelClass}>
            Deadline
          </label>
          <input id="deadline" name="deadline" type="date" className={fieldClass} />
        </div>

        <div>
          <label htmlFor="picId" className={labelClass}>
            PIC
          </label>
          <select id="picId" name="picId" className={fieldClass} defaultValue="">
            <option value="">— Belum ditentukan —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reviewerId" className={labelClass}>
            Reviewer
          </label>
          <select id="reviewerId" name="reviewerId" className={fieldClass} defaultValue="">
            <option value="">— Belum ditentukan —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notaryId" className={labelClass}>
            Notaris
          </label>
          <select id="notaryId" name="notaryId" className={fieldClass} defaultValue="">
            <option value="">— Belum ditentukan —</option>
            {users
              .filter((u) => u.role === "NOTARY")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Deskripsi Pekerjaan
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="mis. Akta Jual Beli tanah di Jakarta Selatan"
          className={fieldClass}
        />
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
