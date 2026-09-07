"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { VisitFormState } from "@/app/(dashboard)/visits/actions";

interface ClientOption {
  id: string;
  fullName: string;
  clientNumber: string;
  phone: string | null;
}

interface StaffOption {
  id: string;
  name: string;
}

interface VisitFormProps {
  action: (prevState: VisitFormState, formData: FormData) => Promise<VisitFormState>;
  clients: ClientOption[];
  staff: StaffOption[];
  cancelHref: string;
}

const initialState: VisitFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Kunjungan"}
    </button>
  );
}

export function VisitForm({ action, clients, staff, cancelHref }: VisitFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedClientId, setSelectedClientId] = useState("");

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <form action={formAction} className="space-y-6">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Pengunjung</p>
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm w-fit">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={cn("rounded px-3 py-1", mode === "new" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground")}
          >
            Klien Baru / Belum Terdaftar
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={cn(
              "rounded px-3 py-1",
              mode === "existing" ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Klien Terdaftar
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        <div>
          <label htmlFor="clientId" className="mb-1 block text-sm font-medium text-foreground">
            Pilih Client <span className="text-status-overdue">*</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Pilih client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientNumber} — {c.fullName}
              </option>
            ))}
          </select>
          <input type="hidden" name="visitorName" value={selectedClient?.fullName ?? ""} />
          {errors.visitorName?.length && !selectedClient ? (
            <p className="mt-1 text-xs text-status-overdue">Pilih client terlebih dahulu.</p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="visitorName" className="mb-1 block text-sm font-medium text-foreground">
              Nama Pengunjung <span className="text-status-overdue">*</span>
            </label>
            <input
              id="visitorName"
              name="visitorName"
              type="text"
              className={cn(
                "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30",
                errors.visitorName?.length && "border-status-overdue"
              )}
            />
            {errors.visitorName?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.visitorName[0]}</p> : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
            No. Telepon
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={selectedClient?.phone ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="origin" className="mb-1 block text-sm font-medium text-foreground">
            Asal / Referensi
          </label>
          <input
            id="origin"
            name="origin"
            type="text"
            placeholder="mis. Google, referral, walk-in"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="serviceCategory" className="mb-1 block text-sm font-medium text-foreground">
            Kategori Layanan
          </label>
          <input
            id="serviceCategory"
            name="serviceCategory"
            type="text"
            placeholder="mis. Pertanahan, Perusahaan, Waris"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="staffId" className="mb-1 block text-sm font-medium text-foreground">
            Ditangani Oleh
          </label>
          <select
            id="staffId"
            name="staffId"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Belum ditentukan —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="purpose" className="mb-1 block text-sm font-medium text-foreground">
          Keperluan
        </label>
        <input
          id="purpose"
          name="purpose"
          type="text"
          placeholder="mis. Konsultasi Akta Jual Beli"
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
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
