"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ClientFormState } from "@/app/(dashboard)/clients/actions";
import { NewJobSection, type ServiceOption, type StaffOption } from "@/components/clients/NewJobSection";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Buat Pekerjaan"}
    </button>
  );
}

/** "+ Pekerjaan baru" di halaman klien: klien lama datang lagi tanpa membuat data klien ganda. */
export function ClientNewJobForm({
  action,
  services,
  staff,
  withBilling
}: {
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  services: ServiceOption[];
  staff: StaffOption[];
  withBilling?: boolean;
}) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.formError && <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>}
      <NewJobSection fixed services={services} staff={staff} withBilling={withBilling} error={state.errors?.serviceTypeId?.[0]} />
      <Submit />
    </form>
  );
}
