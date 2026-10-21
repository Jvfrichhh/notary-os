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
import { resolvePenghadap } from "../src/lib/deeds/common";
import { blocksToLines, LINE_WIDTH, LINES_PER_PAGE, paginate } from "../src/lib/deeds/layout";

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

/** Data contoh kedua: cabang-cabang lain (pasangan, bertahap, sirkuler, rincian, dsb.). */
const sample2: Record<string, unknown> = {
  ...sample,
  pemberi: [{ orang: P("Budi Santoso") }, { orang: P("Citra Lestari", "Nyonya") }],
  pasangan: P("Siti Aminah", "Nyonya"), pasanganPenjual: P("Siti Aminah", "Nyonya"), pasangan1: P("Siti Aminah", "Nyonya"),
  penjual: [{ orang: P("Budi Santoso") }, { orang: P("Eko Prasetyo") }],
  pembeli: [{ orang: P("Andi Wijaya") }, { orang: P("Fajar Nugroho") }],
  caraBayar: "Bertahap", uangMuka: "250000000", tanggalPelunasan: "2026-12-31", batasAjb: "2027-01-31", potonganBatal: "10",
  jumlah: "100", nominal: "1000000", rincian: [{ dari: "Budi Santoso", kepada: "Andi Wijaya", jumlah: "60" }, { dari: "Eko Prasetyo", kepada: "Fajar Nugroho", jumlah: "40" }],
  jenisRapat: "Keputusan Sirkuler Para Pemegang Saham", tanggalRapat: "2026-10-15", sahamHadir: "250", sahamTotal: "250",
  ptChanges: ["Perubahan Direksi", "Peralihan saham", "Perubahan nama perseroan", "Perubahan alamat / tempat kedudukan", "Perubahan modal", "Perubahan KBLI / maksud dan tujuan"],
  pengurusBaru: [{ jabatan: "Direktur Utama", orang: P("Gilang Ramadhan") }],
  peralihan: [{ dari: "Budi Santoso", kepada: "Gilang Ramadhan", jumlah: "50" }],
  pemegangSaham: [{ nama: "Budi Santoso", jumlah: "100" }, { nama: "Andi Wijaya", jumlah: "100" }, { nama: "Gilang Ramadhan", jumlah: "50" }],
  namaBaru: "Sinar Maju Bersama", kedudukanBaru: "Kabupaten Bogor", perubahanModal: "Modal dasar Perseroan berjumlah Rp2.000.000.000,00 (dua miliar Rupiah).",
  bidangBaru: "Perdagangan dan Jasa", kbliBaru: [{ kode: "46900", judul: "Perdagangan Besar Berbagai Macam Barang" }],
  hartaBersama: "Rumah di Jalan Pajajaran Nomor 10 menjadi milik Pihak Istri.\nMobil Toyota Avanza menjadi milik Pihak Suami.",
  hartaSuami: "Tanah di Cibinong.", suami: P("Budi Santoso"), istri: P("Siti Aminah", "Nyonya"), calonSuami: P("Budi Santoso"), calonIstri: P("Siti Aminah", "Nyonya"),
  pewaris: P("Hasan Basri"), ahliWaris: [{ orang: P("Siti Aminah", "Nyonya"), hubungan: "istri", bagian: "1/4" }, { orang: P("Budi Santoso"), hubungan: "anak kandung", bagian: "3/4 (tiga per empat)" }],
  pewasiat: P("Hasan Basri"), isi: [{ penerima: "Nyonya Rina Santoso, anak kandung pewasiat", isi: "sebidang tanah Hak Milik Nomor 123/Babakan berikut bangunan di atasnya." }],
  objek: [{ uraian: "1 (satu) unit mobil Toyota Avanza", bukti: "BPKB Nomor P-01234567", nilai: "150000000" }], nilaiUtang: "100000000", nilaiPenjaminan: "125000000",
  namaKreditur: "PT Bank ABC Tbk., berkedudukan di Jakarta",
  lamaTahun: "3", mulai: "2026-11-01", berakhir: "2029-10-31", objekSewa: "ruko", peruntukan: "tempat usaha",
  bagianInvestor: "60", bagian1: "60", bagian2: "40",
  saksi1: P("Rina Marlina", "Nyonya"), saksi2: { ...P("Dedi Kurniawan"), pekerjaan: "Karyawan Kantor Notaris" }
};

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error("GAGAL:", msg);
};

for (const t of Object.values(DEED_TEMPLATES)) {
  for (const base of [sample, sample2, {}]) {
    const data = base === sample2 && t.key === "sewa" ? { ...base, caraBayar: "dibayar setiap tahun di muka", harga: "300000000", objek: "sebidang tanah Hak Milik Nomor 123/Babakan berikut bangunan ruko dua lantai." } : base;
    const filled = applyDefaults(sectionsFor(t).flatMap((s) => s.fields), data);
    for (const variant of ["minuta", "salinan"] as const) {
      const { title, body } = blocksToLines(resolvePenghadap(t.build(filled, variant), t.signers(filled).length));
      if (title.length < 4) fail(`${t.key}: judul ${title.length} baris`);
      body.forEach((l, i) => {
        const len = l.col + l.segs.reduce((n, s) => n + s.text.length, 0);
        if (len !== LINE_WIDTH) fail(`${t.key} ${variant} baris ${i + 1}: ${len} huruf`);
      });
      // Teks yang tidak boleh muncul di akta.
      const text = body.map((l) => l.segs.map((sg) => sg.text).join("")).join("\n");
      for (const bad of ["undefined", "null", "NaN", "**", "[object", "{PENGHADAP}", "{Penghadap}"]) {
        if (text.includes(bad)) fail(`${t.key} ${variant}: memuat "${bad}"`);
      }
      // Titik ganda (bukan bagian dari "[...]").
      const dbl = text.replace(/\[\.\.\.\]/g, "").match(/[^.\n]\.\.(?!\.)/);
      if (dbl) fail(`${t.key} ${variant}: titik ganda "${dbl[0]}"`);
      body.forEach((l, i) => {
        // Kolom nomor butir ("1. ", "a. ", "-  ") memang berspasi; abaikan.
        const raw = l.segs.map((sg) => sg.text).join("").replace(/-+$/, "").replace(/^\s*[-a-z0-9.()]{1,4} +/i, "");
        if (/\S {2,}\S/.test(raw)) fail(`${t.key} ${variant} baris ${i + 1}: spasi ganda "${raw}"`);
        if (/ [,.;:)]/.test(raw)) fail(`${t.key} ${variant} baris ${i + 1}: spasi sebelum tanda baca "${raw}"`);
      });
      // Pagination: setiap halaman (kecuali terakhir) tepat 30 baris badan + tanda tangan.
      const sigProbe = paginate(title, body, -1, [], 0);
      const breaks = sigProbe.map((l, i) => (l.pageBreakBefore ? i : -1)).filter((i) => i >= 0);
      let prev = 0;
      for (const b of breaks) {
        if (b - prev !== LINES_PER_PAGE) fail(`${t.key} ${variant}: halaman berisi ${b - prev} baris`);
        prev = b;
      }
      const r = renderDeed(t, data, variant);
      if (r.buffer.subarray(0, 2).toString() !== "PK") fail(`${t.key}: bukan file zip`);
      if (out && base === sample) writeFileSync(`${out}/${t.key}_${variant}.docx`, r.buffer);
      if (out && base === sample2) writeFileSync(`${out}/${t.key}_2_${variant}.docx`, r.buffer);
    }
  }
  console.log(`OK  ${t.key}`);
}
if (failures) {
  console.error(`${failures} pemeriksaan gagal`);
  process.exit(1);
}
console.log("Semua template lolos.");
