import type { DeedTemplate, PpatRegisterData } from "../types";
import { personFromClient } from "../types";
import type { DeedData, Person } from "../schema";
import { list, namaLengkap, pasanganDari, person, PPAT, sebutanSingkat, str } from "../common";
import { LAND_FIELDS } from "../land";
import type { PBlock, PpatSignature, PpatVariant } from "../ppatDoc";
import { formatThousands, hari, orBlank, rupiahPpat, tanggalKepalaPpat, tanggalPpat, tanggalSingkat, pukulPpat, terbilang } from "../words";

/**
 * Akta PPAT (Akta Jual Beli & Akta Hibah) memakai TEMPLAT AJB KANTOR: kop
 * PPAT, Bookman Old Style, A4, garis tepi bertangga, footer templat (lihat
 * ppatDoc.ts). Tiga lembar: Lembar Pertama (disimpan PPAT), Lembar Kedua
 * (Kantor Pertanahan) -- keduanya asli bergaris hitam -- dan Lembar Salinan
 * (garis merah, ditutup "Diberikan sebagai salinan yang sama bunyinya").
 */

const orang = (v: unknown) => list<{ orang?: Person }>(v).map((x) => person(x.orang));
const money = (v: unknown) => {
  const n = Number(str(v).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Komparisi gaya templat AJB (NIK & NPWP dengan label, "untuk sementara berada di Kota Bogor"). */
function komparisiPpat(p: Person, akhir = ";", sementara = true): string {
  const kel = str(p.kelurahan);
  const kelurahan = !kel ? "Kelurahan [...]" : /^(kel(urahan)?|desa)\b/i.test(kel) ? kel.replace(/^kel\.?\s+/i, "Kelurahan ") : `Kelurahan ${kel}`;
  const parts = [
    `${str(p.sapaan) || "Tuan/Nyonya"} **${namaLengkap(p)}**`,
    `lahir di ${orBlank(p.tempatLahir)}`,
    `pada tanggal ${tanggalPpat(p.tanggalLahir)}`,
    `Warga Negara ${str(p.kewarganegaraan) || "Indonesia"}`,
    orBlank(p.pekerjaan),
    `bertempat tinggal di ${orBlank(p.kota)}`,
    orBlank(p.alamat),
    `Rukun Tetangga ${orBlank(p.rt)}`,
    `Rukun Warga ${orBlank(p.rw)}`,
    kelurahan,
    `Kecamatan ${orBlank(p.kecamatan)}`,
    `Pemegang Nomor Induk Kependudukan (NIK) : ${orBlank(p.nik)}`,
    ...(str(p.npwp) ? [`Nomor Pokok Wajib Pajak (NPWP) : ${str(p.npwp)}`] : []),
    ...(sementara ? [`untuk sementara berada di ${PPAT.daerahKerja}`] : [])
  ];
  return parts.join(", ") + akhir;
}

const PENGENALAN = ["dikenal oleh saya", "diperkenalkan kepada saya oleh saksi-saksi yang turut hadir"];

function kepala(d: DeedData): PBlock[] {
  const tgl = str(d.tanggalAkta);
  return [
    { t: "p", text: `Pada hari ini, ${hari(tgl)}, ${pukulPpat(str(d.jamAkta))}, ${tanggalKepalaPpat(tgl)},` },
    {
      t: "p",
      text: `Hadir menghadap kepada saya, **ARI YUDANI APRIANTI, Sarjana Hukum, Magister Kenotariatan**, yang berdasarkan Surat Keputusan Kepala Badan Pertanahan Nasional Republik Indonesia, tanggal ${tanggalSingkat(PPAT.skTanggal)} Nomor : ${orBlank(PPAT.skNomor)}, diangkat sebagai Pejabat Pembuat Akta Tanah, yang selanjutnya disebut PPAT, yang dimaksud dalam Pasal 7 Peraturan Pemerintah Nomor : 24 Tahun 1997 tentang Pendaftaran Tanah, dengan daerah kerja ${PPAT.daerahKerja} dan berkantor di ${orBlank(PPAT.alamatKantor)}, dengan dihadiri oleh saksi-saksi yang saya kenal, dan akan disebut pada bagian akhir akta ini :`
    }
  ];
}

const hubungan = (pasangan: Person) => (str(pasangan.sapaan) === "Tuan" ? "suaminya" : "istrinya");

/** Pihak Pertama: komparisi bernomor, kapasitas (+ persetujuan pasangan), lalu sebutan. */
function pihakPertama(ps: Person[], pasangan: Person, peran: string, sebutan = "PIHAK PERTAMA"): PBlock[] {
  const out: PBlock[] = [];
  const utama = str(pasangan.nama) ? pasanganDari(ps, pasangan) : undefined;
  ps.forEach((p, i) => {
    out.push({ t: "item", marker: `${i + 1}.`, text: komparisiPpat(p) });
    if (utama && utama === p) {
      out.push({
        t: "item",
        marker: "-",
        level: 1,
        text: `Menurut keterangannya dalam melakukan tindakan hukum dalam akta ini bertindak untuk diri sendiri dan telah mendapat persetujuan dari ${hubungan(pasangan)}, yang turut hadir di hadapan saya, PPAT, dan turut menandatangani akta ini, yaitu :`
      });
      out.push({ t: "item", marker: "-", level: 1, text: komparisiPpat(pasangan) });
    } else {
      out.push({ t: "item", marker: "-", level: 1, text: "Menurut keterangannya dalam melakukan tindakan hukum dalam akta ini bertindak untuk diri sendiri;" });
    }
  });
  out.push({ t: "p", text: `Selaku ${peran}, selanjutnya disebut :` });
  out.push({ t: "center", text: sebutan, bold: true });
  return out;
}

/** Pihak yang bertindak mewakili badan hukum / berdasarkan kuasa (bank, perseroan). */
function pihakWakil(ps: Person[], start: number, kapasitas: string, peran: string, sebutan = "PIHAK KEDUA"): PBlock[] {
  const out: PBlock[] = [];
  ps.forEach((p, i) => {
    out.push({ t: "item", marker: `${start + i}.`, text: komparisiPpat(p) });
    out.push({ t: "item", marker: "-", level: 1, text: `Menurut keterangannya dalam melakukan tindakan hukum dalam akta ini bertindak ${kapasitas};` });
  });
  out.push({ t: "p", text: `Selaku ${peran}, selanjutnya disebut :` });
  out.push({ t: "center", text: sebutan, bold: true });
  return out;
}

/** Pihak Kedua: komparisi bernomor (lanjut nomor), kapasitas (+ keterangan pisah harta), sebutan. */
function pihakKedua(ps: Person[], start: number, d: DeedData, peran: string, sebutan = "PIHAK KEDUA"): PBlock[] {
  const out: PBlock[] = [];
  const pisah = pisahHarta(d);
  ps.forEach((p, i) => {
    out.push({ t: "item", marker: `${start + i}.`, text: komparisiPpat(p) });
    out.push({
      t: "item",
      marker: "-",
      level: 1,
      text:
        i === 0 && pisah
          ? `Menurut keterangannya dalam melakukan tindakan hukum dalam akta ini bertindak untuk diri sendiri, terikat perkawinan dengan ${pisah.sapaan} **${pisah.nama}** dengan pemisahan harta sebagaimana termuat dalam Akta Perjanjian Kawin Nomor ${pisah.nomor}, tanggal ${tanggalPpat(pisah.tanggal)}, yang dibuat di hadapan **${pisah.notaris}**, Notaris di ${pisah.kota}, sehingga untuk melakukan tindakan hukum dalam akta ini tidak memerlukan persetujuan ${pisah.sapaan === "Tuan" ? "suaminya" : "istrinya"};`
          : "Menurut keterangannya dalam melakukan tindakan hukum dalam akta ini bertindak untuk diri sendiri;"
    });
  });
  out.push({ t: "p", text: `Selaku ${peran}, selanjutnya disebut :` });
  out.push({ t: "center", text: sebutan, bold: true });
  return out;
}

function pisahHarta(d: DeedData) {
  const on = Array.isArray(d.statusPembeli) && (d.statusPembeli as string[]).includes(PISAH_HARTA_OPT);
  if (!on) return null;
  return {
    sapaan: str(d.kawinSapaan) || "Nyonya",
    nama: str(d.kawinNama).toUpperCase() || "[...]",
    nomor: str(d.kawinAktaNomor) || "[...]",
    tanggal: str(d.kawinAktaTanggal),
    notaris: str(d.kawinNotaris) || "[...]",
    kota: str(d.kawinNotarisKota) || "[...]"
  };
}

function objek(d: DeedData, sebut: string, nama = `Objek ${sebut}`): PBlock[] {
  const luas = Number(str(d.luas));
  const luasBangunan = Number(str(d.luasBangunan));
  const bangunan = str(d.bangunan);
  const out: PBlock[] = [
    {
      t: "item",
      marker: "-",
      text: `**Sertipikat ${str(d.jenisHak) || "Hak Milik"} Nomor ${orBlank(str(d.nomorSertipikat))}**, yang diterbitkan tanggal ${tanggalSingkat(str(d.tanggalTerbitSertipikat))}, diuraikan dalam Surat Ukur Nomor ${orBlank(str(d.suratUkur))} tanggal ${tanggalSingkat(str(d.tanggalSuratUkur))}, NIB. ${orBlank(str(d.nib))}, seluas ${Number.isFinite(luas) && luas > 0 ? `${angkaSaja(luas)} m² (${terbilang(luas)} meter persegi)` : "[...] m² ([...] meter persegi)"}, tercatat atas nama **${orBlank(str(d.atasNama)).toUpperCase()}**, dengan Surat Pemberitahuan Pajak Terutang Pajak Bumi dan Bangunan (SPPT PBB) Nomor Objek Pajak (NOP) : ${orBlank(str(d.nop))}, terletak di :`
    },
    { t: "kv", label: "Provinsi", value: `${orBlank(str(d.letakProvinsi))};` },
    { t: "kv", label: kotaLabel(str(d.letakKota)), value: `${kotaNama(str(d.letakKota))};` },
    { t: "kv", label: "Kecamatan", value: `${orBlank(str(d.letakKecamatan))};` },
    { t: "kv", label: kelurahanLabel(str(d.letakKelurahan)), value: `${kelurahanNama(str(d.letakKelurahan))};` },
    { t: "kv", label: "Jalan", value: `${orBlank(str(d.letakAlamat))};` }
  ];
  const kalimat = sebut.charAt(0) + sebut.slice(1).toLowerCase();
  if (bangunan) {
    out.push({ t: "p", text: `${kalimat} ini meliputi pula :` });
    out.push({
      t: "item",
      marker: "-",
      text: `Sebuah ${bangunan.replace(/[\s.;,]+$/, "")}${Number.isFinite(luasBangunan) && luasBangunan > 0 ? ` seluas kurang lebih ${angkaSaja(luasBangunan)} m² (${terbilang(luasBangunan)} meter persegi)` : ""} beserta segala sesuatu yang tumbuh, tertanam dan berdiri di atas tanah tersebut;`
    });
  } else {
    out.push({ t: "p", text: `${kalimat} ini meliputi pula segala sesuatu yang tumbuh, tertanam dan berdiri di atas tanah tersebut;` });
  }
  out.push({ t: "p", text: `Selanjutnya semua yang diuraikan di atas dalam akta ini disebut "**${nama}**";` });
  return out;
}

const angkaSaja = (n: number) => formatThousands(n);
const kotaLabel = (v: string) => (/^kabupaten/i.test(v) ? "Kabupaten" : "Kota");
const kotaNama = (v: string) => (v ? v.replace(/^(kota|kabupaten)\s+/i, "") : "[...]");
const kelurahanLabel = (v: string) => (/^desa/i.test(v) ? "Desa" : "Kelurahan");
const kelurahanNama = (v: string) => (v ? v.replace(/^(kelurahan|kel\.?|desa)\s+/i, "") : "[...]");

function pasalBaku(d: DeedData, sebut: string): PBlock[] {
  const o = `Objek ${sebut}`;
  const s = sebut.toLowerCase();
  const jualBeli = sebut === "Jual Beli";
  const tglPernyataan = str(d.tanggalPernyataan) || str(d.tanggalAkta);
  const biaya = str(d.biaya) || "Pihak Kedua";
  const pisah = pisahHarta(d);
  const pasal = (n: number, text: string): PBlock[] => [{ t: "center", text: `Pasal ${n}`, bold: true }, { t: "p", noDash: true, text }];
  const out: PBlock[] = [
    ...pasal(1, `Mulai hari ini ${o} yang diuraikan dalam akta ini telah menjadi milik Pihak Kedua dan karenanya segala keuntungan yang didapat dari, dan segala kerugian/beban atas ${o} tersebut di atas menjadi hak/beban Pihak Kedua.`),
    ...pasal(2, `Pihak Pertama menjamin, bahwa ${o} tersebut di atas tidak tersangkut dalam suatu sengketa, bebas dari sitaan, tidak terikat sebagai jaminan untuk sesuatu utang yang tidak tercatat dalam sertipikat, dan bebas dari beban-beban lainnya yang berupa apapun.`),
    ...pasal(3, `Pihak Kedua dengan ini menyatakan bahwa dengan ${s} ini kepemilikan tanahnya tidak melebihi ketentuan maksimum penguasaan tanah menurut ketentuan perundang-undangan yang berlaku sebagaimana tercantum dalam pernyataannya tanggal ${tglPernyataan === str(d.tanggalAkta) || !tglPernyataan ? "hari ini" : tanggalSingkat(tglPernyataan)}.`),
    ...pasal(4, `Dalam hal terdapat perbedaan luas tanah yang menjadi ${o} dalam akta ini dengan hasil pengukuran oleh instansi Badan Pertanahan Nasional, maka para pihak akan menerima hasil pengukuran instansi Badan Pertanahan Nasional tersebut dengan${jualBeli ? " tidak memperhitungkan kembali harga jual beli dan" : ""} tidak akan saling mengadakan gugatan.`),
    ...pasal(
      5,
      jualBeli
        ? `Biaya pembuatan akta ini, uang saksi dan segala biaya peralihan hak ini dibayar oleh ${biaya}, dengan ketentuan Pajak Penghasilan (PPh) atas pengalihan hak atas tanah dan bangunan menjadi beban Pihak Pertama dan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) menjadi beban Pihak Kedua.`
        : `Biaya pembuatan akta ini, uang saksi dan segala biaya peralihan hak ini dibayar oleh ${biaya}, dengan ketentuan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) menjadi beban Pihak Kedua.`
    ),
    ...pasal(6, `Kedua belah pihak dalam hal ini dengan segala akibatnya memilih tempat kediaman hukum yang umum dan tidak berubah pada Kantor Panitera Pengadilan Negeri ${str(d.kotaPengadilan) ? `Kota ${str(d.kotaPengadilan).replace(/^kota\s+/i, "")}` : "Kota Bogor"}.`),
    ...pasal(7, `Para pihak dengan ini menyatakan telah saling mengetahui terhadap letak dan batas-batas tanah yang menjadi ${o} dalam akta ini, dan untuk itu para pihak tidak akan saling mengadakan tuntutan.`)
  ];
  if (pisah) {
    out.push(
      ...pasal(
        8,
        `Pihak Kedua menyatakan bahwa berdasarkan Akta Perjanjian Kawin Nomor ${pisah.nomor}, tanggal ${tanggalPpat(pisah.tanggal)}, yang dibuat di hadapan ${pisah.notaris}, Notaris di ${pisah.kota}, antara Pihak Kedua dan ${pisah.sapaan === "Tuan" ? "suaminya" : "istrinya"}, ${pisah.sapaan} ${pisah.nama}, berlaku pemisahan harta, sehingga ${o} dalam akta ini ${jualBeli ? "dibeli dengan harta pribadi Pihak Kedua dan " : ""}menjadi harta pribadi Pihak Kedua sepenuhnya, bukan merupakan harta bersama dalam perkawinan Pihak Kedua, dan Pihak Kedua bertanggung jawab sepenuhnya atas kebenaran pernyataan tersebut.`
      )
    );
  }
  return out;
}

function penutup(d: DeedData, sebut: string, variant: PpatVariant, lembarKedua?: string): PBlock[] {
  const s1 = person(d.saksi1);
  const s2 = person(d.saksi2);
  const out: PBlock[] = [
    {
      t: "p",
      text: "Para pihak menyatakan dengan ini menjamin akan kebenaran, keaslian, dan kelengkapan identitas pihak-pihak yang namanya tersebut dalam akta ini dan seluruh dokumen yang menjadi dasar dibuatnya akta ini tanpa ada yang dikecualikan, serta menjamin bahwa surat tanda bukti hak atas tanahnya adalah satu-satunya yang sah dan tidak pernah dipalsukan yang disampaikan kepada saya, PPAT, sehingga apabila di kemudian hari sejak ditandatangani akta ini timbul sengketa dengan nama dan dalam bentuk apapun yang disebabkan karena akta ini, maka para pihak yang memberikan keterangan dan menyerahkan dokumen-dokumen dengan ini berjanji mengikatkan dirinya untuk bertanggung jawab dan bersedia menanggung risiko yang timbul, dan dengan ini para pihak menyatakan dengan tegas membebaskan saya, PPAT, dan para saksi dari segala tuntutan berupa apapun mengenai hal-hal tersebut, serta membebaskan PPAT dan para saksi dari tanggung jawab dan memikul baik sebagian maupun seluruhnya akibat hukum yang timbul, baik secara hukum perdata maupun hukum pidana, karena sengketa tersebut;"
    },
    { t: "p", text: "Dan selanjutnya para pihak juga menyatakan telah mengerti dan memahami isi dan maksud dibuatnya akta ini." },
    { t: "closingStart" },
    { t: "p", text: "Demikianlah akta ini dibuat di hadapan para pihak dan :" },
    { t: "item", marker: "1.", text: komparisiPpat(s1, ";", false) },
    { t: "item", marker: "2.", text: komparisiPpat(s2, ";", false) },
    {
      t: "p",
      carryStart: true,
      text: `Untuk sementara berada di ${PPAT.daerahKerja}, sebagai saksi-saksi, dan setelah dibacakan serta dijelaskan, maka sebagai bukti kebenaran pernyataan yang dikemukakan oleh Pihak Pertama dan Pihak Kedua tersebut di atas, akta ini ditandatangani oleh para pihak, para saksi dan saya, PPAT, sebanyak 2 (dua) rangkap asli, yaitu 1 (satu) rangkap lembar pertama disimpan di kantor saya, dan 1 (satu) rangkap lembar kedua ${lembarKedua ?? `disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran peralihan hak akibat ${sebut.toLowerCase()} dalam akta ini`}.`
    }
  ];
  if (variant === "lembar-pertama") {
    out.push({ t: "p", text: "Para penghadap membubuhkan cap ibu jari tangan kanan pada lembar tersendiri yang dilekatkan pada lembar pertama akta ini." });
  }
  return out;
}

const sig = (p: Person) => ({ sebutan: sebutanSingkat(p), nama: namaLengkap(p) });

function signature(a: Person[], b: Person[], pasangan: Person, d: DeedData): PpatSignature {
  return {
    pihakPertama: a.map(sig),
    pihakKedua: b.map(sig),
    persetujuan: str(pasangan.nama) ? [sig(pasangan)] : [],
    saksi: [sig(person(d.saksi1)), sig(person(d.saksi2))]
  };
}

function thumbRows(a: Person[], b: Person[], pasangan: Person) {
  return [
    ...a.map((p) => ({ ...sig(p), kedudukan: "Pihak Pertama" })),
    ...(str(pasangan.nama) ? [{ ...sig(pasangan), kedudukan: hubungan(pasangan) === "istrinya" ? "Persetujuan Istri" : "Persetujuan Suami" }] : []),
    ...b.map((p) => ({ ...sig(p), kedudukan: "Pihak Kedua" }))
  ];
}

// ---------------------------------------------------------------------------
// Form & pendaftaran
// ---------------------------------------------------------------------------

const TAX_FIELDS = [
  { kind: "money" as const, key: "njop", label: "NJOP (Rp)" },
  { kind: "date" as const, key: "sspTanggal", label: "Tanggal SSP PPh" },
  { kind: "money" as const, key: "sspJumlah", label: "Jumlah SSP PPh (Rp)" },
  { kind: "date" as const, key: "sspdTanggal", label: "Tanggal SSPD BPHTB" },
  { kind: "money" as const, key: "sspdJumlah", label: "Jumlah SSPD BPHTB (Rp)" },
  { kind: "text" as const, key: "kantorPertanahan", label: "Kantor Pertanahan", default: "Kota Bogor" }
];

const PISAH_HARTA_OPT = "Pihak Kedua terikat perjanjian kawin pisah harta";

const PIHAK_SECTIONS = (pertama: string, kedua: string, keyA: string, keyB: string) => [
  {
    title: `Pihak Pertama (${pertama})`,
    fields: [
      { kind: "list" as const, key: keyA, label: pertama, itemLabel: pertama, min: 1, max: 4, fields: [{ kind: "person" as const, key: "orang", label: "Identitas (sesuai KTP)" }] },
      { kind: "person" as const, key: "pasangan", label: `Suami/istri ${pertama.toLowerCase()} yang turut hadir memberi persetujuan (kosongkan bila tidak ada)`, optional: true },
      { kind: "select" as const, key: "pengenalan", label: "Para penghadap", options: PENGENALAN, default: PENGENALAN[0] }
    ]
  },
  {
    title: `Pihak Kedua (${kedua})`,
    fields: [
      { kind: "list" as const, key: keyB, label: kedua, itemLabel: kedua, min: 1, max: 4, fields: [{ kind: "person" as const, key: "orang", label: "Identitas (sesuai KTP)" }] },
      { kind: "checks" as const, key: "statusPembeli", label: "Status perkawinan Pihak Kedua", options: [PISAH_HARTA_OPT], help: "Bila dicentang, akta memuat keterangan perjanjian kawin dan Pasal 8 (harta pribadi)." },
      { kind: "select" as const, key: "kawinSapaan", label: "Suami/istri Pihak Kedua", options: ["Nyonya", "Tuan"], default: "Nyonya", showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } },
      { kind: "text" as const, key: "kawinNama", label: "Nama suami/istri Pihak Kedua", showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } },
      { kind: "text" as const, key: "kawinAktaNomor", label: "Nomor Akta Perjanjian Kawin", showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } },
      { kind: "date" as const, key: "kawinAktaTanggal", label: "Tanggal Akta Perjanjian Kawin", showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } },
      { kind: "text" as const, key: "kawinNotaris", label: "Notaris pembuat (nama & gelar lengkap)", placeholder: "VENI LIU, Sarjana Hukum, Magister Kenotariatan", wide: true, showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } },
      { kind: "text" as const, key: "kawinNotarisKota", label: "Kedudukan Notaris", placeholder: "Kota Cimahi", showIf: { key: "statusPembeli", anyOf: [PISAH_HARTA_OPT] } }
    ]
  }
];

const OBJEK_SECTION = (title: string) => ({
  title,
  fields: [
    ...LAND_FIELDS,
    { kind: "date" as const, key: "tanggalTerbitSertipikat", label: "Tanggal terbit sertipikat" },
    { kind: "number" as const, key: "luasBangunan", label: "Luas bangunan (m²)" },
    { kind: "date" as const, key: "tanggalPernyataan", label: "Tanggal pernyataan pemilikan tanah Pihak Kedua", help: "Kosong = hari ini (tanggal akta)" }
  ]
});

function ppatNotes(d: DeedData): string[] {
  const n = [
    "Akta PPAT memakai templat AJB kantor (Bookman Old Style, A4, kop PPAT). Lembar Pertama disimpan PPAT, Lembar Kedua disampaikan ke Kantor Pertanahan paling lambat 7 hari kerja; Lembar Salinan (garis merah) untuk para pihak.",
    "Identitas penghadap ditulis sesuai KTP (alamat persis KTP). Periksa NIK, NPWP, tanggal terbit sertipikat, NIB, dan NOP."
  ];
  if (!str(d.nop)) n.push("NOP SPPT PBB belum diisi.");
  if (!str(d.tanggalTerbitSertipikat)) n.push("Tanggal terbit sertipikat belum diisi (tertulis [...]).");
  return n;
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

const signersOf = (a: Person[], b: Person[], pasangan: Person) => [...a, ...(str(pasangan.nama) ? [pasangan] : []), ...b];

export const ajbPpat: DeedTemplate = {
  key: "ajb",
  title: "Akta Jual Beli",
  description: "Akta Jual Beli selaku PPAT (templat AJB kantor; didaftarkan di Buku Akta PPAT).",
  sections: [
    ...PIHAK_SECTIONS("Penjual", "Pembeli", "penjual", "pembeli"),
    OBJEK_SECTION("Objek Jual Beli"),
    {
      title: "Harga, Biaya & Pajak",
      fields: [
        { kind: "money", key: "harga", label: "Harga jual beli (Rp)" },
        {
          kind: "select",
          key: "biaya",
          label: "Biaya akta & peralihan hak dibayar oleh",
          options: ["Pihak Pertama dan Pihak Kedua sesuai kesepakatan kedua belah pihak", "Pihak Kedua", "Pihak Pertama"],
          default: "Pihak Pertama dan Pihak Kedua sesuai kesepakatan kedua belah pihak"
        },
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.penjual), orang(d.pembeli), person(d.pasangan)),
  prefill: (ctx) => ({ pembeli: [{ orang: personFromClient(ctx.client) }] }),
  notes: ppatNotes,
  build: () => [],
  ppat: {
    deedType: "Jual Beli",
    register: (d) => register(d, orang(d.penjual), orang(d.pembeli), money(d.harga)),
    document(d, variant) {
      const penjual = orang(d.penjual);
      const pembeli = orang(d.pembeli);
      const pasangan = person(d.pasangan);
      const harga = money(d.harga);
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(penjual, pasangan, "Penjual"),
        ...pihakKedua(pembeli, penjual.length + 1, d, "Pembeli"),
        { t: "p", text: "Para penghadap telah memperkenalkan diri kepada saya, PPAT, dengan menunjukkan bukti identitas diri sebagaimana yang telah diuraikan di atas;" },
        { t: "p", text: "Pihak Pertama menerangkan dengan ini menjual kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini membeli dari Pihak Pertama :" },
        ...objek(d, "Jual Beli"),
        { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa :" },
        { t: "item", marker: "a.", text: `Jual beli ini dilakukan dengan harga : **${rupiahPpat(harga)}**;` },
        { t: "item", marker: "b.", text: "Pihak Pertama mengaku telah menerima sepenuhnya uang tersebut di atas dari Pihak Kedua dan untuk penerimaan uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kwitansi);" },
        { t: "item", marker: "c.", text: "Jual beli ini dilakukan dengan syarat-syarat sebagai berikut :" },
        ...pasalBaku(d, "Jual Beli"),
        ...penutup(d, "Jual Beli", variant)
      ];
      return { title: "AKTA JUAL BELI", blocks, signature: signature(penjual, pembeli, pasangan, d), thumbRows: thumbRows(penjual, pembeli, pasangan) };
    }
  }
};

export const hibahPpat: DeedTemplate = {
  key: "hibah_ppat",
  title: "Akta Hibah",
  description: "Akta Hibah tanah/bangunan selaku PPAT (templat AJB kantor; didaftarkan di Buku Akta PPAT).",
  sections: [
    ...PIHAK_SECTIONS("Pemberi Hibah", "Penerima Hibah", "pemberi", "penerima"),
    {
      title: "Hubungan Para Pihak",
      fields: [{ kind: "text", key: "hubungan", label: "Hubungan Pihak Kedua dengan Pihak Pertama", placeholder: "mis. anak kandung", wide: true }]
    },
    OBJEK_SECTION("Objek Hibah"),
    {
      title: "Nilai, Biaya & Pajak",
      fields: [
        { kind: "money", key: "nilai", label: "Nilai objek hibah (Rp)", help: "Untuk keperluan pendaftaran & pajak" },
        { kind: "select", key: "biaya", label: "Biaya akta & peralihan hak dibayar oleh", options: ["Pihak Kedua", "Pihak Pertama", "Pihak Pertama dan Pihak Kedua sesuai kesepakatan kedua belah pihak"], default: "Pihak Kedua" },
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.pemberi), orang(d.penerima), person(d.pasangan)),
  prefill: (ctx) => ({ penerima: [{ orang: personFromClient(ctx.client) }] }),
  notes: ppatNotes,
  build: () => [],
  ppat: {
    deedType: "Hibah",
    register: (d) => register(d, orang(d.pemberi), orang(d.penerima), money(d.nilai)),
    document(d, variant) {
      const pemberi = orang(d.pemberi);
      const penerima = orang(d.penerima);
      const pasangan = person(d.pasangan);
      const nilai = money(d.nilai);
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(pemberi, pasangan, "Pemberi Hibah"),
        ...pihakKedua(penerima, pemberi.length + 1, d, "Penerima Hibah"),
        { t: "p", text: "Para penghadap telah memperkenalkan diri kepada saya, PPAT, dengan menunjukkan bukti identitas diri sebagaimana yang telah diuraikan di atas;" },
        ...(str(d.hubungan) ? [{ t: "p" as const, text: `Pihak Kedua adalah ${str(d.hubungan)} dari Pihak Pertama;` }] : []),
        { t: "p", text: "Pihak Pertama menerangkan dengan ini menghibahkan kepada Pihak Kedua dan Pihak Kedua menerangkan dengan ini menerima hibah dari Pihak Pertama :" },
        ...objek(d, "Hibah"),
        { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa :" },
        { t: "item", marker: "a.", text: "Hibah ini dilakukan dengan cuma-cuma dan tidak dapat ditarik kembali, kecuali dalam hal-hal yang ditentukan undang-undang;" },
        { t: "item", marker: "b.", text: `Untuk keperluan pendaftaran, Objek Hibah ini bernilai **${rupiahPpat(nilai)}**;` },
        { t: "item", marker: "c.", text: "Hibah ini dilakukan dengan syarat-syarat sebagai berikut :" },
        ...pasalBaku(d, "Hibah"),
        ...penutup(d, "Hibah", variant)
      ];
      return { title: "AKTA HIBAH", blocks, signature: signature(pemberi, penerima, pasangan, d), thumbRows: thumbRows(pemberi, penerima, pasangan) };
    }
  }
};

// ---------------------------------------------------------------------------
// Akta PPAT lainnya: Pembagian Hak Bersama, Tukar Menukar, Pemasukan ke Dalam
// Perusahaan, APHT, SKMHT, Pemberian HGB/Hak Pakai atas Tanah Hak Milik.
// Disusun mengikuti susunan blangko PPAT & templat kantor (AJB/Hibah); belum
// ada contoh akta kantor untuk jenis-jenis ini -> wajib diperiksa PPAT.
// ---------------------------------------------------------------------------

const KENAL: PBlock = {
  t: "p",
  text: "Para penghadap telah memperkenalkan diri kepada saya, PPAT, dengan menunjukkan bukti identitas diri sebagaimana yang telah diuraikan di atas;"
};
const pasalPpat = (n: number, text: string): PBlock[] => [{ t: "center", text: `Pasal ${n}`, bold: true }, { t: "p", noDash: true, text }];
const bersih = (v: unknown) => str(v).replace(/[\s.;,]+$/, "");
const pengadilan = (d: DeedData) => (str(d.kotaPengadilan) ? `Kota ${str(d.kotaPengadilan).replace(/^kota\s+/i, "")}` : "Kota Bogor");
const BIAYA_FIELD = {
  kind: "select" as const,
  key: "biaya",
  label: "Biaya akta dibayar oleh",
  options: ["Pihak Kedua", "Pihak Pertama", "Pihak Pertama dan Pihak Kedua sesuai kesepakatan kedua belah pihak"],
  default: "Pihak Kedua"
};
const CATATAN_UMUM = "Template ini disusun dari susunan blangko PPAT (belum dari contoh akta kantor); rumusannya wajib diperiksa PPAT sebelum dipakai.";

/** Bagian form untuk pihak yang diwakili (bank/perseroan): wakil + nama badan + dasar bertindak. */
const WAKIL_SECTION = (title: string, keyList: string, itemLabel: string, namaLabel: string) => ({
  title,
  fields: [
    { kind: "list" as const, key: keyList, label: itemLabel, itemLabel, min: 1, max: 2, fields: [{ kind: "person" as const, key: "orang", label: "Identitas (sesuai KTP)" }] },
    { kind: "text" as const, key: "badanNama", label: namaLabel, wide: true, placeholder: "PT BANK CONTOH Tbk." },
    { kind: "text" as const, key: "badanKedudukan", label: "Berkedudukan di", placeholder: "Jakarta Pusat" },
    { kind: "text" as const, key: "wakilJabatan", label: "Jabatan / kedudukan wakil", placeholder: "Pemimpin Cabang Bogor", default: "kuasa" },
    {
      kind: "textarea" as const,
      key: "wakilDasar",
      label: "Dasar bertindak",
      placeholder: "berdasarkan Surat Kuasa tanggal 1 Oktober 2026 Nomor 123/SK/2026; atau: anggaran dasar perseroan dimuat dalam Akta Nomor ... tanggal ..., yang telah memperoleh pengesahan Menteri Hukum ..."
    }
  ]
});

const kapasitasWakil = (d: DeedData) =>
  `dalam kedudukannya selaku ${bersih(d.wakilJabatan) || "kuasa"}, ${bersih(d.wakilDasar) || "berdasarkan [...]"}, dari dan oleh karena itu untuk dan atas nama **${(str(d.badanNama) || "[...]").toUpperCase()}**, berkedudukan di ${orBlank(str(d.badanKedudukan))}`;

const badan = (d: DeedData) => `${(str(d.badanNama) || "[...]").toUpperCase()}, ${str(d.badanKedudukan) || "[...]"}`;

// ------------------------- Pembagian Hak Bersama --------------------------

export const aphbPpat: DeedTemplate = {
  key: "aphb",
  title: "Akta Pembagian Hak Bersama",
  description: "Pembagian hak bersama atas tanah (mis. dari warisan) selaku PPAT; didaftarkan di Buku Akta PPAT.",
  sections: [
    ...PIHAK_SECTIONS("Pemegang Hak Bersama", "Penerima Hak", "pemegang", "penerima"),
    {
      title: "Dasar Hak Bersama",
      description: "Pihak Pertama memuat SEMUA pemegang hak bersama (termasuk yang menerima). Pihak Kedua adalah yang memperoleh hak sepenuhnya.",
      fields: [
        {
          kind: "textarea",
          key: "dasarHakBersama",
          label: "Hak bersama diperoleh berdasarkan",
          placeholder: "pewarisan dari almarhum Tuan ..., sebagaimana ternyata dari Surat Keterangan Waris tanggal ... yang dikuatkan oleh Lurah ... dan Camat ..."
        }
      ]
    },
    OBJEK_SECTION("Objek Pembagian Hak Bersama"),
    { title: "Nilai, Biaya & Pajak", fields: [{ kind: "money", key: "nilai", label: "Nilai objek (Rp)", help: "Untuk keperluan pendaftaran & pajak" }, BIAYA_FIELD, ...TAX_FIELDS] }
  ],
  signers: (d) => signersOf(orang(d.pemegang), orang(d.penerima), person(d.pasangan)),
  prefill: (ctx) => ({ penerima: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [...ppatNotes(d), "Semua pemegang hak bersama harus hadir atau diwakili dengan kuasa yang sah; lampirkan dasar hak bersama (surat keterangan waris, dsb.).", CATATAN_UMUM],
  build: () => [],
  ppat: {
    deedType: "Pembagian Hak Bersama",
    register: (d) => register(d, orang(d.pemegang), orang(d.penerima), money(d.nilai)),
    document(d, variant) {
      const a = orang(d.pemegang);
      const b = orang(d.penerima);
      const pasangan = person(d.pasangan);
      const S = "Pembagian Hak Bersama";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "para pemegang hak bersama"),
        ...pihakKedua(b, a.length + 1, d, "pihak yang memperoleh hak"),
        KENAL,
        { t: "p", text: "Para pihak menerangkan bahwa mereka adalah bersama-sama pemegang hak atas :" },
        ...objek(d, S),
        { t: "p", text: "Para pihak selanjutnya menerangkan bahwa :" },
        { t: "item", marker: "a.", text: `Hak bersama atas Objek ${S} tersebut diperoleh berdasarkan ${bersih(d.dasarHakBersama) || "[...]"};` },
        { t: "item", marker: "b.", text: `Para pihak telah sepakat untuk mengakhiri pemilikan bersama atas Objek ${S} tersebut, dengan pembagian bahwa Objek ${S} tersebut seluruhnya menjadi hak dan milik Pihak Kedua;` },
        { t: "item", marker: "c.", text: `Untuk keperluan pendaftaran, Objek ${S} ini bernilai **${rupiahPpat(money(d.nilai))}**;` },
        { t: "item", marker: "d.", text: "Pembagian hak bersama ini dilakukan dengan syarat-syarat sebagai berikut :" },
        ...pasalBaku(d, S),
        ...penutup(d, S, variant)
      ];
      return { title: "AKTA PEMBAGIAN HAK BERSAMA", blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};

// ------------------------------ Tukar Menukar ------------------------------

const OBJEK2_FIELDS = [
  ...LAND_FIELDS,
  { kind: "date" as const, key: "tanggalTerbitSertipikat", label: "Tanggal terbit sertipikat" },
  { kind: "number" as const, key: "luasBangunan", label: "Luas bangunan (m²)" }
];

export const tukarMenukarPpat: DeedTemplate = {
  key: "tukar_menukar",
  title: "Akta Tukar Menukar",
  description: "Tukar menukar hak atas tanah selaku PPAT; didaftarkan di Buku Akta PPAT.",
  sections: [
    ...PIHAK_SECTIONS("Pemilik Objek I", "Pemilik Objek II", "pihakA", "pihakB"),
    OBJEK_SECTION("Objek I (milik Pihak Pertama)"),
    {
      title: "Objek II (milik Pihak Kedua)",
      fields: [{ kind: "list", key: "objek2", label: "Objek II", itemLabel: "Objek II", min: 1, max: 1, fields: OBJEK2_FIELDS }]
    },
    {
      title: "Nilai, Biaya & Pajak",
      fields: [
        { kind: "money", key: "nilai", label: "Nilai Objek I (Rp)" },
        { kind: "money", key: "nilai2", label: "Nilai Objek II (Rp)" },
        { kind: "money", key: "tambahan", label: "Tambahan uang (bila nilai tidak sama; Rp)" },
        { kind: "select", key: "pembayarTambahan", label: "Tambahan uang dibayar oleh", options: ["Pihak Pertama", "Pihak Kedua"], default: "Pihak Kedua" },
        BIAYA_FIELD,
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.pihakA), orang(d.pihakB), person(d.pasangan)),
  prefill: (ctx) => ({ pihakA: [{ orang: personFromClient(ctx.client) }], objek2: [{}] }),
  notes: (d) => [
    ...ppatNotes(d),
    "Tukar menukar = dua peralihan hak: PPh dan BPHTB dihitung untuk masing-masing pihak atas objek yang diterimanya; isian SSP/SSPD di form ini hanya satu set, lampirkan bukti pajak keduanya.",
    "Di Buku Akta PPAT tercatat Objek I; Objek II dicantumkan pada kolom hak. Bila objek berada di daerah kerja berbeda, perhatikan kewenangan PPAT.",
    CATATAN_UMUM
  ],
  build: () => [],
  ppat: {
    deedType: "Tukar Menukar",
    register: (d) => {
      const o2 = (list<DeedData>(d.objek2)[0] ?? {}) as DeedData;
      const r = register(d, orang(d.pihakA), orang(d.pihakB), money(d.nilai));
      return { ...r, rightType: `${rightType(d)} ditukar dengan ${rightType(o2)}` };
    },
    document(d, variant) {
      const a = orang(d.pihakA);
      const b = orang(d.pihakB);
      const pasangan = person(d.pasangan);
      const o2 = (list<DeedData>(d.objek2)[0] ?? {}) as DeedData;
      const tambahan = money(d.tambahan);
      const pembayar = str(d.pembayarTambahan) || "Pihak Kedua";
      const penerima = pembayar === "Pihak Kedua" ? "Pihak Pertama" : "Pihak Kedua";
      const biaya = str(d.biaya) || "Pihak Kedua";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "pemilik Objek Tukar Menukar I"),
        ...pihakKedua(b, a.length + 1, d, "pemilik Objek Tukar Menukar II"),
        KENAL,
        { t: "p", text: "Pihak Pertama menerangkan dengan ini menukarkan kepada Pihak Kedua, yang menerangkan dengan ini menerima penukaran dari Pihak Pertama :" },
        ...objek(d, "Tukar Menukar", "Objek Tukar Menukar I"),
        { t: "p", text: "dan sebaliknya Pihak Kedua menerangkan dengan ini menukarkan kepada Pihak Pertama, yang menerangkan dengan ini menerima penukaran dari Pihak Kedua :" },
        ...objek(o2, "Tukar Menukar", "Objek Tukar Menukar II"),
        { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa :" },
        { t: "item", marker: "a.", text: `Untuk keperluan pendaftaran, Objek Tukar Menukar I bernilai **${rupiahPpat(money(d.nilai))}** dan Objek Tukar Menukar II bernilai **${rupiahPpat(money(d.nilai2))}**;` },
        {
          t: "item",
          marker: "b.",
          text: tambahan
            ? `Tukar menukar ini dilakukan dengan tambahan uang sebesar **${rupiahPpat(tambahan)}** yang dibayar oleh ${pembayar} kepada ${penerima}, jumlah uang mana telah diterima sepenuhnya oleh ${penerima} dan untuk penerimaan uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kwitansi);`
            : "Tukar menukar ini dilakukan tanpa tambahan uang dari pihak mana pun;"
        },
        { t: "item", marker: "c.", text: "Tukar menukar ini dilakukan dengan syarat-syarat sebagai berikut :" },
        ...pasalPpat(1, "Mulai hari ini Objek Tukar Menukar I telah menjadi milik Pihak Kedua dan Objek Tukar Menukar II telah menjadi milik Pihak Pertama, dan karenanya segala keuntungan yang didapat dari, dan segala kerugian/beban atas masing-masing objek tersebut menjadi hak/beban pihak yang menerimanya."),
        ...pasalPpat(2, "Masing-masing pihak menjamin, bahwa objek yang ditukarkannya tidak tersangkut dalam suatu sengketa, bebas dari sitaan, tidak terikat sebagai jaminan untuk sesuatu utang yang tidak tercatat dalam sertipikat, dan bebas dari beban-beban lainnya yang berupa apapun."),
        ...pasalPpat(3, "Masing-masing pihak dengan ini menyatakan bahwa dengan tukar menukar ini kepemilikan tanahnya tidak melebihi ketentuan maksimum penguasaan tanah menurut ketentuan perundang-undangan yang berlaku sebagaimana tercantum dalam pernyataannya tanggal hari ini."),
        ...pasalPpat(4, "Dalam hal terdapat perbedaan luas tanah yang menjadi objek tukar menukar dalam akta ini dengan hasil pengukuran oleh instansi Badan Pertanahan Nasional, maka para pihak akan menerima hasil pengukuran instansi Badan Pertanahan Nasional tersebut dengan tidak memperhitungkan kembali nilai tukar menukar dan tidak akan saling mengadakan gugatan."),
        ...pasalPpat(5, `Biaya pembuatan akta ini, uang saksi dan segala biaya peralihan hak ini dibayar oleh ${biaya}, dengan ketentuan Pajak Penghasilan (PPh) atas pengalihan hak dan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) atas perolehan hak menjadi beban masing-masing pihak sesuai ketentuan perpajakan.`),
        ...pasalPpat(6, `Kedua belah pihak dalam hal ini dengan segala akibatnya memilih tempat kediaman hukum yang umum dan tidak berubah pada Kantor Panitera Pengadilan Negeri ${pengadilan(d)}.`),
        ...pasalPpat(7, "Para pihak dengan ini menyatakan telah saling mengetahui terhadap letak dan batas-batas tanah yang menjadi objek tukar menukar dalam akta ini, dan untuk itu para pihak tidak akan saling mengadakan tuntutan."),
        ...penutup(d, "Tukar Menukar", variant)
      ];
      return { title: "AKTA TUKAR MENUKAR", blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};

// ------------------- Pemasukan ke Dalam Perusahaan (Inbreng) -------------------

const PEMEGANG_SECTION = (title: string, key: string, itemLabel: string) => ({
  title,
  fields: [
    { kind: "list" as const, key, label: itemLabel, itemLabel, min: 1, max: 4, fields: [{ kind: "person" as const, key: "orang", label: "Identitas (sesuai KTP)" }] },
    { kind: "person" as const, key: "pasangan", label: `Suami/istri ${itemLabel.toLowerCase()} yang turut hadir memberi persetujuan (kosongkan bila tidak ada)`, optional: true }
  ]
});

export const inbrengPpat: DeedTemplate = {
  key: "inbreng",
  title: "Akta Pemasukan ke Dalam Perusahaan",
  description: "Pemasukan (inbreng) hak atas tanah sebagai setoran modal perseroan selaku PPAT; didaftarkan di Buku Akta PPAT.",
  sections: [
    PEMEGANG_SECTION("Pihak Pertama (Yang Memasukkan)", "pemasuk", "Pemegang hak"),
    WAKIL_SECTION("Pihak Kedua (Perseroan Penerima)", "wakil", "Wakil perseroan", "Nama perseroan"),
    OBJEK_SECTION("Objek Pemasukan"),
    {
      title: "Nilai, Saham & Pajak",
      fields: [
        { kind: "money", key: "nilai", label: "Nilai pemasukan (Rp)" },
        { kind: "text", key: "saham", label: "Saham yang diterima Pihak Pertama", placeholder: "500 (lima ratus) saham, masing-masing bernilai nominal Rp1.000.000,00", wide: true },
        { kind: "text", key: "dasarRups", label: "Dasar persetujuan perseroan", placeholder: "Keputusan Rapat Umum Pemegang Saham tanggal ... / Akta Pendirian Nomor ... tanggal ...", wide: true },
        BIAYA_FIELD,
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.pemasuk), orang(d.wakil), person(d.pasangan)),
  prefill: (ctx) => ({ pemasuk: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [
    ...ppatNotes(d),
    "Nilai pemasukan (inbreng) berupa tanah ditetapkan berdasarkan penilaian ahli yang tidak terafiliasi dengan perseroan (UUPT Pasal 34); lampirkan laporan penilaiannya.",
    "Pastikan wakil perseroan berwenang (anggaran dasar & SK terakhir) dan persetujuan RUPS/Dewan Komisaris bila disyaratkan.",
    CATATAN_UMUM
  ],
  build: () => [],
  ppat: {
    deedType: "Pemasukan ke Dalam Perusahaan (Inbreng)",
    register: (d) => ({ ...register(d, orang(d.pemasuk), [], money(d.nilai)), partyTo: badan(d) }),
    document(d, variant) {
      const a = orang(d.pemasuk);
      const b = orang(d.wakil);
      const pasangan = person(d.pasangan);
      const S = "Pemasukan";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "pihak yang memasukkan"),
        ...pihakWakil(b, a.length + 1, kapasitasWakil(d), "perseroan yang menerima pemasukan"),
        KENAL,
        { t: "p", text: "Pihak Pertama menerangkan dengan ini memasukkan ke dalam perseroan Pihak Kedua sebagai penyetoran atas saham, dan Pihak Kedua menerangkan dengan ini menerima pemasukan dari Pihak Pertama :" },
        ...objek(d, S),
        { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa :" },
        { t: "item", marker: "a.", text: `Pemasukan ini dilakukan dengan nilai sebesar **${rupiahPpat(money(d.nilai))}**;` },
        { t: "item", marker: "b.", text: `Sebagai imbalan atas pemasukan tersebut, Pihak Pertama memperoleh ${bersih(d.saham) || "[...] saham"} dalam perseroan Pihak Kedua${str(d.dasarRups) ? `, berdasarkan ${bersih(d.dasarRups)}` : ""};` },
        { t: "item", marker: "c.", text: "Pemasukan ini dilakukan dengan syarat-syarat sebagai berikut :" },
        ...pasalBaku(d, S),
        ...penutup(d, "Pemasukan ke dalam perusahaan", variant)
      ];
      return { title: "AKTA PEMASUKAN KE DALAM PERUSAHAAN", blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};

// ---------------------- Hak Tanggungan: APHT & SKMHT ----------------------

const UTANG_SECTION = {
  title: "Utang yang Dijamin",
  fields: [
    { kind: "select" as const, key: "debitorSiapa", label: "Debitor", options: ["Pihak Pertama sendiri", "Pihak lain"], default: "Pihak Pertama sendiri" },
    { kind: "text" as const, key: "debitorNama", label: "Nama debitor (bila pihak lain)", placeholder: "PT ABC, berkedudukan di Kota Bogor", wide: true },
    { kind: "text" as const, key: "perjanjianUtang", label: "Perjanjian utang-piutang (judul & nomor)", placeholder: "Perjanjian Kredit Nomor 123/PK/2026", wide: true },
    { kind: "date" as const, key: "tanggalPerjanjian", label: "Tanggal perjanjian" },
    { kind: "money" as const, key: "jumlahUtang", label: "Jumlah utang / plafon (Rp)" },
    { kind: "money" as const, key: "nilaiTanggungan", label: "Nilai Hak Tanggungan (Rp)" },
    { kind: "select" as const, key: "peringkat", label: "Peringkat Hak Tanggungan", options: ["I (Pertama)", "II (Kedua)", "III (Ketiga)"], default: "I (Pertama)" },
    { kind: "text" as const, key: "kantorPertanahan", label: "Kantor Pertanahan", default: "Kota Bogor" }
  ]
};

const debitor = (d: DeedData) => (str(d.debitorSiapa) === "Pihak lain" ? `**${bersih(d.debitorNama) || "[...]"}**` : "Pihak Pertama");
const utang = (d: DeedData) =>
  `${bersih(d.perjanjianUtang) || "[...]"} tertanggal ${tanggalPpat(str(d.tanggalPerjanjian))}, dengan jumlah utang sebesar ${rupiahPpat(money(d.jumlahUtang))}`;

const JANJI_HT = [
  "Pihak Pertama tidak akan menyewakan kepada pihak lain Objek Hak Tanggungan tanpa persetujuan tertulis terlebih dahulu dari Pihak Kedua, termasuk menentukan atau mengubah jangka waktu sewa dan/atau menerima uang sewa di muka;",
  "Pihak Pertama tidak akan mengubah atau merombak semua bentuk atau tata susunan Objek Hak Tanggungan, termasuk mengubah sifat dan tujuan kegunaannya, baik seluruhnya maupun sebagian, tanpa persetujuan tertulis terlebih dahulu dari Pihak Kedua;",
  "Dalam hal Debitor sungguh-sungguh cidera janji, Pihak Kedua oleh Pihak Pertama dengan akta ini diberi dan menyatakan menerima kewenangan, dan untuk itu kuasa, untuk mengelola Objek Hak Tanggungan berdasarkan Penetapan Ketua Pengadilan Negeri yang daerah hukumnya meliputi letak Objek Hak Tanggungan yang bersangkutan;",
  "Jika Debitor tidak memenuhi kewajiban untuk melunasi utangnya berdasarkan perjanjian utang-piutang tersebut di atas, oleh Pihak Pertama, Pihak Kedua selaku Pemegang Hak Tanggungan peringkat pertama dengan akta ini diberi dan menyatakan menerima kewenangan, dan untuk itu kuasa, untuk tanpa persetujuan terlebih dahulu dari Pihak Pertama: menjual atau suruh menjual di hadapan umum secara lelang Objek Hak Tanggungan baik seluruhnya maupun sebagian-sebagian; mengatur dan menetapkan waktu, tempat, cara dan syarat-syarat penjualan; menerima uang penjualan, menandatangani dan menyerahkan kwitansi; menyerahkan apa yang dijual itu kepada pembeli yang bersangkutan; mengambil dari uang hasil penjualan itu seluruhnya atau sebagian untuk melunasi utang Debitor tersebut di atas; dan melakukan hal-hal lain yang menurut undang-undang dan peraturan hukum yang berlaku diharuskan atau menurut pendapat Pihak Kedua perlu dilakukan dalam rangka melaksanakan kuasa tersebut;",
  "Pihak Kedua sebagai pemegang Hak Tanggungan pertama atas Objek Hak Tanggungan tidak akan membersihkan Hak Tanggungan tersebut kecuali dengan persetujuan dari Pemegang Hak Tanggungan kedua dan seterusnya, walaupun sudah dieksekusi untuk pelunasan piutang Pemegang Hak Tanggungan pertama;",
  "Tanpa persetujuan tertulis terlebih dahulu dari Pihak Kedua, Pihak Pertama tidak akan melepaskan haknya atas Objek Hak Tanggungan atau mengalihkannya secara apapun untuk kepentingan pihak ketiga;",
  "Dalam hal Objek Hak Tanggungan dilepaskan haknya oleh Pihak Pertama atau dicabut haknya untuk kepentingan umum, sehingga hak Pihak Pertama atas Objek Hak Tanggungan berakhir, Pihak Kedua dengan akta ini oleh Pihak Pertama diberi dan menyatakan menerima kewenangan, dan untuk itu kuasa, untuk menuntut atau menagih dan menerima uang ganti rugi dan/atau segala sesuatu yang karena itu dapat ditagih dari Pemerintah dan/atau pihak ketiga lainnya, untuk itu menandatangani dan menyerahkan tanda penerimaan uang dan melakukan tindakan-tindakan yang perlu dan berguna serta dipandang baik oleh Pihak Kedua, serta selanjutnya mengambil seluruh atau sebagian uang ganti rugi dan lain-lainnya tersebut guna pelunasan piutangnya;",
  "Pihak Pertama akan mengasuransikan Objek Hak Tanggungan terhadap bahaya-bahaya kebakaran dan malapetaka lain yang dianggap perlu oleh Pihak Kedua dengan syarat-syarat, untuk suatu jumlah pertanggungan, dan pada perusahaan asuransi yang dipandang cukup oleh Pihak Kedua, dengan ketentuan surat polis asuransi yang bersangkutan akan disimpan oleh Pihak Kedua dan Pihak Pertama akan membayar premi pada waktu dan sebagaimana mestinya; dalam hal terjadi kerugian, Pihak Kedua dengan akta ini diberi dan menyatakan menerima kewenangan, dan untuk itu kuasa, untuk menerima seluruh atau sebagian uang ganti kerugian asuransi yang bersangkutan sebagai pelunasan utang Debitor;",
  "Pihak Kedua dengan akta ini diberi dan menyatakan menerima kewenangan, dan untuk itu kuasa, untuk, atas biaya Pihak Pertama, melakukan tindakan yang diperlukan untuk menjaga dan mempertahankan serta menyelamatkan Objek Hak Tanggungan, jika hal itu diperlukan untuk pelaksanaan eksekusi atau untuk mencegah menjadi hapusnya atau dibatalkannya hak atas Objek Hak Tanggungan karena tidak dipenuhinya atau dilanggarnya ketentuan undang-undang, serta jika diperlukan mengurus perpanjangan jangka waktu dan pembaruan hak atas tanah yang menjadi Objek Hak Tanggungan;",
  "Jika Pihak Kedua mempergunakan kekuasaannya untuk menjual Objek Hak Tanggungan, Pihak Pertama akan memberikan kesempatan kepada yang berkepentingan untuk melihat Objek Hak Tanggungan yang bersangkutan pada waktu yang ditentukan oleh Pihak Kedua dan segera mengosongkan atau suruh mengosongkan dan menyerahkan Objek Hak Tanggungan tersebut kepada Pihak Kedua atau pihak yang ditunjuk oleh Pihak Kedua agar selanjutnya dapat menggunakan dalam arti kata yang seluas-luasnya;",
  "Sertipikat tanda bukti hak atas tanah yang menjadi Objek Hak Tanggungan akan diserahkan oleh Pihak Pertama kepada Pihak Kedua untuk disimpan dan dipergunakan oleh Pihak Kedua dalam melaksanakan hak-haknya sebagai pemegang Hak Tanggungan, dan untuk itu Pihak Pertama dengan akta ini memberikan kuasa kepada Pihak Kedua untuk menerima sertipikat tersebut dari Kantor Pertanahan setelah Hak Tanggungan ini didaftar."
];

function registerHt(d: DeedData, from: Person[]): PpatRegisterData {
  return { ...register(d, from, [], money(d.nilaiTanggungan)), partyTo: badan(d), sspDate: null, sspAmount: null, sspdDate: null, sspdAmount: null };
}

const OBJEK_HT_SECTION = {
  title: "Objek Hak Tanggungan",
  fields: [...LAND_FIELDS, { kind: "date" as const, key: "tanggalTerbitSertipikat", label: "Tanggal terbit sertipikat" }, { kind: "number" as const, key: "luasBangunan", label: "Luas bangunan (m²)" }]
};

export const aphtPpat: DeedTemplate = {
  key: "apht",
  title: "Akta Pemberian Hak Tanggungan",
  description: "APHT selaku PPAT; didaftarkan di Buku Akta PPAT dan wajib disampaikan ke Kantor Pertanahan 7 hari kerja.",
  sections: [
    PEMEGANG_SECTION("Pihak Pertama (Pemberi Hak Tanggungan)", "pemberi", "Pemberi Hak Tanggungan"),
    WAKIL_SECTION("Pihak Kedua (Pemegang Hak Tanggungan / Kreditor)", "wakil", "Wakil kreditor", "Nama kreditor"),
    UTANG_SECTION,
    OBJEK_HT_SECTION
  ],
  signers: (d) => signersOf(orang(d.pemberi), orang(d.wakil), person(d.pasangan)),
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [
    ...ppatNotes(d),
    "APHT wajib dikirim ke Kantor Pertanahan (HT-el) paling lambat 7 hari kerja setelah ditandatangani (UUHT Pasal 13).",
    "Janji-janji dalam Pasal 2 mengikuti blangko APHT; coret/sesuaikan janji yang tidak disepakati kreditor.",
    "Bila dibuat berdasarkan SKMHT, sebutkan SKMHT-nya pada kedudukan wakil Pihak Pertama dan pastikan masih berlaku.",
    CATATAN_UMUM
  ],
  build: () => [],
  ppat: {
    deedType: "Pemberian Hak Tanggungan (APHT)",
    register: (d) => registerHt(d, orang(d.pemberi)),
    document(d, variant) {
      const a = orang(d.pemberi);
      const b = orang(d.wakil);
      const pasangan = person(d.pasangan);
      const peringkat = str(d.peringkat) || "I (Pertama)";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "Pemberi Hak Tanggungan"),
        ...pihakWakil(b, a.length + 1, kapasitasWakil(d), "Penerima Hak Tanggungan, yang setelah Hak Tanggungan yang bersangkutan didaftar pada Kantor Pertanahan setempat akan bertindak sebagai Pemegang Hak Tanggungan"),
        KENAL,
        { t: "p", text: "Para pihak menerangkan :" },
        { t: "item", marker: "-", text: `bahwa oleh Pihak Kedua dan ${debitor(d)}, selaku Debitor, telah dibuat dan ditandatangani perjanjian utang-piutang, yaitu ${utang(d)};` },
        { t: "item", marker: "-", text: `bahwa untuk menjamin pelunasan utang Debitor sejumlah tersebut di atas, berikut bunga, denda, dan biaya-biaya lain yang timbul berdasarkan perjanjian utang-piutang tersebut dan penambahan, perubahan, perpanjangan serta pembaruannya, sampai sejumlah Nilai Tanggungan sebesar **${rupiahPpat(money(d.nilaiTanggungan))}**, oleh Pihak Pertama diberikan dengan akta ini kepada dan untuk kepentingan Pihak Kedua, yang dengan ini menyatakan menerimanya, Hak Tanggungan Peringkat ${peringkat} yang diatur dalam Undang-Undang Nomor 4 Tahun 1996 tentang Hak Tanggungan atas Tanah Beserta Benda-Benda yang Berkaitan dengan Tanah dan peraturan-peraturan pelaksanaannya atas objek berupa :` },
        ...objek(d, "Hak Tanggungan"),
        { t: "p", text: "Untuk selanjutnya hak atas tanah dan benda-benda lain tersebut di atas disebut sebagai Objek Hak Tanggungan, yang oleh Pihak Pertama dinyatakan sebagai miliknya." },
        { t: "p", text: "Para pihak dalam kedudukannya sebagaimana tersebut di atas menerangkan, bahwa pemberian Hak Tanggungan tersebut disetujui dan diperjanjikan dengan ketentuan-ketentuan sebagai berikut :" },
        ...pasalPpat(1, "Pihak Pertama menjamin bahwa semua Objek Hak Tanggungan tersebut di atas betul milik Pihak Pertama, tidak tersangkut dalam suatu sengketa, bebas dari sitaan dan bebas pula dari beban-beban apapun yang tidak tercatat."),
        { t: "center", text: "Pasal 2", bold: true },
        { t: "p", noDash: true, text: "Hak Tanggungan tersebut di atas diberikan oleh Pihak Pertama dan diterima oleh Pihak Kedua dengan janji-janji yang disepakati oleh kedua belah pihak sebagaimana diuraikan di bawah ini :" },
        ...JANJI_HT.map((text, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + i)}.`, text })),
        ...pasalPpat(3, "Untuk melaksanakan janji-janji dan ketentuan-ketentuan sebagaimana diuraikan dalam Pasal 2, Pihak Pertama dengan akta ini memberi kuasa kepada Pihak Kedua, yang menyatakan menerimanya, untuk menghadap di hadapan pejabat-pejabat pada instansi yang berwenang, memberikan keterangan, menandatangani formulir/surat, menerima segala surat berharga dan lain surat, serta membayar semua biaya dan menerima segala uang, dan melakukan segala tindakan yang perlu dan berguna untuk melaksanakan janji-janji dan ketentuan-ketentuan tersebut; kuasa ini merupakan bagian yang tidak terpisahkan dari akta ini dan tidak dapat ditarik kembali serta tidak berakhir oleh sebab-sebab apapun juga."),
        ...pasalPpat(4, `Para pihak dalam hal-hal mengenai Hak Tanggungan tersebut di atas dengan segala akibatnya memilih domisili pada Kantor Panitera Pengadilan Negeri ${pengadilan(d)}.`),
        ...pasalPpat(5, "Biaya pembuatan akta ini, uang saksi dan segala biaya mengenai pembebanan Hak Tanggungan tersebut di atas dibayar oleh Pihak Pertama/Debitor."),
        ...penutup(
          d,
          "Pemberian Hak Tanggungan",
          variant,
          `disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran Hak Tanggungan yang diberikan dalam akta ini`
        )
      ];
      return { title: "AKTA PEMBERIAN HAK TANGGUNGAN", blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};

export const TANAH_TERDAFTAR = ["Sudah terdaftar (SKMHT berlaku 1 bulan)", "Belum terdaftar (SKMHT berlaku 3 bulan)"];

export const skmhtPpat: DeedTemplate = {
  key: "skmht",
  title: "Surat Kuasa Membebankan Hak Tanggungan",
  description: "SKMHT selaku PPAT; wajib ditindaklanjuti dengan APHT dalam 1 bulan (tanah terdaftar) atau 3 bulan (belum terdaftar).",
  sections: [
    PEMEGANG_SECTION("Pihak Pertama (Pemberi Kuasa)", "pemberi", "Pemberi Kuasa"),
    WAKIL_SECTION("Pihak Kedua (Penerima Kuasa / Kreditor)", "wakil", "Wakil kreditor", "Nama kreditor"),
    { ...UTANG_SECTION, fields: [...UTANG_SECTION.fields, { kind: "select" as const, key: "tanahTerdaftar", label: "Status pendaftaran tanah", options: TANAH_TERDAFTAR, default: TANAH_TERDAFTAR[0], wide: true }] },
    OBJEK_HT_SECTION
  ],
  signers: (d) => signersOf(orang(d.pemberi), orang(d.wakil), person(d.pasangan)),
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [
    ...ppatNotes(d),
    "SKMHT tidak boleh memuat kuasa untuk perbuatan hukum lain selain membebankan Hak Tanggungan, tidak memuat kuasa substitusi, dan harus mencantumkan jelas objek, jumlah utang, serta nama kreditor dan debitor (UUHT Pasal 15).",
    "SKMHT wajib diikuti APHT paling lambat 1 bulan (tanah sudah terdaftar) atau 3 bulan (belum terdaftar), kecuali untuk kredit tertentu yang ditetapkan peraturan.",
    CATATAN_UMUM
  ],
  build: () => [],
  ppat: {
    deedType: "Surat Kuasa Membebankan Hak Tanggungan (SKMHT)",
    register: (d) => ({ ...registerHt(d, orang(d.pemberi)), landRegistered: str(d.tanahTerdaftar) !== TANAH_TERDAFTAR[1] }),
    document(d, variant) {
      const a = orang(d.pemberi);
      const b = orang(d.wakil);
      const pasangan = person(d.pasangan);
      const peringkat = str(d.peringkat) || "I (Pertama)";
      const lama = str(d.tanahTerdaftar) === TANAH_TERDAFTAR[1] ? "3 (tiga) bulan" : "1 (satu) bulan";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "Pemberi Kuasa"),
        ...pihakWakil(b, a.length + 1, kapasitasWakil(d), "Penerima Kuasa"),
        KENAL,
        { t: "p", text: "Pihak Pertama menerangkan dengan ini memberi kuasa kepada Pihak Kedua :" },
        { t: "center", text: "KHUSUS", bold: true },
        { t: "p", noDash: true, text: `untuk membebankan Hak Tanggungan Peringkat ${peringkat} guna menjamin pelunasan utang ${debitor(d)}, selaku Debitor, sejumlah ${rupiahPpat(money(d.jumlahUtang))} atau sejumlah uang yang dapat ditentukan di kemudian hari berdasarkan ${utang(d)}, yang dibuat antara Debitor dan Pihak Kedua selaku Kreditor, sampai sejumlah Nilai Tanggungan sebesar **${rupiahPpat(money(d.nilaiTanggungan))}**, atas objek berupa :` },
        ...objek(d, "Hak Tanggungan"),
        { t: "p", text: "Kuasa untuk membebankan Hak Tanggungan ini meliputi kuasa untuk menghadap di mana perlu, memberikan keterangan-keterangan serta memperlihatkan dan menyerahkan surat-surat yang diminta, membuat/minta dibuatkan serta menandatangani Akta Pemberian Hak Tanggungan serta surat-surat lain yang diperlukan, memilih domisili, memberi pernyataan bahwa objek Hak Tanggungan betul milik Pemberi Kuasa, tidak tersangkut dalam sengketa, bebas dari sitaan dan dari beban-beban apapun, mendaftarkan Hak Tanggungan tersebut, memberikan dan menyetujui syarat-syarat atau aturan-aturan serta janji-janji yang disetujui oleh Pemberi Kuasa dalam Akta Pemberian Hak Tanggungan tersebut, sebagai berikut :" },
        ...JANJI_HT.map((text, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + i)}.`, text })),
        { t: "p", text: "dan untuk pelaksanaan janji-janji tersebut memberikan kuasa yang diperlukan kepada Pemegang Hak Tanggungan di dalam Akta Pemberian Hak Tanggungan." },
        { t: "p", text: `Kuasa yang diberikan dengan akta ini tidak dapat ditarik kembali dan tidak berakhir karena sebab apapun kecuali oleh karena telah dilaksanakan pembuatan Akta Pemberian Hak Tanggungan selambat-lambatnya ${lama} sejak tanggal akta ini, serta pendaftarannya, atau karena tanggal tersebut telah terlampaui tanpa dilaksanakan pembuatan Akta Pemberian Hak Tanggungan.` },
        ...penutup(d, "Kuasa Membebankan Hak Tanggungan", variant, "disampaikan kepada Penerima Kuasa untuk dipergunakan sebagai dasar pembuatan Akta Pemberian Hak Tanggungan yang bersangkutan")
      ];
      return { title: "SURAT KUASA MEMBEBANKAN HAK TANGGUNGAN", blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};

// ------------- Pemberian HGB / Hak Pakai atas Tanah Hak Milik -------------

export const hgbAtasHmPpat: DeedTemplate = {
  key: "hgb_hp_atas_hm",
  title: "Akta Pemberian HGB/Hak Pakai atas Tanah Hak Milik",
  description: "Pemberian Hak Guna Bangunan atau Hak Pakai di atas tanah Hak Milik selaku PPAT; didaftarkan di Buku Akta PPAT.",
  sections: [
    ...PIHAK_SECTIONS("Pemegang Hak Milik", "Penerima Hak", "pemilik", "penerima"),
    OBJEK_SECTION("Tanah Hak Milik"),
    {
      title: "Hak yang Diberikan",
      fields: [
        { kind: "select", key: "hakDiberikan", label: "Hak yang diberikan", options: ["Hak Guna Bangunan", "Hak Pakai"], default: "Hak Guna Bangunan" },
        { kind: "number", key: "jangkaTahun", label: "Jangka waktu (tahun)", help: "Paling lama 30 tahun; dapat diperbarui dengan akta baru." },
        { kind: "money", key: "uangPemasukan", label: "Uang pemasukan / imbalan (Rp)" },
        { kind: "text", key: "penggunaan", label: "Penggunaan tanah", placeholder: "mendirikan dan memiliki bangunan rumah toko", wide: true },
        BIAYA_FIELD,
        ...TAX_FIELDS
      ]
    }
  ],
  signers: (d) => signersOf(orang(d.pemilik), orang(d.penerima), person(d.pasangan)),
  prefill: (ctx) => ({ penerima: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [
    ...ppatNotes(d),
    "HGB/Hak Pakai di atas Hak Milik diberikan paling lama 30 tahun dan wajib didaftarkan; hak lahir sejak didaftar di Kantor Pertanahan (PP 18/2021).",
    "Pemberian hak di atas Hak Milik merupakan perolehan hak baru: periksa kewajiban BPHTB Pihak Kedua.",
    CATATAN_UMUM
  ],
  build: () => [],
  ppat: {
    deedType: "Pemberian HGB/Hak Pakai atas Tanah Hak Milik",
    register: (d) => register(d, orang(d.pemilik), orang(d.penerima), money(d.uangPemasukan)),
    document(d, variant) {
      const a = orang(d.pemilik);
      const b = orang(d.penerima);
      const pasangan = person(d.pasangan);
      const hak = str(d.hakDiberikan) || "Hak Guna Bangunan";
      const S = `Pemberian ${hak}`;
      const tahun = Number(str(d.jangkaTahun));
      const jangka = Number.isFinite(tahun) && tahun > 0 ? `${formatThousands(tahun)} (${terbilang(tahun)}) tahun` : "[...] ([...]) tahun";
      const biaya = str(d.biaya) || "Pihak Kedua";
      const blocks: PBlock[] = [
        ...kepala(d),
        ...pihakPertama(a, pasangan, "pemegang Hak Milik"),
        ...pihakKedua(b, a.length + 1, d, `penerima ${hak}`),
        KENAL,
        { t: "p", text: `Pihak Pertama menerangkan dengan ini memberikan ${hak} kepada Pihak Kedua, dan Pihak Kedua menerangkan dengan ini menerima pemberian ${hak} dari Pihak Pertama, di atas tanah Hak Milik :` },
        ...objek(d, S, "Tanah Hak Milik"),
        { t: "p", text: "Pihak Pertama dan Pihak Kedua menerangkan bahwa :" },
        { t: "item", marker: "a.", text: `${hak} ini diberikan untuk jangka waktu ${jangka} terhitung sejak tanggal pendaftarannya pada Kantor Pertanahan, untuk ${bersih(d.penggunaan) || "[...]"};` },
        { t: "item", marker: "b.", text: `Pemberian ${hak} ini dilakukan dengan uang pemasukan sebesar **${rupiahPpat(money(d.uangPemasukan))}**, yang telah diterima sepenuhnya oleh Pihak Pertama dari Pihak Kedua, dan untuk penerimaan uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kwitansi);` },
        { t: "item", marker: "c.", text: `Pemberian ${hak} ini dilakukan dengan syarat-syarat sebagai berikut :` },
        ...pasalPpat(1, `Pihak Kedua berhak menggunakan Tanah Hak Milik tersebut sesuai peruntukannya selama jangka waktu ${hak} berlangsung, dan wajib memelihara tanah serta bangunan di atasnya dengan baik dan menjaga kelestarian lingkungan.`),
        ...pasalPpat(2, "Pihak Pertama menjamin, bahwa Tanah Hak Milik tersebut tidak tersangkut dalam suatu sengketa, bebas dari sitaan, tidak terikat sebagai jaminan untuk sesuatu utang yang tidak tercatat dalam sertipikat, dan bebas dari beban-beban lainnya yang berupa apapun."),
        ...pasalPpat(3, `${hak} ini tidak dapat dialihkan atau dijadikan jaminan utang dengan dibebani Hak Tanggungan tanpa persetujuan tertulis terlebih dahulu dari Pihak Pertama.`),
        ...pasalPpat(4, `Setelah jangka waktu ${hak} berakhir, ${hak} dapat diperbarui atas kesepakatan para pihak dengan akta yang dibuat di hadapan PPAT dan didaftarkan; apabila tidak diperbarui, Pihak Kedua wajib menyerahkan kembali tanah tersebut kepada Pihak Pertama dalam keadaan kosong, kecuali para pihak menentukan lain mengenai bangunan dan benda-benda di atasnya.`),
        ...pasalPpat(5, `Biaya pembuatan akta ini, uang saksi dan segala biaya pendaftaran hak ini dibayar oleh ${biaya}, dengan ketentuan Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) menjadi beban Pihak Kedua.`),
        ...pasalPpat(6, `Kedua belah pihak dalam hal ini dengan segala akibatnya memilih tempat kediaman hukum yang umum dan tidak berubah pada Kantor Panitera Pengadilan Negeri ${pengadilan(d)}.`),
        ...penutup(
          d,
          S,
          variant,
          `disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran ${hak} yang diberikan dalam akta ini`
        )
      ];
      return { title: `AKTA PEMBERIAN ${hak.toUpperCase()} ATAS TANAH HAK MILIK`, blocks, signature: signature(a, b, pasangan, d), thumbRows: thumbRows(a, b, pasangan) };
    }
  }
};
