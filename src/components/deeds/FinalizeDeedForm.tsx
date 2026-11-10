"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Stamp } from "lucide-react";
import { finalizeDeedDraft, suggestDeedNumber, type FinalizeState } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { usePhrase } from "@/components/i18n/LocaleProvider";

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
  ppat = false,
  blanks = 0,
  review = "none",
  pajakBelum = []
}: {
  draftId: string;
  defaultNomor: string;
  defaultTanggal: string;
  /** Rencana tanggal di draft bila berbeda dari hari ini (sebagai pengingat). */
  plannedTanggal?: string;
  /** Akta PPAT: nomor urut per tahun di Buku Daftar Akta PPAT. */
  ppat?: boolean;
  /** Jumlah isian yang masih kosong ([...]) di badan akta (dari draft tersimpan). */
  blanks?: number;
  /** Status pemeriksaan klien di portal atas isi draft saat ini. */
  review?: "none" | "waiting" | "approved" | "changes" | "outdated";
  /** Akta PPAT: tahap validasi pajak (PPh/BPHTB) yang belum ditandai selesai. */
  pajakBelum?: string[];
}) {
  const tp = usePhrase();
  const [state, action] = useFormState(finalizeDeedDraft.bind(null, draftId), {} as FinalizeState);
  const [nomor, setNomor] = useState(defaultNomor);
  const [tanggal, setTanggal] = useState(defaultTanggal);

  const changeDate = async (v: string) => {
    setTanggal(v);
    const next = await suggestDeedNumber(v, ppat);
    if (next) setNomor(next);
  };

  return (
    <form action={action} className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-foreground">{tp("Sahkan & Daftarkan")}</h2>
        <p className="text-xs text-muted-foreground">
          {ppat
            ? tp("Setelah akta ditandatangani: sistem mendaftarkannya di Buku Daftar Akta PPAT (nomor urut tahun berjalan), menyimpan Lembar Pertama & Kedua (Word final), membuat tugas penyampaian ke Kantor Pertanahan (7 hari kerja), mengunci draft, dan menyelesaikan pekerjaan.")
            : tp("Setelah akta ditandatangani: sistem mencatat Akta di Lemari Arsip, menempelkan Minuta & Salinan (Word final), mendaftarkannya ke Repertorium, mengunci draft ini, dan menyelesaikan pekerjaan bila semua draftnya sudah disahkan.")}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-28 sm:w-32">
          <span className="mb-1 block text-xs text-muted-foreground">{ppat ? tp("Nomor akta PPAT") : tp("Nomor akta")}</span>
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
        <label className="min-w-0 flex-1 sm:w-48 sm:flex-none">
          <span className="mb-1 block text-xs text-muted-foreground">{tp("Tanggal akta")}</span>
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
          {ppat ? tp("Nomor diusulkan otomatis: urut berikutnya tahun itu.") : tp("Nomor diusulkan otomatis dari akta terakhir bulan itu.")}
          {plannedTanggal && tp(" Rencana tanggal di draft: {0}.", [plannedTanggal])}
        </p>
      </div>
      {(blanks > 0 || pajakBelum.length > 0 || (review !== "none" && review !== "approved")) && (
        <div role="alert" className="space-y-2 rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2.5">
          <p className="text-sm font-bold text-foreground">{tp("Periksa dulu sebelum mengesahkan")}</p>
          {blanks > 0 && (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" name="abaikanKosong" className="mt-1" />
              <span>
                {tp("Masih ada")} <strong>{blanks} {tp("isian kosong")}</strong> {tp("yang tercetak [...] di akta. Centang hanya bila isian itu memang sengaja dikosongkan.")}
              </span>
            </label>
          )}
          {pajakBelum.length > 0 && (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" name="abaikanPajak" className="mt-1" />
              <span>
                {tp("Tahap pajak")} <strong>{tp("belum ditandai selesai")}</strong>: {pajakBelum.join("; ")}{tp(". Centang hanya bila bukti setor/validasi pajaknya sudah diterima atau peralihan ini memang tidak terutang pajak.")}
              </span>
            </label>
          )}
          {review !== "none" && review !== "approved" && (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" name="abaikanPersetujuan" className="mt-1" />
              <span>
                {review === "changes" && <>{tp("Klien")} <strong>{tp("masih meminta koreksi")}</strong> {tp("atas draft ini di portal.")} </>}
                {review === "outdated" && <>{tp("Draft")} <strong>{tp("diubah setelah dibagikan")}</strong>{tp("; klien belum membaca versi ini.")} </>}
                {review === "waiting" && <>{tp("Klien")} <strong>{tp("belum menyetujui")}</strong> {tp("draft yang dibagikan.")} </>}
                {tp("Centang bila klien sudah menyetujui isi akta ini secara langsung saat pembacaan.")}
              </span>
            </label>
          )}
        </div>
      )}
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="ditandatangani" className="mt-1" /> {tp("Akta sudah ditandatangani para pihak, saksi & Notaris")}
      </label>
      {!ppat && (
        <p className="text-xs text-muted-foreground">
          {tp("Bila ada coretan, penggantian, atau tambahan yang diparaf saat pembacaan, isi dulu kolom “Perubahan (renvoi)” di bagian Data Akta lalu simpan.")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.error && <span className="text-sm text-status-overdue">{state.error}</span>}
      </div>
    </form>
  );
}
