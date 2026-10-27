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
function pihakPertama(ps: Person[], pasangan: Person, peran: string): PBlock[] {
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
  out.push({ t: "center", text: "PIHAK PERTAMA", bold: true });
  return out;
}

/** Pihak Kedua: komparisi bernomor (lanjut nomor), kapasitas (+ keterangan pisah harta), sebutan. */
function pihakKedua(ps: Person[], start: number, d: DeedData, peran: string): PBlock[] {
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
  out.push({ t: "center", text: "PIHAK KEDUA", bold: true });
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

function objek(d: DeedData, sebut: string): PBlock[] {
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
  out.push({ t: "p", text: `Selanjutnya semua yang diuraikan di atas dalam akta ini disebut "**Objek ${sebut}**";` });
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

function penutup(d: DeedData, sebut: string, variant: PpatVariant): PBlock[] {
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
      text: `Untuk sementara berada di ${PPAT.daerahKerja}, sebagai saksi-saksi, dan setelah dibacakan serta dijelaskan, maka sebagai bukti kebenaran pernyataan yang dikemukakan oleh Pihak Pertama dan Pihak Kedua tersebut di atas, akta ini ditandatangani oleh para pihak, para saksi dan saya, PPAT, sebanyak 2 (dua) rangkap asli, yaitu 1 (satu) rangkap lembar pertama disimpan di kantor saya, dan 1 (satu) rangkap lembar kedua disampaikan kepada Kepala Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))} untuk keperluan pendaftaran peralihan hak akibat ${sebut.toLowerCase()} dalam akta ini.`
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
