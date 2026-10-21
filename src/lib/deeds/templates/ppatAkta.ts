import type { DeedTemplate, PpatRegisterData } from "../types";
import { personFromClient } from "../types";
import type { DeedData, Person } from "../schema";
import type { DocBlock } from "../../office/simpleDocx";
import { identitas, list, NOTARIS, person, PPAT, str } from "../common";
import { LAND_FIELDS } from "../land";
import { angka, hari, orBlank, rupiah, tanggalHuruf, tanggalSingkat } from "../words";

/**
 * Akta PPAT (Akta Jual Beli & Akta Hibah) mengikuti susunan blanko akta PPAT
 * (Perkaban No. 8 Tahun 2012): kepala akta, para pihak, objek, harga/nilai,
 * pasal-pasal baku, persetujuan pasangan, penutup, dan kolom tanda tangan.
 * Dicetak sebagai Word biasa (bukan format mesin tik akta notaris).
 * Rumusan WAJIB diperiksa PPAT dan disesuaikan dengan blanko/format kantor.
 */

const orang = (v: unknown) => list<{ orang?: Person }>(v).map((x) => person(x.orang));
const nama = (p: Person) => `${str(p.sapaan) || "Tuan/Nyonya"} **${(str(p.nama) || "[...]").toUpperCase()}**`;
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

function kepala(judul: string, d: DeedData, lembar: 1 | 2): DocBlock[] {
  const tgl = str(d.tanggalAkta);
  return [
    { t: "p", text: `LEMBAR ${lembar === 1 ? "PERTAMA" : "KEDUA"}`, align: "right", size: 9, spaceAfter: 120 },
    { t: "p", text: judul.toUpperCase(), bold: true, align: "center", size: 13, spaceAfter: 0 },
    { t: "p", text: `Nomor : ${orBlank(str(d.nomorAkta))}`, align: "center", spaceAfter: 240 },
    {
      t: "p",
      align: "both",
      text: `Pada hari ini, ${hari(tgl)}, tanggal ${tanggalHuruf(tgl)}, hadir di hadapan saya, **${NOTARIS.namaLengkap}**, yang berdasarkan Keputusan Kepala Badan Pertanahan Nasional tanggal ${orBlank(PPAT.skTanggal)} Nomor ${orBlank(PPAT.skNomor)} diangkat sebagai Pejabat Pembuat Akta Tanah, yang selanjutnya disebut PPAT, yang dimaksud dalam Pasal 5 ayat (3) Peraturan Pemerintah Nomor 37 Tahun 1998, dengan daerah kerja ${PPAT.daerahKerja} dan berkantor di ${orBlank(PPAT.alamatKantor)}, dengan dihadiri oleh saksi-saksi yang saya kenal dan akan disebut pada bagian akhir akta ini:`
    }
  ];
}

function pihak(list: Person[], start: number, peran: string, sebutan: string): DocBlock[] {
  return list.map((p, i) => ({
    t: "p" as const,
    align: "both" as const,
    text: `${toRoman(start + i)}. ${nama(p)}, ${identitas(p)};\n- menurut keterangannya dalam hal ini bertindak untuk diri sendiri${i === list.length - 1 ? `;\n- selaku ${peran}, selanjutnya disebut **${sebutan}**.` : ";"}`
  }));
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const toRoman = (n: number) => ROMAN[n - 1] ?? String(n);

function objek(d: DeedData, sebut: string): DocBlock[] {
  const luas = Number(str(d.luas));
  return [
    {
      t: "p",
      align: "both",
      text: `- ${str(d.jenisHak) || "Hak Milik"} Nomor ${orBlank(str(d.nomorSertipikat))} atas sebidang tanah sebagaimana diuraikan dalam Surat Ukur tanggal ${tanggalSingkat(str(d.tanggalSuratUkur))} Nomor ${orBlank(str(d.suratUkur))} seluas ${Number.isFinite(luas) && luas > 0 ? angka(luas) : "[...]"} m² (meter persegi) dengan Nomor Identifikasi Bidang Tanah (NIB) ${orBlank(str(d.nib))}, tercatat atas nama ${orBlank(str(d.atasNama))}, dan Surat Pemberitahuan Pajak Terhutang Pajak Bumi dan Bangunan (SPPT PBB) Nomor Objek Pajak (NOP) ${orBlank(str(d.nop))}, terletak di:`
    },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3, 7],
      rows: [
        ["Provinsi", orBlank(str(d.letakProvinsi))],
        ["Kabupaten/Kota", orBlank(str(d.letakKota))],
        ["Kecamatan", orBlank(str(d.letakKecamatan))],
        ["Desa/Kelurahan", orBlank(str(d.letakKelurahan))],
        ["Jalan", orBlank(str(d.letakAlamat))]
      ]
    },
    {
      t: "p",
      align: "both",
      text: `${sebut} ini meliputi pula: ${str(d.bangunan) ? `${str(d.bangunan)} yang berdiri di atas tanah tersebut` : "-"}.\nSelanjutnya semua yang diuraikan di atas dalam akta ini disebut "**Obyek ${sebut}**".`
    }
  ];
}

function pasalBaku(d: DeedData, sebut: string, pihakKeduaPeran: string): DocBlock[] {
  const tglAkta = str(d.tanggalAkta);
  const pasal = (n: number, t: string): DocBlock[] => [
    { t: "p", text: `Pasal ${n}`, bold: true, align: "center", spaceAfter: 60 },
    { t: "p", text: t, align: "both" }
  ];
  return [
    ...pasal(
      1,
      `Mulai hari ini obyek ${sebut.toLowerCase()} yang diuraikan dalam akta ini telah menjadi milik Pihak Kedua dan karenanya segala keuntungan yang didapat dari, dan segala kerugian/beban atas obyek ${sebut.toLowerCase()} tersebut di atas menjadi hak/beban Pihak Kedua.`
    ),
    ...pasal(
      2,
      `Pihak Pertama menjamin, bahwa obyek ${sebut.toLowerCase()} tersebut di atas tidak tersangkut dalam suatu sengketa, bebas dari sitaan, tidak terikat sebagai jaminan untuk sesuatu utang yang tidak tercatat dalam sertipikat, dan bebas dari beban-beban lainnya yang berupa apapun.`
    ),
    ...pasal(
      3,
      `Pihak Kedua dengan ini menyatakan bahwa dengan ${sebut.toLowerCase()} yang tersebut dalam akta ini kepemilikan tanahnya tidak melebihi ketentuan maksimum penguasaan tanah menurut ketentuan perundang-undangan yang berlaku sebagaimana tercantum dalam pernyataannya tanggal ${tanggalSingkat(str(d.tanggalPernyataan) || tglAkta)}.`
    ),
    ...pasal(
      4,
      `Dalam hal terdapat perbedaan luas tanah yang menjadi obyek ${sebut.toLowerCase()} dalam akta ini dengan hasil pengukuran oleh instansi Badan Pertanahan Nasional, maka para pihak akan menerima hasil pengukuran instansi Badan Pertanahan Nasional tersebut${sebut === "Jual Beli" ? " dengan tidak memperhitungkan kembali harga jual beli dan" : " dan"} tidak akan saling mengadakan gugatan.`
    ),
    ...pasal(
      5,
      `Kedua belah pihak dalam hal ini dengan segala akibatnya memilih tempat kediaman hukum yang umum dan tidak berubah pada Kantor Kepaniteraan Pengadilan Negeri ${orBlank(str(d.kotaPengadilan))}.`
    ),
    ...pasal(6, `Biaya pembuatan akta ini, uang saksi dan segala biaya peralihan hak ini dibayar oleh ${orBlank(str(d.biaya) || pihakKeduaPeran)}.`)
  ];
}

function persetujuan(p: Person, sebut: string): DocBlock[] {
  if (!str(p.nama)) return [];
  return [
    {
      t: "p",
      align: "both",
      text: `Akhirnya hadir juga di hadapan saya, dengan dihadiri oleh saksi-saksi yang sama:\n- ${nama(p)}, ${identitas(p)};\nyang menerangkan telah mengetahui dan menyetujui ${sebut.toLowerCase()} dalam akta ini.`
    }
  ];
}

function penutup(d: DeedData, sebut: string, pertama: Person[], kedua: Person[], pasangan: Person): DocBlock[] {
  const s1 = person(d.saksi1);
  const s2 = person(d.saksi2);
  const saksiTeks = (p: Person) => `${nama(p)}, ${identitas(p)}`;
  const ttd = (judul: string, ps: Person[]) => `${judul}\n\n\n\n${ps.map((p) => (str(p.nama) || "[...]").toUpperCase()).join("\n\n\n\n")}\n`;
  return [
    {
      t: "p",
      align: "both",
      text: `Demikianlah akta ini dibuat di hadapan para pihak dan:\n1. ${saksiTeks(s1)};\n2. ${saksiTeks(s2)};\nsebagai saksi-saksi, dan setelah dibacakan serta dijelaskan, maka sebagai bukti kebenaran pernyataan yang dikemukakan oleh Pihak Pertama dan Pihak Kedua tersebut di atas, akta ini ditandatangani/cap ibu jari oleh Pihak Pertama, Pihak Kedua, para saksi dan saya, PPAT, sebanyak 2 (dua) rangkap asli, yaitu 1 (satu) rangkap lembar pertama disimpan di kantor saya, dan 1 (satu) rangkap lembar kedua disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran peralihan hak akibat ${sebut.toLowerCase()} dalam akta ini.`
    },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      borderless: true,
      widths: [1, 1],
      rows: [
        [ttd("Pihak Pertama", pertama), ttd("Pihak Kedua", kedua)],
        [str(pasangan.nama) ? ttd("Persetujuan", [pasangan]) : "", ""],
        [ttd("Saksi", [s1]), ttd("Saksi", [s2])]
      ]
    },
    { t: "p", text: "Pejabat Pembuat Akta Tanah", align: "center", spaceAfter: 1000 },
    { t: "p", text: NOTARIS.namaSingkat, bold: true, align: "center" }
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
  fields: [...LAND_FIELDS, { kind: "number" as const, key: "luasBangunan", label: "Luas bangunan (m²)" }, { kind: "date" as const, key: "tanggalPernyataan", label: "Tanggal pernyataan pemilikan tanah Pihak Kedua", help: "Kosong = tanggal akta" }]
});

export const ajbPpat: DeedTemplate = {
  key: "ajb",
  title: "Akta Jual Beli",
  description: "Akta Jual Beli selaku PPAT (format akta PPAT, didaftarkan di Buku Akta PPAT).",
  sections: [
    ...PIHAK_SECTIONS("Penjual", "Pembeli", "penjual", "pembeli"),
    OBJEK_SECTION("Obyek Jual Beli"),
    {
      title: "Harga, Biaya & Pajak",
      fields: [
        { kind: "money", key: "harga", label: "Harga jual beli (Rp)" },
        { kind: "select", key: "biaya", label: "Biaya akta & peralihan hak dibayar oleh", options: ["Pihak Kedua", "Pihak Pertama", "Pihak Pertama dan Pihak Kedua dengan bagian yang sama"], default: "Pihak Kedua" },
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => [...orang(d.penjual), ...orang(d.pembeli)],
  prefill: (ctx) => ({ pembeli: [{ orang: personFromClient(ctx.client) }] }),
  build: () => [],
  ppat: {
    deedType: "Jual Beli",
    build(d, lembar) {
      const penjual = orang(d.penjual);
      const pembeli = orang(d.pembeli);
      const harga = money(d.harga);
      return [
        ...kepala("Akta Jual Beli", d, lembar),
        ...pihak(penjual, 1, "Penjual", "PIHAK PERTAMA"),
        ...pihak(pembeli, penjual.length + 1, "Pembeli", "PIHAK KEDUA"),
        { t: "p", text: "Para penghadap dikenal oleh saya/diperkenalkan kepada saya oleh saksi-saksi yang turut hadir.", align: "both" },
        {
          t: "p",
          align: "both",
          text: "Pihak Pertama menerangkan dengan ini menjual kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini membeli dari Pihak Pertama:"
        },
        ...objek(d, "Jual Beli"),
        {
          t: "p",
          align: "both",
          text: `Pihak Pertama dan Pihak Kedua menerangkan bahwa:\na. Jual beli ini dilakukan dengan harga ${harga ? rupiah(harga) : "Rp[...] ([...] Rupiah)"};\nb. Pihak Pertama mengaku telah menerima sepenuhnya uang tersebut di atas dari Pihak Kedua dan untuk penerimaan uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kwitansi);\nc. Jual beli ini dilakukan dengan syarat-syarat sebagai berikut:`
        },
        ...pasalBaku(d, "Jual Beli", "Pihak Kedua"),
        ...persetujuan(person(d.pasangan), "Jual Beli"),
        ...penutup(d, "Jual Beli", penjual, pembeli, person(d.pasangan))
      ];
    },
    register: (d) => register(d, orang(d.penjual), orang(d.pembeli), money(d.harga))
  }
};

export const hibahPpat: DeedTemplate = {
  key: "hibah_ppat",
  title: "Akta Hibah",
  description: "Akta Hibah tanah/bangunan selaku PPAT (format akta PPAT, didaftarkan di Buku Akta PPAT).",
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
  signers: (d) => [...orang(d.pemberi), ...orang(d.penerima)],
  prefill: (ctx) => ({ penerima: [{ orang: personFromClient(ctx.client) }] }),
  build: () => [],
  ppat: {
    deedType: "Hibah",
    build(d, lembar) {
      const pemberi = orang(d.pemberi);
      const penerima = orang(d.penerima);
      const nilai = money(d.nilai);
      return [
        ...kepala("Akta Hibah", d, lembar),
        ...pihak(pemberi, 1, "Pemberi Hibah", "PIHAK PERTAMA"),
        ...pihak(penerima, pemberi.length + 1, "Penerima Hibah", "PIHAK KEDUA"),
        { t: "p", text: "Para penghadap dikenal oleh saya/diperkenalkan kepada saya oleh saksi-saksi yang turut hadir.", align: "both" },
        ...(str(d.hubungan) ? [{ t: "p" as const, align: "both" as const, text: `Pihak Kedua adalah ${str(d.hubungan)} dari Pihak Pertama.` }] : []),
        {
          t: "p",
          align: "both",
          text: "Pihak Pertama menerangkan dengan ini menghibahkan kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini menerima hibah dari Pihak Pertama:"
        },
        ...objek(d, "Hibah"),
        {
          t: "p",
          align: "both",
          text: `Pihak Pertama dan Pihak Kedua menerangkan bahwa:\na. Hibah ini dilakukan dengan cuma-cuma dan tidak dapat ditarik kembali, kecuali dalam hal-hal yang ditentukan undang-undang;\nb. Untuk keperluan pendaftaran, obyek hibah ini bernilai ${nilai ? rupiah(nilai) : "Rp[...] ([...] Rupiah)"};\nc. Hibah ini dilakukan dengan syarat-syarat sebagai berikut:`
        },
        ...pasalBaku(d, "Hibah", "Pihak Kedua"),
        ...persetujuan(person(d.pasangan), "Hibah"),
        ...penutup(d, "Hibah", pemberi, penerima, person(d.pasangan))
      ];
    },
    register: (d) => register(d, orang(d.pemberi), orang(d.penerima), money(d.nilai))
  }
};
