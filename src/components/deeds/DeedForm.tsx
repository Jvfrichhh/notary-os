"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Plus, Save, Send, Trash2 } from "lucide-react";
import { saveDeedDraft } from "@/app/(dashboard)/jobs/[id]/deeds/actions";
import { submitJobForReview } from "@/app/(dashboard)/jobs/actions";
import { isFieldVisible, PERSON_FIELDS, type DeedData, type FieldDef, type Person, type SectionDef } from "@/lib/deeds/schema";

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const asList = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Format ribuan saat mengetik nominal uang (disimpan sebagai digit saja). */
const moneyDisplay = (v: string) => (v ? v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");

/**
 * Tata letak identitas (12 kolom di layar lebar), urut seperti KTP:
 *   Sapaan | Nama lengkap | NIK
 *   Tempat lahir | Tanggal lahir | Pekerjaan | Kewarganegaraan
 *   Alamat | RT | RW
 *   Kelurahan/Desa | Kecamatan | Kota/Kabupaten
 * Di layar kecil menjadi 2 kolom.
 */
const PERSON_LAYOUT: { key: keyof Person; span: string }[][] = [
  [
    { key: "sapaan", span: "col-span-2 sm:col-span-2" },
    { key: "nama", span: "col-span-2 sm:col-span-6" },
    { key: "nik", span: "col-span-2 sm:col-span-4" }
  ],
  [
    { key: "tempatLahir", span: "col-span-1 sm:col-span-3" },
    { key: "tanggalLahir", span: "col-span-1 sm:col-span-3" },
    { key: "pekerjaan", span: "col-span-1 sm:col-span-3" },
    { key: "kewarganegaraan", span: "col-span-1 sm:col-span-3" }
  ],
  [
    { key: "alamat", span: "col-span-2 sm:col-span-8" },
    { key: "rt", span: "col-span-1 sm:col-span-2" },
    { key: "rw", span: "col-span-1 sm:col-span-2" }
  ],
  [
    { key: "kelurahan", span: "col-span-2 sm:col-span-4" },
    { key: "kecamatan", span: "col-span-1 sm:col-span-4" },
    { key: "kota", span: "col-span-1 sm:col-span-4" }
  ]
];

function PersonFields({ value, onChange }: { value: Person; onChange: (p: Person) => void }) {
  const defs = new Map(PERSON_FIELDS.map((f) => [f.key, f]));
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-12">
      {PERSON_LAYOUT.flat().map(({ key, span }) => {
        const f = defs.get(key);
        if (!f) return null;
        const v = asStr(value[f.key]);
        return (
          <label key={f.key} className={`${span} min-w-0`}>
            <span className="mb-1 block truncate text-xs text-muted-foreground">{f.label}</span>
            {f.kind === "select" ? (
              <select value={v} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {f.options!.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.kind === "date" ? "date" : "text"}
                inputMode={f.key === "nik" || f.key === "rt" || f.key === "rw" ? "numeric" : undefined}
                value={v}
                placeholder={f.placeholder}
                onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
                className={inputCls}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

/** Field yang memenuhi satu baris penuh di grid 2 kolom. */
const isWide = (f: FieldDef) =>
  f.kind === "person" || f.kind === "list" || f.kind === "checks" || f.kind === "textarea" || ("wide" in f && !!f.wide);

/**
 * Grid 2 kolom tanpa sel kosong: bila deretan field sempit berjumlah ganjil,
 * field terakhirnya dibuat selebar baris.
 */
function FieldGrid({ fields, data, onChange }: { fields: FieldDef[]; data: Obj; onChange: (key: string, v: unknown) => void }) {
  const visible = fields.filter((f) => isFieldVisible(f, data));
  const stretch = new Set<string>();
  let run: FieldDef[] = [];
  const flush = () => {
    if (run.length % 2 === 1) stretch.add(run[run.length - 1].key);
    run = [];
  };
  for (const f of visible) {
    if (isWide(f)) flush();
    else run.push(f);
  }
  flush();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {visible.map((f) => (
        <Field key={f.key} def={f} value={data[f.key]} stretch={stretch.has(f.key)} onChange={(v) => onChange(f.key, v)} />
      ))}
    </div>
  );
}

function Field({ def, value, onChange, stretch }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; stretch?: boolean }) {
  if (def.kind === "checks") {
    const chosen = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium text-foreground">{def.label}</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {def.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={chosen.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...chosen, o] : chosen.filter((c) => c !== o))}
              />
              {o}
            </label>
          ))}
        </div>
        {def.help && <p className="mt-1 text-xs text-muted-foreground">{def.help}</p>}
      </div>
    );
  }
  if (def.kind === "person") {
    return (
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-foreground">{def.label}</p>
        <PersonFields value={asObj(value) as Person} onChange={onChange} />
      </div>
    );
  }
  if (def.kind === "list") {
    const items = asList(value);
    const min = def.min ?? 0;
    const max = def.max ?? 20;
    return (
      <div className="space-y-3 sm:col-span-2">
        <div>
          <p className="text-sm font-medium text-foreground">{def.label}</p>
          {def.help && <p className="text-xs text-muted-foreground">{def.help}</p>}
        </div>
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {def.itemLabel} {i + 1}
              </p>
              {items.length > min && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="inline-flex items-center gap-1 text-xs text-status-overdue hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              )}
            </div>
            <FieldGrid
              fields={def.fields}
              data={item}
              onChange={(key, v) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)))}
            />
          </div>
        ))}
        {items.length < max && (
          <button
            type="button"
            onClick={() => onChange([...items, {}])}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah {def.itemLabel.toLowerCase()}
          </button>
        )}
      </div>
    );
  }

  const v = asStr(value);
  const wide = def.kind === "textarea" || ("wide" in def && def.wide) || stretch;
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-sm font-medium text-foreground">{def.label}</span>
      {def.kind === "select" ? (
        <select value={v || def.default || ""} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {def.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : def.kind === "textarea" ? (
        <textarea rows={4} value={v} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : def.kind === "money" ? (
        <input
          inputMode="numeric"
          value={moneyDisplay(v || def.default || "")}
          placeholder="0"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className={inputCls}
        />
      ) : (
        <input
          type={def.kind === "date" ? "date" : def.kind === "time" ? "time" : def.kind === "number" ? "number" : "text"}
          value={v || ("default" in def ? def.default ?? "" : "")}
          placeholder={"placeholder" in def ? def.placeholder : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}
      {"help" in def && def.help && <span className="mt-0.5 block text-xs text-muted-foreground">{def.help}</span>}
    </label>
  );
}

/**
 * Form isian draft akta. Data disimpan sebagai JSON di deed_drafts; tombol
 * unduh menyimpan dulu lalu mengunduh .docx minuta/salinan dari server.
 */
export function DeedForm({
  draftId,
  sections,
  initialData,
  canEdit,
  submitJobId,
  labels = { minuta: "Minuta", salinan: "Salinan" }
}: {
  draftId: string;
  sections: SectionDef[];
  initialData: DeedData;
  canEdit: boolean;
  /** Diisi bila staf boleh "Simpan & Ajukan ke Notaris" dari halaman ini. */
  submitJobId?: string;
  /** Nama unduhan (akta PPAT: Lembar Pertama/Kedua). */
  labels?: { minuta: string; salinan: string };
}) {
  const [data, setData] = useState<DeedData>(() => {
    // Daftar berulang tampil minimal sejumlah `min` item.
    const d: DeedData = { ...initialData };
    for (const s of sections)
      for (const f of s.fields)
        if (f.kind === "list" && asList(d[f.key]).length < (f.min ?? 0)) {
          d[f.key] = [...asList(d[f.key]), ...Array.from({ length: (f.min ?? 0) - asList(d[f.key]).length }, () => ({}))];
        }
    return d;
  });
  const [status, setStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  // Peringatan sebelum meninggalkan halaman bila ada isian belum tersimpan.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key: string, v: unknown) => {
    setData((d) => ({ ...d, [key]: v }));
    setDirty(true);
  };

  const save = (then?: () => void) =>
    startTransition(async () => {
      const res = await saveDeedDraft(draftId, JSON.stringify(data));
      if (res.ok) {
        setDirty(false);
        const time = new Date(res.savedAt!).toLocaleTimeString("id-ID");
        setStatus(
          res.warning
            ? res.warning
            : `Tersimpan ${time}${res.vaultFiles ? ` · ${labels.minuta} & ${labels.salinan} masuk Document Vault` : ""}`
        );
        then?.();
      } else setStatus(res.error ?? "Gagal menyimpan.");
    });

  const saveAndSubmit = () => {
    if (!submitJobId) return;
    const note = window.prompt("Catatan untuk Notaris (opsional):", "") ?? null;
    if (note === null) return; // dibatalkan
    save(() =>
      startTransition(async () => {
        const fd = new FormData();
        fd.set("note", note);
        await submitJobForReview(submitJobId, fd);
      })
    );
  };

  const download = (variant: "minuta" | "salinan") => {
    const go = () => (window.location.href = `/api/deeds/${draftId}/${variant}`);
    if (canEdit && dirty) save(go);
    else go();
  };

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <fieldset key={s.title} disabled={!canEdit} className="space-y-3 rounded-lg border border-border bg-background p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-foreground">{s.title}</legend>
          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
          <FieldGrid fields={s.fields} data={data} onChange={set} />
        </fieldset>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        {canEdit && (
          <button
            type="button"
            onClick={() => save()}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {pending ? "Menyimpan..." : "Simpan"}
          </button>
        )}
        {canEdit && submitJobId && (
          <button
            type="button"
            onClick={saveAndSubmit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Simpan & Ajukan ke Notaris
          </button>
        )}
        <button
          type="button"
          onClick={() => download("minuta")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> Unduh {labels.minuta} (.docx)
        </button>
        <button
          type="button"
          onClick={() => download("salinan")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-status-overdue/50 px-3 py-2 text-sm font-medium text-status-overdue hover:bg-status-overdue/10 disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> Unduh {labels.salinan} (.docx)
        </button>
        <span className="text-xs text-muted-foreground">{dirty ? "Ada perubahan belum disimpan" : status}</span>
      </div>
    </div>
  );
}
