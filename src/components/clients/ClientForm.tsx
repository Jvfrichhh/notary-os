"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ClientFormState } from "@/app/(dashboard)/clients/actions";
import type { Client } from "@prisma/client";

interface ClientFormProps {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  cancelHref: string;
}

const initialState: ClientFormState = {};

function Field({
  label,
  name,
  defaultValue,
  errors,
  type = "text",
  required
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  errors?: string[];
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-status-overdue">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className={cn(
          "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          errors?.length && "border-status-overdue"
        )}
      />
      {errors?.length ? <p className="mt-1 text-xs text-status-overdue">{errors[0]}</p> : null}
    </div>
  );
}

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

export function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama Lengkap" name="fullName" defaultValue={client?.fullName} errors={errors.fullName} required />

        <div>
          <label htmlFor="clientType" className="mb-1 block text-sm font-medium text-foreground">
            Tipe Client
          </label>
          <select
            id="clientType"
            name="clientType"
            defaultValue={client?.clientType ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Pilih —</option>
            <option value="Individu">Individu</option>
            <option value="Perusahaan">Perusahaan</option>
          </select>
        </div>

        <Field label="NIK" name="nik" defaultValue={client?.nik} errors={errors.nik} />
        <Field label="No. Telepon" name="phone" defaultValue={client?.phone} errors={errors.phone} />
        <Field label="Email" name="email" type="email" defaultValue={client?.email} errors={errors.email} />
        <Field label="Kota" name="city" defaultValue={client?.city} errors={errors.city} />
        <Field label="Nama Perusahaan" name="companyName" defaultValue={client?.companyName} errors={errors.companyName} />
        <Field label="NPWP" name="npwp" defaultValue={client?.npwp} errors={errors.npwp} />
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-foreground">
          Alamat
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={client?.address ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-foreground">
          Catatan
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={client ? "Simpan Perubahan" : "Simpan Client"} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Batal
        </Link>
      </div>
    </form>
  );
}
