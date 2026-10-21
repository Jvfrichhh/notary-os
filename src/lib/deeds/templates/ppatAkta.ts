import type { DeedTemplate, PpatRegisterData } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { DeedData, Person } from "../schema";
import { judul, komparisi, list, NOTARIS, pasal, person, PPAT, str } from "../common";
import { LAND_FIELDS } from "../land";
import { angka, hari, orBlank, rupiah, tanggalHuruf } from "../words";

/**
 * Akta PPAT (Akta Jual Beli & Akta Hibah) dengan susunan blanko akta PPAT
 * (Perkaban No. 8 Tahun 2012) TETAPI dicetak dengan format akta kantor yang
 * sama persis dengan akta notaris (F4, Courier New 12, 30 baris, 50 huruf,
 * garis putus-putus, garis tepi). Lembar Pertama (disimpan PPAT) dan Lembar
 * Kedua (untuk Kantor Pertanahan) keduanya asli: garis hitam, blok tanda
 * tangan lengkap; halaman catatan penyusunan hanya pada Lembar Pertama.
 */

const orang = (v: unknown) => list<{ orang?: Person }>(v).map((x) => person(x.orang));
const money = (v: unknown) => {
  const n = Number(str(v).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const TAX_FIELDS = [
  { kind: "money" as const, key: "njop", label: "NJOP (Rp)" },
  { kind: "date" as const, key: "sspTanggal", label: "Tanggal SSP PPh" },
  { kind: "money" as const, key: "sspJumlah", label: "Jumlah SSP PPh (Rp)" },
  { kind: "date" as const, key: "sspdTanggal", label: "Tanggal SSPD BPHTB" },
  { kind: "money" as const, key: "sspdJumlah", label: "Jumlah SSPD BPHTB (Rp)" },
  { kind: "text" as const, key: "kantorPertanahan", label: "Kantor Pertanahan", default: "Kota Bogor" }
];

/** Kepala akta PPAT (tanpa jam). */
function pembukaPpat(d: DeedData): Block[] {
  const tgl = str(d.tanggalAkta);
  return [
    {
      t: "p",
      text: `Pada hari ini, ${hari(tgl)}, tanggal ${tanggalHuruf(tgl)}, hadir di hadapan saya, **${NOTARIS.namaLengkap}**, yang berdasarkan Keputusan Kepala Badan Pertanahan Nasional tanggal ${orBlank(PPAT.skTanggal)} Nomor ${orBlank(PPAT.skNomor)} diangkat sebagai Pejabat Pembuat Akta Tanah, yang selanjutnya disebut PPAT, yang dimaksud dalam Pasal 5 ayat (3) Peraturan Pemerintah Nomor 37 Tahun 1998, dengan daerah kerja ${PPAT.daerahKerja} dan berkantor di ${orBlank(PPAT.alamatKantor)}, dengan dihadiri oleh saksi-saksi yang saya kenal dan akan disebut pada bagian akhir akta ini:`
    }
  ];
}

/** Para pihak bernomor; sebutan (PIHAK PERTAMA/KEDUA) pada pihak terakhir kelompoknya. */
function pihak(ps: Person[], start: number, peran: string, sebutan: string): Block[] {
  return ps.map((p, i) => ({
    t: "item" as const,
    marker: `${start + i}.`,
    text: `${komparisi(p, "")}; menurut keterangannya dalam hal ini bertindak untuk diri sendiri${
      i === ps.length - 1 ? `; selaku ${peran}, selanjutnya disebut **${sebutan}**.` : ";"
    }`
  }));
}

function objek(d: DeedData, sebut: string): Block[] {
  const luas = Number(str(d.luas));
  const bangunan = str(d.bangunan);
  return [
    {
      t: "item",
      marker: "-",
      text: `${str(d.jenisHak) || "Hak Milik"} Nomor ${orBlank(str(d.nomorSertipikat))} atas sebidang tanah sebagaimana diuraikan dalam Surat Ukur tanggal ${tanggalHuruf(str(d.tanggalSuratUkur))} Nomor ${orBlank(str(d.suratUkur))} seluas ${Number.isFinite(luas) && luas > 0 ? angka(luas) : "[...]"} m² (meter persegi), dengan Nomor Identifikasi Bidang Tanah (NIB) ${orBlank(str(d.nib))}, tercatat atas nama **${orBlank(str(d.atasNama)).toUpperCase()}**, dan Surat Pemberitahuan Pajak Terhutang Pajak Bumi dan Bangunan (SPPT PBB) Nomor Objek Pajak (NOP) ${orBlank(str(d.nop))}, terletak di Provinsi ${orBlank(str(d.letakProvinsi))}, ${orBlank(str(d.letakKota))}, Kecamatan ${orBlank(str(d.letakKecamatan))}, ${orBlank(str(d.letakKelurahan))}, setempat dikenal sebagai ${orBlank(str(d.letakAlamat))}.`
    },
    { t: "p", text: `${sebut} ini meliputi pula: ${bangunan ? `${bangunan} yang berdiri di atas tanah tersebut` : "tidak ada"}.` },
    { t: "p", text: `Selanjutnya semua yang diuraikan di atas dalam akta ini disebut "Obyek ${sebut}".` }
  ];
}

function pasalBaku(d: DeedData, sebut: string): Block[] {
  const s = sebut.toLowerCase();
  const tglPernyataan = str(d.tanggalPernyataan) || str(d.tanggalAkta);
  const p = (n: number, text: string): Block[] => [...pasal(n), { t: "p", text }];
  return [
    ...p(
      1,
      `Mulai hari ini obyek ${s} yang diuraikan dalam akta ini telah menjadi milik Pihak Kedua dan karenanya segala keuntungan yang didapat dari, dan segala kerugian/beban atas obyek ${s} tersebut di atas menjadi hak/beban Pihak Kedua.`
    ),
    ...p(
      2,
      `Pihak Pertama menjamin, bahwa obyek ${s} tersebut di atas tidak tersangkut dalam suatu sengketa, bebas dari sitaan, tidak terikat sebagai jaminan untuk sesuatu utang yang tidak tercatat dalam sertipikat, dan bebas dari beban-beban lainnya yang berupa apapun.`
    ),
    ...p(
      3,
      `Pihak Kedua dengan ini menyatakan bahwa dengan ${s} yang tersebut dalam akta ini kepemilikan tanahnya tidak melebihi ketentuan maksimum penguasaan tanah menurut ketentuan perundang-undangan yang berlaku sebagaimana tercantum dalam pernyataannya tanggal ${tanggalHuruf(tglPernyataan)}.`
    ),
    ...p(
      4,
      `Dalam hal terdapat perbedaan luas tanah yang menjadi obyek ${s} dalam akta ini dengan hasil pengukuran oleh instansi Badan Pertanahan Nasional, maka para pihak akan menerima hasil pengukuran instansi Badan Pertanahan Nasional tersebut${sebut === "Jual Beli" ? " dengan tidak memperhitungkan kembali harga jual beli dan" : " dan"} tidak akan saling mengadakan gugatan.`
    ),
    ...p(
      5,
      `Kedua belah pihak dalam hal ini dengan segala akibatnya memilih tempat kediaman hukum yang umum dan tidak berubah pada Kantor Kepaniteraan Pengadilan Negeri ${str(d.kotaPengadilan) || "Bogor"}.`
    ),
    ...p(6, `Biaya pembuatan akta ini, uang saksi dan segala biaya peralihan hak ini dibayar oleh ${str(d.biaya) || "Pihak Kedua"}.`)
  ];
}

function persetujuan(pasangan: Person, utama: Person | undefined, sebut: string): Block[] {
  if (!str(pasangan.nama)) return [];
  const hubungan = str(pasangan.sapaan) === "Tuan" ? "istrinya" : "suaminya";
  return [
    { t: "p", text: "Akhirnya hadir juga di hadapan saya, dengan dihadiri oleh saksi-saksi yang sama:" },
    { t: "item", marker: "-", text: `${komparisi(pasangan, "")};` },
    {
      t: "p",
      text: `yang menerangkan telah mengetahui dan menyetujui ${sebut.toLowerCase()} yang dilakukan oleh ${hubungan}, ${utama ? `**${(str(utama.nama) || "[...]").toUpperCase()}**` : "[...]"}, dalam akta ini.`
    }
  ];
}

function penutupPpat(d: DeedData, sebut: string): Block[] {
  const s1 = person(d.saksi1);
  const s2 = person(d.saksi2);
  return [
    { t: "closingStart" },
    { t: "center", text: "DEMIKIAN AKTA INI", bold: true },
    { t: "p", text: "Dibuat di hadapan para pihak dan:" },
    { t: "item", marker: "1.", text: komparisi(s1) },
    { t: "item", marker: "2.", text: komparisi(s2) },
    {
      t: "p",
      text: `sebagai saksi-saksi, dan setelah dibacakan serta dijelaskan, maka sebagai bukti kebenaran pernyataan yang dikemukakan oleh Pihak Pertama dan Pihak Kedua tersebut di atas, akta ini ditandatangani/cap ibu jari oleh Pihak Pertama, Pihak Kedua, para saksi dan saya, PPAT, sebanyak dua (2) rangkap asli, yaitu satu (1) rangkap lembar pertama disimpan di kantor saya, dan satu (1) rangkap lembar kedua disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran peralihan hak akibat ${sebut.toLowerCase()} dalam akta ini.`
    }
  ];
}

const rightType = (d: DeedData) => `${str(d.jenisHak) || "Hak Milik"} No. ${orBlank(str(d.nomorSertipikat))}`;
const location = (d: DeedData) =>
  [str(d.letakAlamat), str(d.letakKelurahan), str(d.letakKecamatan) ? `Kec. ${str(d.letakKecamatan)}` : "", str(d.letakKota)].filter(Boolean).join(", ") || null;
const names = (ps: Person[]) => ps.map((p) => [str(p.nama).toUpperCase(), str(p.kota)].filter(Boolean).join(", ")).join("; ") || "[...]";

function register(d: DeedData, from: Person[], to: Person[], value: number | null): PpatRegisterData {
  return {
    partyFrom: names(from),
    partyTo: names(to),
    rightType: rightType(d),
    location: location(d),
    landArea: str(d.luas) || null,
    buildingArea: str(d.luasBangunan) || null,
    transactionValue: value,
    njopValue: money(d.njop),
    nop: str(d.nop) || null,
    sspDate: str(d.sspTanggal) || null,
    sspAmount: money(d.sspJumlah),
    sspdDate: str(d.sspdTanggal) || null,
    sspdAmount: money(d.sspdJumlah)
  };
}

const PIHAK_SECTIONS = (pertama: string, kedua: string, keyA: string, keyB: string) => [
  {
    title: `Pihak Pertama (${pertama})`,
    fields: [
      { kind: "list" as const, key: keyA, label: pertama, itemLabel: pertama, min: 1, max: 4, fields: [{ kind: "person" as const, key: "orang", label: "Identitas" }] },
      { kind: "person" as const, key: "pasangan", label: `Suami/istri ${pertama.toLowerCase()} (persetujuan; kosongkan bila tidak ada)`, optional: true }
    ]
  },
  {
    title: `Pihak Kedua (${kedua})`,
    fields: [{ kind: "list" as const, key: keyB, label: kedua, itemLabel: kedua, min: 1, max: 4, fields: [{ kind: "person" as const, key: "orang", label: "Identitas" }] }]
  }
];

const OBJEK_SECTION = (title: string) => ({
  title,
  fields: [
    ...LAND_FIELDS,
    { kind: "number" as const, key: "luasBangunan", label: "Luas bangunan (m²)" },
    { kind: "date" as const, key: "tanggalPernyataan", label: "Tanggal pernyataan pemilikan tanah Pihak Kedua", help: "Kosong = tanggal akta" }
  ]
});

function ppatNotes(d: DeedData): string[] {
  const n = ["Akta PPAT: Lembar Pertama disimpan PPAT, Lembar Kedua disampaikan ke Kantor Pertanahan paling lambat 7 hari kerja."];
  if (!PPAT.skNomor || !PPAT.alamatKantor) n.push("Data SK pengangkatan PPAT / alamat kantor belum diisi di pengaturan (tertulis [...]).");
  if (!str(d.nop)) n.push("NOP SPPT PBB belum diisi.");
  return n;
}

const signersOf = (a: Person[], b: Person[], pasangan: Person) => [...a, ...(str(pasangan.nama) ? [pasangan] : []), ...b];

export const ajbPpat: DeedTemplate = {
  key: "ajb",
  title: "Akta Jual Beli",
  description: "Akta Jual Beli selaku PPAT (format akta kantor; didaftarkan di Buku Akta PPAT).",
  sections: [
    ...PIHAK_SECTIONS("Penjual", "Pembeli", "penjual", "pembeli"),
    OBJEK_SECTION("Obyek Jual Beli"),
    {
      title: "Harga, Biaya & Pajak",
      fields: [
        { kind: "money", key: "harga", label: "Harga jual beli (Rp)" },
        {
          kind: "select",
          key: "biaya",
          label: "Biaya akta & peralihan hak dibayar oleh",
          options: ["Pihak Kedua", "Pihak Pertama", "Pihak Pertama dan Pihak Kedua dengan bagian yang sama"],
          default: "Pihak Kedua"
        },
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.penjual), orang(d.pembeli), person(d.pasangan)),
  prefill: (ctx) => ({ pembeli: [{ orang: personFromClient(ctx.client) }] }),
  notes: ppatNotes,
  build(d) {
    const penjual = orang(d.penjual);
    const pembeli = orang(d.pembeli);
    const harga = money(d.harga);
    return [
      judul("Akta Jual Beli", d),
      ...pembukaPpat(d),
      ...pihak(penjual, 1, "Penjual", "PIHAK PERTAMA"),
      ...pihak(pembeli, penjual.length + 1, "Pembeli", "PIHAK KEDUA"),
      { t: "p", text: "Para penghadap dikenal oleh saya/diperkenalkan kepada saya oleh saksi-saksi yang turut hadir." },
      { t: "p", text: "Pihak Pertama menerangkan dengan ini menjual kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini membeli dari Pihak Pertama:" },
      ...objek(d, "Jual Beli"),
      { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa:" },
      { t: "item", marker: "a.", text: `Jual beli ini dilakukan dengan harga ${harga ? rupiah(harga) : "Rp[...] ([...] Rupiah)"};` },
      {
        t: "item",
        marker: "b.",
        text: "Pihak Pertama mengaku telah menerima sepenuhnya uang tersebut di atas dari Pihak Kedua dan untuk penerimaan uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kwitansi);"
      },
      { t: "item", marker: "c.", text: "Jual beli ini dilakukan dengan syarat-syarat sebagai berikut:" },
      ...pasalBaku(d, "Jual Beli"),
      ...persetujuan(person(d.pasangan), penjual[0], "Jual Beli"),
      ...penutupPpat(d, "Jual Beli")
    ];
  },
  ppat: { deedType: "Jual Beli", register: (d) => register(d, orang(d.penjual), orang(d.pembeli), money(d.harga)) }
};

export const hibahPpat: DeedTemplate = {
  key: "hibah_ppat",
  title: "Akta Hibah",
  description: "Akta Hibah tanah/bangunan selaku PPAT (format akta kantor; didaftarkan di Buku Akta PPAT).",
  sections: [
    ...PIHAK_SECTIONS("Pemberi Hibah", "Penerima Hibah", "pemberi", "penerima"),
    {
      title: "Hubungan Para Pihak",
      fields: [{ kind: "text", key: "hubungan", label: "Hubungan Pihak Kedua dengan Pihak Pertama", placeholder: "mis. anak kandung", wide: true }]
    },
    OBJEK_SECTION("Obyek Hibah"),
    {
      title: "Nilai, Biaya & Pajak",
      fields: [
        { kind: "money", key: "nilai", label: "Nilai obyek hibah (Rp)", help: "Untuk keperluan pendaftaran & pajak" },
        { kind: "select", key: "biaya", label: "Biaya akta & peralihan hak dibayar oleh", options: ["Pihak Kedua", "Pihak Pertama"], default: "Pihak Kedua" },
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.pemberi), orang(d.penerima), person(d.pasangan)),
  prefill: (ctx) => ({ penerima: [{ orang: personFromClient(ctx.client) }] }),
  notes: ppatNotes,
  build(d) {
    const pemberi = orang(d.pemberi);
    const penerima = orang(d.penerima);
    const nilai = money(d.nilai);
    return [
      judul("Akta Hibah", d),
      ...pembukaPpat(d),
      ...pihak(pemberi, 1, "Pemberi Hibah", "PIHAK PERTAMA"),
      ...pihak(penerima, pemberi.length + 1, "Penerima Hibah", "PIHAK KEDUA"),
      { t: "p", text: "Para penghadap dikenal oleh saya/diperkenalkan kepada saya oleh saksi-saksi yang turut hadir." },
      ...(str(d.hubungan) ? [{ t: "p" as const, text: `Pihak Kedua adalah ${str(d.hubungan)} dari Pihak Pertama.` }] : []),
      { t: "p", text: "Pihak Pertama menerangkan dengan ini menghibahkan kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini menerima hibah dari Pihak Pertama:" },
      ...objek(d, "Hibah"),
      { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa:" },
      { t: "item", marker: "a.", text: "Hibah ini dilakukan dengan cuma-cuma dan tidak dapat ditarik kembali, kecuali dalam hal-hal yang ditentukan undang-undang;" },
      { t: "item", marker: "b.", text: `Untuk keperluan pendaftaran, obyek hibah ini bernilai ${nilai ? rupiah(nilai) : "Rp[...] ([...] Rupiah)"};` },
      { t: "item", marker: "c.", text: "Hibah ini dilakukan dengan syarat-syarat sebagai berikut:" },
      ...pasalBaku(d, "Hibah"),
      ...persetujuan(person(d.pasangan), pemberi[0], "Hibah"),
      ...penutupPpat(d, "Hibah")
    ];
  },
  ppat: { deedType: "Hibah", register: (d) => register(d, orang(d.pemberi), orang(d.penerima), money(d.nilai)) }
};
