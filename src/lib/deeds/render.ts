import { blocksToLines, paginate } from "./layout";
import { buildDocx, type Variant } from "./docx";
import { tandaTanganMinuta, tandaTanganSalinan } from "./common";
import type { DeedTemplate } from "./types";
import { isFieldVisible, type DeedData, type FieldDef } from "./schema";
import { sectionsFor } from "./registry";

/** Isi nilai bawaan isian yang masih kosong (termasuk di dalam daftar berulang). */
export function applyDefaults(fields: FieldDef[], data: DeedData): DeedData {
  const out: DeedData = { ...data };
  for (const f of fields) {
    // Isian yang disembunyikan (jenis perubahan tidak dicentang) tidak dimuat dalam akta.
    if (!isFieldVisible(f, data)) {
      delete out[f.key];
      continue;
    }
    if (f.kind === "list") {
      const items = Array.isArray(out[f.key]) ? (out[f.key] as DeedData[]) : [];
      out[f.key] = items.map((it) => applyDefaults(f.fields, it ?? {}));
    } else if ("default" in f && f.default !== undefined) {
      const v = out[f.key];
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) out[f.key] = f.default;
    }
  }
  return out;
}

/** Hasilkan .docx minuta atau salinan dari template + data. */
export function renderDeed(
  template: DeedTemplate,
  rawData: DeedData,
  variant: Variant,
  opts: { notes?: boolean } = {}
): { buffer: Buffer; pages: number; placeholders: number } {
  const data = applyDefaults(sectionsFor(template).flatMap((s) => s.fields), rawData);
  const isPpat = !!template.ppat;
  const blocks = template.build(data, variant);
  // Akta PPAT: dua lembar asli (bukan salinan) -> keterangan lembar di judul.
  if (isPpat && blocks[0]?.t === "title") {
    blocks[0] = { ...blocks[0], lines: [...blocks[0].lines, variant === "minuta" ? "LEMBAR PERTAMA" : "LEMBAR KEDUA"] };
  }
  const { title, body, closingIndex } = blocksToLines(blocks);
  const sig = isPpat
    ? tandaTanganMinuta(template.signers(data), data, "PPAT")
    : variant === "minuta"
      ? tandaTanganMinuta(template.signers(data), data)
      : tandaTanganSalinan();
  const lines = paginate(title, body, closingIndex, sig.lines, sig.minLines);

  const placeholders = body.reduce((n, l) => n + l.segs.reduce((m, s) => m + (s.text.match(/\[\.\.\.\]/g)?.length ?? 0), 0), 0);
  const pages = 1 + lines.filter((l) => l.pageBreakBefore).length;
  const notes =
    // Halaman catatan penyusunan hanya untuk kantor (tidak untuk draft yang dibaca klien).
    variant === "minuta" && opts.notes !== false
      ? [
          `Draft otomatis Notary OS — ${template.title}. Isi dan rumusan hukum WAJIB diperiksa Notaris sebelum dipakai.`,
          placeholders > 0
            ? `Masih ada ${placeholders} isian kosong yang tertulis [...] di badan akta; lengkapi di form lalu buat ulang.`
            : "Semua isian sudah terisi.",
          "Periksa kembali: identitas penghadap sesuai KTP, nomor & tanggal akta, renvoi, serta jumlah halaman/lembar.",
          ...(template.notes?.(data) ?? [])
        ]
      : undefined;

  // Kedua lembar akta PPAT bergaris hitam (asli); catatan penyusunan hanya di lembar pertama.
  return { buffer: buildDocx(lines, isPpat ? "minuta" : variant, { title: template.title, notes }), pages, placeholders };
}
