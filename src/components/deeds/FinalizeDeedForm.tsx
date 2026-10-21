"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Stamp } from "lucide-react";
import { finalizeDeedDraft, type FinalizeState } from "@/app/(dashboard)/jobs/[id]/deeds/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      <Stamp className="h-4 w-4" /> {pending ? "Mendaftarkan..." : "Sahkan & Daftarkan"}
    </button>
  );
}

/** Kartu Notaris: nomor akta final -> arsip, minuta, salinan, repertorium. */
export function FinalizeDeedForm({ draftId, defaultNomor, defaultTanggal }: { draftId: string; defaultNomor: string; defaultTanggal: string }) {
  const [state, action] = useFormState(finalizeDeedDraft.bind(null, draftId), {} as FinalizeState);
  return (
    <form action={action} className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Sahkan & Daftarkan</h2>
        <p className="text-xs text-muted-foreground">
          Setelah akta ditandatangani: masukkan nomor akta final. Sistem otomatis mencatat Akta di Lemari Arsip, menempelkan
          Minuta & Salinan (Word final), mendaftarkannya ke Repertorium dengan nomor urut tahun berjalan, lalu mengunci draft ini.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs text-muted-foreground">Nomor akta</span>
          <input name="nomor" required inputMode="numeric" defaultValue={defaultNomor} placeholder="12" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted-foreground">Tanggal akta</span>
          <input name="tanggal" type="date" required defaultValue={defaultTanggal} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" name="ditandatangani" className="mb-0.5" /> Akta sudah ditandatangani para pihak, saksi & Notaris
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.error && <span className="text-sm text-status-overdue">{state.error}</span>}
      </div>
    </form>
  );
}
