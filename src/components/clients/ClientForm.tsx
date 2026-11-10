"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ClientFormState } from "@/app/(dashboard)/clients/actions";
import type { Client } from "@prisma/client";
import { NewJobSection, type ServiceOption, type StaffOption } from "@/components/clients/NewJobSection";
import { OCCUPATION_OPTIONS } from "@/lib/occupations";
import { usePhrase } from "@/components/i18n/LocaleProvider";

interface ClientFormProps {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  cancelHref: string;
  /** Hanya di form klien BARU: data untuk bagian "Langsung buat job". */
  newJob?: { services: ServiceOption[]; staff: StaffOption[]; defaultPicId?: string; withBilling?: boolean };
}

const initialState: ClientFormState = {};

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

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

export function ClientForm({ action, client, cancelHref, newJob }: ClientFormProps) {
  const tp = usePhrase();
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.formError && (
        <p className="rounded-md bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">{state.formError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={tp("Nama Lengkap")} name="fullName" defaultValue={client?.fullName} errors={errors.fullName} required />

        <div>
          <label htmlFor="clientType" className="mb-1 block text-sm font-medium text-foreground">
            {tp("Tipe Klien")}
          </label>
          <select
            id="clientType"
            name="clientType"
            defaultValue={client?.clientType ?? ""}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{tp("— Pilih —")}</option>
            <option value="Individu">{tp("Individu")}</option>
            <option value="Perusahaan">{tp("Perusahaan")}</option>
          </select>
        </div>

        <div>
          <Field label={tp("NIK")} name="nik" defaultValue={client?.nik} errors={errors.nik} />
          {state.duplicateNik && (
            <label className="mt-1 flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" name="allowDuplicateNik" /> {client ? tp("Tetap simpan") : tp("Tetap simpan sebagai klien baru")}
            </label>
          )}
        </div>
        <Field label={tp("No. Telepon")} name="phone" defaultValue={client?.phone} errors={errors.phone} />
        <div>
          <Field label={tp("Email")} name="email" type="email" defaultValue={client?.email} errors={errors.email} />
          {!client && newJob && (
            <label className="mt-1 flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" name="withPortal" defaultChecked /> {tp("Buatkan akses portal klien (bila email diisi)")}
            </label>
          )}
        </div>
        <Field label={tp("Kota")} name="city" defaultValue={client?.city} errors={errors.city} />
        <Field label={tp("Nama Perusahaan")} name="companyName" defaultValue={client?.companyName} errors={errors.companyName} />
        <Field label={tp("NPWP")} name="npwp" defaultValue={client?.npwp} errors={errors.npwp} />
        <div>
          <label htmlFor="occupation" className="mb-1 block text-sm font-medium text-foreground">
            {tp("Pekerjaan (sesuai KTP)")}
          </label>
          <input
            id="occupation"
            name="occupation"
            list="occupation-options"
            defaultValue={client?.occupation ?? ""}
            placeholder={tp("mis. Karyawan Swasta")}
            autoComplete="off"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <datalist id="occupation-options">
            {OCCUPATION_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          {errors.occupation && <p className="mt-1 text-xs text-status-overdue">{errors.occupation[0]}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{tp("Dipakai untuk laporan tahunan (PKJM). Pilih dari daftar atau ketik sendiri.")}</p>
        </div>
        <div>
          <label htmlFor="maritalStatus" className="mb-1 block text-sm font-medium text-foreground">
            {tp("Status Perkawinan")}
          </label>
          <select id="maritalStatus" name="maritalStatus" defaultValue={client?.maritalStatus ?? ""} className={selectClass}>
            <option value="">{tp("— Belum diisi —")}</option>
            <option value="Belum Kawin">{tp("Belum Kawin")}</option>
            <option value="Kawin">{tp("Kawin")}</option>
            <option value="Cerai Hidup">{tp("Cerai Hidup")}</option>
            <option value="Cerai Mati">{tp("Cerai Mati")}</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{tp("Bila “Kawin”, tindakan atas harta bersama perlu persetujuan suami/istri.")}</p>
        </div>
        <div className="sm:col-span-2">
          <Field label={tp("Wakil badan usaha (nama & jabatan; khusus klien perusahaan)")} name="representative" defaultValue={client?.representative} />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-bold text-foreground">{tp("Pengenalan Pengguna Jasa (PMPJ)")}</legend>
        <p className="text-xs text-muted-foreground">
          {tp("Diisi untuk transaksi yang wajib PMPJ (jual beli properti, pengelolaan uang/efek, pendirian dan jual beli badan usaha). Boleh dilengkapi belakangan dari halaman klien.")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sourceOfFunds" className="mb-1 block text-sm font-medium text-foreground">
              {tp("Sumber dana")}
            </label>
            <input id="sourceOfFunds" name="sourceOfFunds" list="sumber-dana" defaultValue={client?.sourceOfFunds ?? ""} autoComplete="off" maxLength={120} className={selectClass} />
            <datalist id="sumber-dana">
              {["Penghasilan / Gaji", "Hasil Usaha", "Tabungan", "Warisan", "Hibah", "Pinjaman / Kredit Bank", "Penjualan Aset"].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <Field label={tp("Tujuan transaksi")} name="transactionPurpose" defaultValue={client?.transactionPurpose} />
          <div className="sm:col-span-2">
            <Field label={tp("Pemilik manfaat (bila bertindak untuk pihak lain / korporasi)")} name="beneficialOwner" defaultValue={client?.beneficialOwner} />
          </div>
          <div>
            <label htmlFor="riskLevel" className="mb-1 block text-sm font-medium text-foreground">
              {tp("Profil risiko")}
            </label>
            <select id="riskLevel" name="riskLevel" defaultValue={client?.riskLevel ?? ""} className={selectClass}>
              <option value="">{tp("— Belum dinilai —")}</option>
              <option value="RENDAH">{tp("Rendah")}</option>
              <option value="SEDANG">{tp("Sedang")}</option>
              <option value="TINGGI">{tp("Tinggi")}</option>
            </select>
          </div>
          <label className="flex items-start gap-2 self-end pb-2 text-sm text-foreground">
            <input type="checkbox" name="isPep" defaultChecked={client?.isPep ?? false} className="mt-1" />
            <span>{tp("Pejabat publik / orang yang populer secara politis (PEP), atau keluarga dekatnya")}</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-foreground">
          {tp("Alamat")}
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
          {tp("Catatan")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {newJob && (
        <NewJobSection
          services={newJob.services}
          staff={newJob.staff}
          defaultPicId={newJob.defaultPicId}
          withBilling={newJob.withBilling}
          error={state.errors?.serviceTypeId?.[0]}
        />
      )}

      {!client && (
        <label className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
          <input type="checkbox" name="dataConsent" required className="mt-1" />
          <span>
            {tp("Klien sudah diberi penjelasan dan")} <strong>{tp("menyetujui pemrosesan data pribadinya")}</strong> {tp("(KTP, KK, dan dokumen lain) untuk keperluan pembuatan akta dan layanan kantor ini, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.")}
            <span className="mt-0.5 block text-xs text-muted-foreground">{tp("Formulir persetujuan untuk ditandatangani klien bisa diunduh di halaman klien.")}</span>
          </span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={client ? tp("Simpan Perubahan") : newJob ? tp("Simpan Klien & Pekerjaan") : tp("Simpan Klien")} />
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          {tp("Batal")}
        </Link>
      </div>
    </form>
  );
}
