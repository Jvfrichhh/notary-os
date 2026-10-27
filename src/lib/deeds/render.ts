import { blocksToLines, paginate } from "./layout";
import { buildDocx, type ExtraSheet, type Variant } from "./docx";
import { NOTARIS, namaLengkap, resolvePenghadap, sebutanSingkat, str, tandaTanganMinuta, tandaTanganSalinan } from "./common";
import { tanggalHuruf } from "./words";
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
  const blocks = resolvePenghadap(template.build(data, variant), template.signers(data).length);
  // Akta PPAT: dua lembar asli (bukan salinan) -> keterangan lembar di judul.
  if (isPpat && blocks[0]?.t === "title") {
    blocks[0] = { ...blocks[0], lines: [...blocks[0].lines, variant === "minuta" ? "LEMBAR PERTAMA" : "LEMBAR KEDUA"] };
  }
  const { title, body, closingIndex } = blocksToLines(blocks);
  const signers = template.signers(data);
  const labels = template.signerLabels?.(data) ?? [];
  const sig = isPpat || variant === "minuta" ? tandaTanganMinuta(signers, labels) : tandaTanganSalinan();
  const lines = paginate(title, body, closingIndex, sig.lines, sig.minLines);

  const placeholders = body.reduce((n, l) => n + l.segs.reduce((m, s) => m + (s.text.match(/\[\.\.\.\]/g)?.length ?? 0), 0), 0);
  const pages = 1 + lines.filter((l) => l.pageBreakBefore).length;
  const notes =
    // Halaman catatan penyusunan hanya untuk kantor (tidak untuk draft yang dibaca klien).
    variant === "minuta" && opts.notes !== false
      ? [
          `Draft otomatis Nexora — ${template.title}. Isi dan rumusan hukum WAJIB diperiksa Notaris sebelum dipakai.`,
          placeholders > 0
            ? `Masih ada ${placeholders} isian kosong yang tertulis [...] di badan akta; lengkapi di form lalu buat ulang.`
            : "Semua isian sudah terisi.",
          "Periksa kembali: identitas penghadap sesuai KTP, nomor & tanggal akta, renvoi, serta jumlah halaman/lembar.",
          "Saksi tetap kantor terisi otomatis (Deny Chandra, S.H.; Komar Hidayat). NIK Komar Hidayat memuat tanggal lahir 27-04-1980, berbeda dengan tanggal lahir 06-06-1980 -- konfirmasi sebelum dipakai.",
          ...(template.notes?.(data) ?? [])
        ]
      : undefined;

  // Lembar tambahan sidik jari penghadap: hanya pada minuta / lembar pertama.
  const extraSheet: ExtraSheet | undefined =
    variant === "minuta" && opts.notes !== false
      ? {
          jenisAkta: template.title,
          objek: template.subject?.(data) ?? "",
          nomorAkta: str(data.nomorAkta) || "[...]",
          tanggalAkta: tanggalHuruf(str(data.tanggalAkta)),
          notaris: NOTARIS.namaSingkat,
          penghadap: signers.map((p, i) => ({
            sebutan: sebutanSingkat(p),
            nama: namaLengkap(p),
            kedudukan: (labels[i] || "Penghadap").replace(/,$/, ""),
            nik: str(p.nik) || "[...]"
          }))
        }
      : undefined;

  // Kedua lembar akta PPAT bergaris hitam (asli); lembar tambahan & catatan hanya di lembar pertama.
  return { buffer: buildDocx(lines, isPpat ? "minuta" : variant, { title: template.title, notes, extraSheet }), pages, placeholders };
}
