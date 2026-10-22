"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Stamp } from "lucide-react";
import { finalizeDeedDraft, suggestDeedNumber, type FinalizeState } from "@/app/(dashboard)/jobs/[id]/deeds/actions";

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

/**
 * Kartu Notaris: nomor akta final -> arsip, minuta, salinan, repertorium.
 * Tanggal default hari ini; nomor diusulkan otomatis (nomor terakhir bulan itu + 1).
 */
export function FinalizeDeedForm({
  draftId,
  defaultNomor,
  defaultTanggal,
  plannedTanggal,
  ppat = false
}: {
  draftId: string;
  defaultNomor: string;
  defaultTanggal: string;
  /** Rencana tanggal di draft bila berbeda dari hari ini (sebagai pengingat). */
  plannedTanggal?: string;
  /** Akta PPAT: nomor urut per tahun di Buku Daftar Akta PPAT. */
  ppat?: boolean;
}) {
  const [state, action] = useFormState(finalizeDeedDraft.bind(null, draftId), {} as FinalizeState);
  const [nomor, setNomor] = useState(defaultNomor);
  const [tanggal, setTanggal] = useState(defaultTanggal);

  const changeDate = async (v: string) => {
    setTanggal(v);
    const next = await suggestDeedNumber(v, ppat);
    if (next) setNomor(next);
  };

  return (
    <form action={action} className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div>
        <h2 className="text-base font-bold text-foreground">Sahkan & Daftarkan</h2>
        <p className="text-xs text-muted-foreground">
          {ppat
            ? "Setelah akta ditandatangani: sistem mendaftarkannya di Buku Daftar Akta PPAT (nomor urut tahun berjalan), menyimpan Lembar Pertama & Kedua (Word final), membuat tugas penyampaian ke Kantor Pertanahan (7 hari kerja), mengunci draft, dan menyelesaikan pekerjaan."
            : "Setelah akta ditandatangani: sistem mencatat Akta di Lemari Arsip, menempelkan Minuta & Salinan (Word final), mendaftarkannya ke Repertorium, mengunci draft ini, dan menyelesaikan pekerjaan bila semua draftnya sudah disahkan."}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-32">
          <span className="mb-1 block text-xs text-muted-foreground">{ppat ? "Nomor akta PPAT" : "Nomor akta"}</span>
          <input
            name="nomor"
            required
            inputMode="numeric"
            value={nomor}
            onChange={(e) => setNomor(e.target.value)}
            placeholder="12"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="w-48">
          <span className="mb-1 block text-xs text-muted-foreground">Tanggal akta</span>
          <input
            name="tanggal"
            type="date"
            required
            value={tanggal}
            onChange={(e) => changeDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <p className="pb-2 text-xs text-muted-foreground">
          {ppat ? "Nomor diusulkan otomatis: urut berikutnya tahun itu." : "Nomor diusulkan otomatis dari akta terakhir bulan itu."}
          {plannedTanggal && ` Rencana tanggal di draft: ${plannedTanggal}.`}
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="ditandatangani" className="mt-1" /> Akta sudah ditandatangani para pihak, saksi & Notaris
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.error && <span className="text-sm text-status-overdue">{state.error}</span>}
      </div>
    </form>
  );
}
