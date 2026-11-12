import { PPAT_DEED_TYPES } from "@/lib/serviceOptions";
import { getT } from "@/lib/i18n/server";

const cls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export interface PpatDefaults {
  deedDate?: string;
  deedType?: string;
  partyFrom?: string;
  partyTo?: string;
  rightType?: string;
  location?: string;
  landArea?: string;
  buildingArea?: string;
  transactionValue?: string;
  njopValue?: string;
  nop?: string;
  sspDate?: string;
  sspAmount?: string;
  sspdDate?: string;
  sspdAmount?: string;
  notes?: string;
}

function F({ label, name, d, type = "text", wide, help, numeric }: { label: string; name: keyof PpatDefaults; d: PpatDefaults; type?: string; wide?: boolean; help?: string; numeric?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input name={name} type={type} defaultValue={d[name] ?? ""} inputMode={numeric ? "numeric" : undefined} className={cls} />
      {help && <span className="mt-0.5 block text-[11px] text-muted-foreground">{help}</span>}
    </label>
  );
}

/** Isian akta PPAT (dipakai untuk daftar baru & ubah). Server component. */
export async function PpatForm({
  action,
  d,
  submitLabel,
  hidden,
  sequenceHint
}: {
  action: (fd: FormData) => Promise<void>;
  d: PpatDefaults;
  submitLabel: string;
  hidden?: Record<string, string>;
  /** Usulan nomor urut (hanya saat daftar baru). */
  sequenceHint?: string;
}) {
  const { tp } = await getT();
  return (
    <form action={action} className="space-y-5">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">{tp("Akta")}</legend>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{tp("Perbuatan hukum")}</span>
          <select name="deedType" defaultValue={d.deedType ?? PPAT_DEED_TYPES[0]} className={cls}>
            {PPAT_DEED_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <F label={tp("Tanggal akta")} name="deedDate" type="date" d={d} />
        {sequenceHint !== undefined ? (
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">{tp("Nomor urut")}</span>
            <input name="sequence" inputMode="numeric" placeholder={sequenceHint} className={cls} />
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{tp("Kosongkan = otomatis (")}{sequenceHint})</span>
          </label>
        ) : (
          <div />
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">{tp("Para pihak")}</legend>
        <F label={tp("Pihak yang mengalihkan / memberikan (nama, alamat)")} name="partyFrom" d={d} />
        <F label={tp("Pihak yang menerima (nama, alamat)")} name="partyTo" d={d} />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">{tp("Objek")}</legend>
        <F label={tp("Jenis & nomor hak")} name="rightType" d={d} wide help="mis. Hak Milik No. 1234/Kel. Babakan" />
        <F label={tp("Letak tanah")} name="location" d={d} wide help="Kelurahan/Desa, Kecamatan" />
        <F label={tp("Luas tanah (m²)")} name="landArea" d={d} />
        <F label={tp("Luas bangunan (m²)")} name="buildingArea" d={d} />
        <F label={tp("NOP PBB")} name="nop" d={d} wide />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">{tp("Nilai & pajak")}</legend>
        <F label={tp("Nilai transaksi (Rp)")} name="transactionValue" d={d} numeric wide />
        <F label={tp("NJOP (Rp)")} name="njopValue" d={d} numeric wide />
        <F label={tp("Tanggal SSP PPh")} name="sspDate" type="date" d={d} />
        <F label={tp("Jumlah SSP PPh (Rp)")} name="sspAmount" d={d} numeric />
        <F label={tp("Tanggal SSPD BPHTB")} name="sspdDate" type="date" d={d} />
        <F label={tp("Jumlah SSPD BPHTB (Rp)")} name="sspdAmount" d={d} numeric />
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{tp("Catatan")}</span>
        <textarea name="notes" rows={2} defaultValue={d.notes ?? ""} className={cls} />
      </label>

      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
        {submitLabel}
      </button>
    </form>
  );
}
