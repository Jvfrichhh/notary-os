"use client";

import { useState } from "react";
import { PT_CHANGE_OPTIONS } from "@/lib/serviceCatalog";

export type ServiceOption = { id: string; name: string; category: string | null };
export type StaffOption = { id: string; name: string };

const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/**
 * Bagian "Layanan yang diminta" di form Tambah Klien: bila dicentang, job
 * langsung dibuat bersama kliennya (checklist dokumen terisi dari template).
 */
export function NewJobSection({
  services,
  staff,
  defaultPicId,
  error
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  defaultPicId?: string;
  error?: string;
}) {
  const [enabled, setEnabled] = useState(true);
  const [serviceId, setServiceId] = useState("");
  const selected = services.find((s) => s.id === serviceId);
  const isPtChange = selected?.name === "Akta Perubahan PT";

  // Kelompokkan per kategori supaya daftar 16 layanan mudah dicari.
  const groups = services.reduce<Record<string, ServiceOption[]>>((acc, s) => {
    const k = s.category ?? "Lainnya";
    (acc[k] ??= []).push(s);
    return acc;
  }, {});

  return (
    <fieldset className="space-y-4 rounded-lg border border-border p-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <input type="checkbox" name="withJob" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Langsung buat pekerjaan (job) untuk klien ini
      </label>
      {!enabled && <p className="text-xs text-muted-foreground">Klien disimpan tanpa job. Job bisa dibuat kapan saja dari halaman klien.</p>}

      {enabled && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="serviceTypeId" className="mb-1 block text-sm font-medium text-foreground">
              Layanan yang diminta <span className="text-status-overdue">*</span>
            </label>
            <select
              id="serviceTypeId"
              name="serviceTypeId"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={fieldClass}
            >
              <option value="">— Pilih jenis akta / layanan —</option>
              {Object.entries(groups).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {error && <p className="mt-1 text-xs text-status-overdue">{error}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Checklist dokumen dan tugas otomatis dibuat sesuai layanan.</p>
          </div>

          {isPtChange && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium text-foreground">Jenis perubahan</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {PT_CHANGE_OPTIONS.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" name="ptChanges" value={o} /> {o}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="jobDeadline" className="mb-1 block text-sm font-medium text-foreground">
              Target selesai
            </label>
            <input id="jobDeadline" name="jobDeadline" type="date" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="jobPicId" className="mb-1 block text-sm font-medium text-foreground">
              PIC (penanggung jawab)
            </label>
            <select id="jobPicId" name="jobPicId" defaultValue={defaultPicId ?? ""} className={fieldClass}>
              <option value="">— Belum ditentukan —</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="jobDescription" className="mb-1 block text-sm font-medium text-foreground">
              Keterangan pekerjaan
            </label>
            <input
              id="jobDescription"
              name="jobDescription"
              placeholder="mis. PPJB rumah di Jl. Pajajaran No. 10"
              className={fieldClass}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
