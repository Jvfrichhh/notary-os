import { blocksToLines, paginate } from "./layout";
import { buildDocx, type ExtraSheet, type Variant } from "./docx";
import { NOTARIS, namaLengkap, person, resolvePenghadap, sebutanSingkat, str, tandaTanganMinuta, tandaTanganSalinan } from "./common";
import { tanggalHuruf, tanggalSingkat } from "./words";
import { buildPpatDocx, type PpatVariant } from "./ppatDoc";
import { PPAT } from "./common";

export type RenderVariant = Variant | "lembar-salinan";

/** Akta PPAT: minuta -> Lembar Pertama, salinan -> Lembar Kedua, lembar-salinan -> Lembar Salinan. */
function ppatVariant(v: RenderVariant): PpatVariant {
  return v === "minuta" ? "lembar-pertama" : v === "salinan" ? "lembar-kedua" : "lembar-salinan";
}

function renderPpat(template: DeedTemplate, data: DeedData, v: RenderVariant, opts: { notes?: boolean }) {
  const ppat = template.ppat!;
  const variant = ppatVariant(v);
  const doc = ppat.document(data, variant);
  const nomor = str(data.nomorAkta) || "[...]";
  const tahun = (str(data.tanggalAkta).slice(0, 4) || String(new Date().getFullYear()));
  const placeholders = doc.blocks.reduce((n, b) => n + (("text" in b ? b.text : "value" in b ? `${b.label} ${b.value}` : "").match(/\[\.\.\.\]/g)?.length ?? 0), 0);
  const first = variant === "lembar-pertama" && opts.notes !== false;
  const { buffer, pages } = buildPpatDocx({
    variant,
    heading: { title: doc.title, nomor, tahun },
    office: {
      nama: "ARI YUDANI APRIANTI, S.H., M.Kn.",
      skNomor: PPAT.skNomor,
      skTanggalLabel: tanggalSingkat(PPAT.skTanggal).toUpperCase(),
      alamat1: "Tata Hill Townhouse Yasmin Jl. Cimanggu Pabuaran",
      alamat2: "Kel. Cilendek Timur Kec. Bogor Barat Blok D. No. 6",
      alamat3: "Kota Bogor 16112-Jawa Barat",
      telepon: PPAT.telepon.replace(/-/g, "").replace(/\s*\/\s*/g, ", "),
      email: PPAT.email,
      daerahKerja: PPAT.daerahKerja
    },
    blocks: doc.blocks,
    signature: doc.signature,
    thumbSheet: first ? { judulAkta: template.title, nomor: `${nomor} / ${tahun}`, tanggal: tanggalSingkat(str(data.tanggalAkta)), rows: doc.thumbRows } : undefined,
    notes: first
      ? [
          `Draft otomatis Nexora — ${template.title} (PPAT). Isi dan rumusan hukum WAJIB diperiksa sebelum dipakai.`,
          placeholders > 0 ? `Masih ada ${placeholders} isian kosong yang tertulis [...] di badan akta; lengkapi di form lalu buat ulang.` : "Semua isian sudah terisi.",
          ...(template.notes?.(data) ?? [])
        ]
      : undefined
  });
  return { buffer, pages, placeholders };
}
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
  rv: RenderVariant,
  opts: { notes?: boolean } = {}
): { buffer: Buffer; pages: number; placeholders: number } {
  const data = applyDefaults(sectionsFor(template).flatMap((s) => s.fields), rawData);
  // Akta PPAT: templat AJB kantor (Bookman, A4), tiga lembar.
  if (template.ppat) return renderPpat(template, data, rv, opts);

  const variant: Variant = rv === "minuta" ? "minuta" : "salinan";
  const built = template.build(data, variant).map((b) =>
    // Penghadap tanpa identitas sah: diperkenalkan oleh dua saksi pengenal (Pasal 39 UUJN).
    b.t === "p" && /^(Para p|P)enghadap telah dikenal oleh saya, Notaris, dari identitas/.test(b.text) && str(data.pengenalanPenghadap).startsWith("Diperkenalkan")
      ? { ...b, text: `${b.text.startsWith("Para") ? "Para penghadap" : "Penghadap"} diperkenalkan kepada saya, Notaris, oleh dua orang saksi pengenal, yaitu ${str(data.saksiPengenal).replace(/[\s.;]+$/, "") || "[...]"}.` }
      : b
  );
  const blocks = resolvePenghadap(built, template.signers(data).length);
  const { title, body, closingIndex } = blocksToLines(blocks);
  // Penerjemah resmi turut menandatangani akta.
  const penerjemah = person(data.penerjemah);
  const adaPenerjemah = !!str(penerjemah.nama);
  const baseSigners = template.signers(data);
  const signers = adaPenerjemah ? [...baseSigners, penerjemah] : baseSigners;
  const baseLabels = template.signerLabels?.(data) ?? [];
  const labels = adaPenerjemah ? [...baseSigners.map((_, i) => baseLabels[i] || "Penghadap,"), "Penerjemah,"] : baseLabels;
  const sig = variant === "minuta" ? tandaTanganMinuta(signers, labels) : tandaTanganSalinan();
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
          // Lembar sidik jari hanya untuk penghadap (penerjemah tidak ikut).
          penghadap: baseSigners.map((p, i) => ({
            sebutan: sebutanSingkat(p),
            nama: namaLengkap(p),
            kedudukan: (baseLabels[i] || "Penghadap").replace(/,$/, ""),
            nik: str(p.nik) || "[...]"
          }))
        }
      : undefined;

  return { buffer: buildDocx(lines, variant, { title: template.title, notes, extraSheet }), pages, placeholders };
}
