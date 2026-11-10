"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useState } from "react";
import type { RepertoriumFormState } from "@/app/(dashboard)/notary-record/actions";
import { usePhrase } from "@/components/i18n/LocaleProvider";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

interface DeedOption {
  id: string;
  deedNumber: string;
  deedType: string;
  deedDate: string; // ISO, sudah diformat di server component pemanggil
  clientName: string;
}

interface RepertoriumFormProps {
  action: (prevState: RepertoriumFormState, formData: FormData) => Promise<RepertoriumFormState>;
  deeds: DeedOption[];
  lockedDeedId?: string;
  cancelHref: string;
}

const initialState: RepertoriumFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Repertorium"}
    </button>
  );
}

export function RepertoriumForm({ action, deeds, lockedDeedId, cancelHref }: RepertoriumFormProps) {
  const tp = usePhrase();
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};
  const [selectedDeedId, setSelectedDeedId] = useState(lockedDeedId ?? "");

  const selectedDeed = deeds.find((d) => d.id === selectedDeedId);

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {tp("Akta")} <span className="text-status-overdue">*</span>
        </label>
        {lockedDeedId ? (
          <>
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {selectedDeed ? `${selectedDeed.deedNumber} — ${selectedDeed.clientName}` : lockedDeedId}
            </p>
            <input type="hidden" name="deedId" value={lockedDeedId} />
          </>
        ) : (
          <select
            name="deedId"
            required
            value={selectedDeedId}
            onChange={(e) => setSelectedDeedId(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              {tp("— Pilih akta —")}
            </option>
            {deeds.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deedNumber} — {d.clientName}
              </option>
            ))}
          </select>
        )}
        {errors.deedId?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.deedId[0]}</p> : null}
      </div>

      {/* Read-only, diambil otomatis dari Deed -- supaya data tidak terduplikasi/mismatch */}
      {selectedDeed && (
        <div className="grid grid-cols-1 gap-4 rounded-md bg-muted p-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{tp("Jenis Akta")}</p>
            <p className="text-sm text-foreground">{selectedDeed.deedType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{tp("Tanggal Akta")}</p>
            <p className="text-sm text-foreground">{selectedDeed.deedDate}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{tp("Klien")}</p>
            <p className="text-sm text-foreground">{selectedDeed.clientName}</p>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {tp("Nama Penghadap")} <span className="text-status-overdue">*</span>
        </label>
        <input name="appearerName" required className={fieldClass} placeholder={tp("cth. Budi Santoso")} />
        <p className="mt-1 text-xs text-muted-foreground">{tp("Bisa beda dari nama klien kalau ada kuasa/perwakilan.")}</p>
        {errors.appearerName?.length ? <p className="mt-1 text-xs text-status-overdue">{errors.appearerName[0]}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">{tp("Keterangan")}</label>
        <textarea name="description" rows={3} className={fieldClass} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          {tp("Batal")}
        </Link>
      </div>
    </form>
  );
}
