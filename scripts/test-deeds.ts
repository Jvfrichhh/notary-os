/**
 * Uji generator akta tanpa database:
 *  - setiap template bisa dirender (data contoh & data kosong), minuta & salinan;
 *  - setiap baris badan akta tepat 50 huruf (kolom + teks + garis penutup);
 *  - judul 4 baris; halaman penuh 30 baris.
 *
 * Jalankan:  npx tsx scripts/test-deeds.ts [folder-output]
 */
import { mkdirSync, writeFileSync } from "fs";
import { DEED_TEMPLATES, sectionsFor } from "../src/lib/deeds/registry";
import { applyDefaults, renderDeed } from "../src/lib/deeds/render";
import { blocksToLines, LINE_WIDTH } from "../src/lib/deeds/layout";

const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });

const P = (nama: string, sapaan = "Tuan") => ({
  sapaan, nama, tempatLahir: "Bogor", tanggalLahir: "1980-01-01", pekerjaan: "Karyawan Swasta",
  alamat: "Jalan Pajajaran Nomor 10", rt: "001", rw: "002", kelurahan: "Kelurahan Babakan",
  kecamatan: "Bogor Tengah", kota: "Kota Bogor", nik: "3271010101800001"
});
const sample: Record<string, unknown> = {
  nomorAkta: "12", tanggalAkta: "2026-10-21", jamAkta: "10:00", saksi1: P("Rina Marlina", "Nyonya"), saksi2: P("Dedi Kurniawan"),
  pemberi: [{ orang: P("Budi Santoso") }], penerima: [{ orang: P("Andi Wijaya") }], penjual: [{ orang: P("Budi Santoso") }],
  pembeli: [{ orang: P("Andi Wijaya") }], pendiri: [{ orang: P("Budi Santoso"), saham: "150" }, { orang: P("Andi Wijaya"), saham: "100" }],
  direksi: [{ jabatan: "Direktur Utama", orang: P("Budi Santoso") }], komisaris: [{ jabatan: "Komisaris", orang: P("Andi Wijaya") }],
  namaPt: "Sinar Maju", modalDasar: "1000000000", kbli: [{ kode: "46900", judul: "Perdagangan Besar Berbagai Macam Barang" }],
  harga: "1250000000", nomorSertipikat: "123/Babakan", luas: "250"
};

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error("GAGAL:", msg);
};

for (const t of Object.values(DEED_TEMPLATES)) {
  for (const data of [sample, {}]) {
    const filled = applyDefaults(sectionsFor(t).flatMap((s) => s.fields), data);
    for (const variant of ["minuta", "salinan"] as const) {
      const { title, body } = blocksToLines(t.build(filled, variant));
      if (title.length !== 4) fail(`${t.key}: judul ${title.length} baris`);
      body.forEach((l, i) => {
        const len = l.col + l.segs.reduce((n, s) => n + s.text.length, 0);
        if (len !== LINE_WIDTH) fail(`${t.key} ${variant} baris ${i + 1}: ${len} huruf`);
      });
      const r = renderDeed(t, data, variant);
      if (r.buffer.subarray(0, 2).toString() !== "PK") fail(`${t.key}: bukan file zip`);
      if (out && data === sample) writeFileSync(`${out}/${t.key}_${variant}.docx`, r.buffer);
    }
  }
  console.log(`OK  ${t.key}`);
}
if (failures) {
  console.error(`${failures} pemeriksaan gagal`);
  process.exit(1);
}
console.log("Semua template lolos.");
