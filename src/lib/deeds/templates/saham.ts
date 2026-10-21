import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, denganPasangan, dikenal, domisili, judul, komparisi, list, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import type { FieldDef, SectionDef } from "../schema";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, formatThousands, rupiah, tanggalHuruf, terbilang } from "../words";
import { PT_CHANGE_OPTIONS } from "../../serviceCatalog";

type Pengurus = { jabatan?: string; orang?: Person };
type Alih = { dari?: string; kepada?: string; jumlah?: string };
type Kbli = { kode?: string; judul?: string };
type Pemegang = { nama?: string; jumlah?: string };

const num = (v: unknown) => Number(str(v).replace(/[^\d]/g, "")) || 0;
const lembar = (n: number) => (n ? `${terbilang(n)} (${formatThousands(n)}) saham` : "[...] saham");

/** Data perseroan (dipakai Peralihan Saham & Perubahan PT). */
const PT_FIELDS: FieldDef[] = [
  { kind: "text", key: "namaPt", label: "Nama perseroan (tanpa 'PT')" },
  { kind: "text", key: "kedudukan", label: "Tempat kedudukan", default: "Kota Bogor" },
  { kind: "textarea", key: "aktaPendirian", label: "Akta pendirian & pengesahannya", wide: true, placeholder: "Akta Pendirian Nomor 5 tanggal 3 Maret 2020 dibuat di hadapan ..., Notaris di ..., yang telah mendapat pengesahan Menteri Hukum dan Hak Asasi Manusia Nomor AHU-0012345.AH.01.01.Tahun 2020 tanggal 4 Maret 2020" },
  { kind: "textarea", key: "aktaPerubahan", label: "Perubahan anggaran dasar terakhir (bila ada)", wide: true },
  { kind: "money", key: "nominal", label: "Nilai nominal per saham (Rp)" }
];

function premisPt(d: Record<string, unknown>): string {
  const ubah = str(d.aktaPerubahan);
  return `**PT ${(str(d.namaPt) || "[...]").toUpperCase()}**, berkedudukan di ${str(d.kedudukan) || "[...]"}, yang anggaran dasarnya dimuat dalam ${str(d.aktaPendirian) || "[...]"}${ubah ? `, dan telah diubah dengan ${ubah}` : ""}; untuk selanjutnya disebut **PERSEROAN**`;
}

export const peralihanSaham: DeedTemplate = {
  key: "peralihan_saham",
  title: "Akta Jual Beli Saham",
  description: "Pengalihan saham PT dari penjual kepada pembeli.",
  sections: [
    { title: "Data Perseroan", fields: PT_FIELDS },
    {
      title: "Penjual Saham",
      fields: [partyList("penjual", "Penjual", "Penjual", 1, 3), { kind: "person", key: "pasangan", label: "Suami/istri penjual (persetujuan; kosongkan bila tidak ada)", optional: true }]
    },
    { title: "Pembeli Saham", fields: [partyList("pembeli", "Pembeli", "Pembeli", 1, 3)] },
    {
      title: "Saham & Harga",
      fields: [
        { kind: "number", key: "jumlah", label: "Jumlah saham yang dijual (seluruhnya)" },
        {
          kind: "list",
          key: "rincian",
          label: "Rincian per penjual/pembeli (isi bila penjual atau pembeli lebih dari satu)",
          itemLabel: "Rincian",
          min: 0,
          max: 9,
          fields: [
            { kind: "text", key: "dari", label: "Dari (nama penjual)" },
            { kind: "text", key: "kepada", label: "Kepada (nama pembeli)" },
            { kind: "number", key: "jumlah", label: "Jumlah saham" }
          ]
        },
        { kind: "money", key: "harga", label: "Harga seluruhnya (Rp)" },
        { kind: "textarea", key: "persetujuan", label: "Dasar persetujuan pemegang saham", wide: true, placeholder: "Keputusan Sirkuler Pemegang Saham tanggal 15 Oktober 2026" }
      ]
    }
  ],
  signers: (d) => {
    const s = parties(d.penjual).map((x) => x.p);
    if (str(person(d.pasangan).nama)) s.push(person(d.pasangan));
    return [...s, ...parties(d.pembeli).map((x) => x.p)];
  },
  prefill: (ctx) => ({ pembeli: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Pastikan prosedur penawaran kepada pemegang saham lain dan persetujuan organ sesuai anggaran dasar telah dipenuhi.",
    "Direksi wajib memberitahukan perubahan pemegang saham kepada Menteri melalui SABH (Pasal 56 UUPT)."
  ],
  build(d, variant) {
    const penjual = parties(d.penjual);
    const pembeli = parties(d.pembeli);
    const pasangan = person(d.pasangan);
    const ada = !!str(pasangan.nama);
    const rincian = list<Alih>(d.rincian).filter((r) => str(r.dari) || str(r.kepada) || num(r.jumlah));
    const jumlah = rincian.length ? rincian.reduce((t, r) => t + num(r.jumlah), 0) : num(d.jumlah);
    const nominal = num(d.nominal);
    const pen = [
      ...denganPasangan(penjual.map((x) => x.p), pasangan, "").map((x, i) => (i < penjual.length ? { ...x, peran: peranDari(penjual[i]) } : x)),
      ...pembeli.map((x) => ({ p: x.p, peran: peranDari(x) }))
    ];
    const n1 = penjual.length + (ada ? 1 : 0);
    const blocks: Block[] = [
      judul("JUAL BELI SAHAM", d),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, penjual.length)}${ada ? `, dengan persetujuan penghadap ${nomorPenghadap(penjual.length + 1, 1)},` : ""} untuk selanjutnya disebut **PENJUAL**; dan penghadap ${nomorPenghadap(n1 + 1, pembeli.length)} untuk selanjutnya disebut **PEMBELI**.`
      },
      dikenal(pen.length),
      { t: "p", text: "Para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      { t: "item", marker: "a.", text: `bahwa Penjual adalah pemilik sah atas ${lembar(jumlah)} dalam ${premisPt(d)};` },
      { t: "item", marker: "b.", text: `bahwa penjualan saham tersebut telah ditawarkan terlebih dahulu kepada pemegang saham lain sesuai ketentuan anggaran dasar Perseroan, dan telah memperoleh persetujuan pemegang saham Perseroan sebagaimana ternyata dari ${str(d.persetujuan).replace(/[\s.;,]+$/, "") || "[...]"};` },
      { t: "p", text: "Selanjutnya para penghadap menerangkan telah sepakat mengadakan jual beli saham dengan syarat-syarat sebagai berikut:" },
      ...pasal(1, "Jual Beli"),
      ...(rincian.length
        ? ([
            { t: "p", text: `Penjual menjual dan menyerahkan kepada Pembeli, dan Pembeli membeli dan menerima penyerahan dari Penjual, ${lembar(jumlah)} dalam Perseroan dengan nilai nominal seluruhnya sebesar ${rupiah(jumlah * nominal)}, dengan rincian sebagai berikut:` },
            ...rincian.map((r, i) => ({
              t: "item" as const,
              marker: `${i + 1}.`,
              text: `dari **${(str(r.dari) || "[...]").toUpperCase()}** kepada **${(str(r.kepada) || "[...]").toUpperCase()}** sebanyak ${lembar(num(r.jumlah))} dengan nilai nominal seluruhnya sebesar ${rupiah(num(r.jumlah) * nominal)}${i === rincian.length - 1 ? "." : ";"}`
            })),
            { t: "p", text: "Saham-saham tersebut untuk selanjutnya disebut **SAHAM**." }
          ] as Block[])
        : ([
            { t: "p", text: `Penjual menjual dan menyerahkan kepada Pembeli, dan Pembeli membeli dan menerima penyerahan dari Penjual, ${lembar(jumlah)} dalam Perseroan dengan nilai nominal seluruhnya sebesar ${rupiah(jumlah * nominal)}, untuk selanjutnya disebut **SAHAM**.` }
          ] as Block[])),
      ...pasal(2, "Harga"),
      { t: "p", text: `Jual beli Saham dilakukan dengan harga sebesar ${rupiah(str(d.harga))}, yang telah dibayar lunas oleh Pembeli kepada Penjual sebelum penandatanganan akta ini, dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi).` },
      ...pasal(3, "Jaminan Penjual"),
      { t: "p", text: "Penjual menjamin bahwa Saham benar miliknya, telah disetor penuh, tidak digadaikan atau dibebani dengan cara apa pun, tidak dalam sengketa, dan Pembeli tidak akan mendapat tuntutan dari pihak mana pun mengenai Saham." },
      ...pasal(4, "Peralihan Hak"),
      ...ayat([
        "Sejak tanggal akta ini, segala hak dan kewajiban yang melekat pada Saham, termasuk hak atas dividen yang belum dibagikan, beralih kepada Pembeli.",
        "Para pihak memberi kuasa kepada Direksi Perseroan untuk mencatat peralihan Saham dalam Daftar Pemegang Saham dan memberitahukannya kepada Menteri Hukum Republik Indonesia."
      ]),
      ...pasal(5, "Pajak dan Biaya"),
      { t: "p", text: "Pajak penghasilan atas penjualan Saham menjadi tanggungan Penjual; biaya akta ini dan biaya lainnya ditanggung oleh Pembeli, kecuali disepakati lain." },
      ...pasal(6, "Domisili"),
      domisili(d),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};


const PERUBAHAN_SECTIONS: SectionDef[] = [
  { title: "Data Perseroan", fields: PT_FIELDS },
  {
    title: "Penghadap (penerima kuasa RUPS)",
    fields: [
      { kind: "person", key: "penghadap", label: "Identitas penghadap" },
      { kind: "text", key: "dasarKuasa", label: "Dasar kuasa", wide: true, default: "selaku kuasa berdasarkan keputusan rapat tersebut di bawah ini" }
    ]
  },
  {
    title: "Rapat / Keputusan Pemegang Saham",
    fields: [
      { kind: "select", key: "jenisRapat", label: "Bentuk keputusan", options: ["Rapat Umum Pemegang Saham Luar Biasa", "Keputusan Sirkuler Para Pemegang Saham"], default: "Rapat Umum Pemegang Saham Luar Biasa" },
      { kind: "date", key: "tanggalRapat", label: "Tanggal rapat/keputusan" },
      { kind: "text", key: "tempatRapat", label: "Tempat rapat", wide: true },
      { kind: "text", key: "pimpinanRapat", label: "Rapat dipimpin oleh (nama & jabatan)", wide: true, placeholder: "Tuan BUDI SANTOSO, selaku Direktur Utama Perseroan" },
      { kind: "number", key: "sahamHadir", label: "Saham hadir/menyetujui" },
      { kind: "number", key: "sahamTotal", label: "Seluruh saham dengan hak suara" }
    ]
  },
  {
    title: "Isi Perubahan (isi yang berlaku saja)",
    description: "Centang jenis perubahan; hanya isian yang relevan yang ditampilkan. Bagian yang dikosongkan tidak dimuat dalam akta.",
    fields: [
      { kind: "checks", key: "ptChanges", label: "Jenis perubahan", options: [...PT_CHANGE_OPTIONS] },
      { kind: "text", key: "bidangBaru", label: "Maksud & tujuan baru (bila KBLI berubah)", wide: true, showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[0]] } },
      { showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[0]] }, kind: "list", key: "kbliBaru", label: "KBLI baru", itemLabel: "KBLI", min: 0, max: 20, fields: [{ kind: "text", key: "kode", label: "Kode" }, { kind: "text", key: "judul", label: "Judul KBLI" }] },
      {
        showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[1], PT_CHANGE_OPTIONS[2]] },
        kind: "list",
        key: "pengurusBaru",
        label: "Susunan Direksi & Dewan Komisaris baru",
        itemLabel: "Pengurus",
        min: 0,
        max: 10,
        fields: [
          { kind: "select", key: "jabatan", label: "Jabatan", options: ["Direktur Utama", "Direktur", "Komisaris Utama", "Komisaris"], default: "Direktur" },
          { kind: "person", key: "orang", label: "Identitas" }
        ]
      },
      { showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[3]] }, kind: "list", key: "peralihan", label: "Peralihan saham yang disetujui", itemLabel: "Peralihan", min: 0, max: 10, fields: [{ kind: "text", key: "dari", label: "Dari" }, { kind: "text", key: "kepada", label: "Kepada" }, { kind: "number", key: "jumlah", label: "Jumlah saham" }] },
      {
        showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[3]] },
        kind: "list",
        key: "pemegangSaham",
        label: "Susunan pemegang saham setelah peralihan",
        itemLabel: "Pemegang saham",
        min: 0,
        max: 15,
        fields: [{ kind: "text", key: "nama", label: "Nama" }, { kind: "number", key: "jumlah", label: "Jumlah saham" }]
      },
      { kind: "textarea", key: "perubahanModal", label: "Perubahan modal (rumusan Pasal 4 baru)", wide: true, showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[4]] } },
      { kind: "text", key: "kedudukanBaru", label: "Tempat kedudukan baru", wide: true, showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[5]] } },
      { kind: "text", key: "namaBaru", label: "Nama perseroan baru (tanpa 'PT')", wide: true, showIf: { key: "ptChanges", anyOf: [PT_CHANGE_OPTIONS[6]] } }
    ]
  }
];

export const perubahanPt: DeedTemplate = {
  key: "perubahan_pt",
  title: "Akta Pernyataan Keputusan Pemegang Saham (Perubahan PT)",
  description: "Pernyataan keputusan RUPS/sirkuler: KBLI, direksi, komisaris, peralihan saham, modal, alamat, nama.",
  sections: PERUBAHAN_SECTIONS,
  signers: (d) => [person(d.penghadap)],
  prefill: (ctx) => ({
    penghadap: personFromClient(ctx.client),
    namaPt: ctx.client.companyName ?? "",
    // Jenis perubahan yang dipilih Notaris saat membuat pekerjaan.
    ptChanges: ctx.job.ptChanges ?? []
  }),
  notes: (d) => {
    const n = ["Perubahan nama, tempat kedudukan, maksud & tujuan, dan modal dasar memerlukan PERSETUJUAN Menteri; perubahan lain cukup DIBERITAHUKAN (Pasal 21 UUPT)."];
    if (!str(d.tanggalRapat)) n.push("Tanggal rapat/keputusan belum diisi.");
    n.push("Lekatkan risalah/keputusan sirkuler dan daftar hadir pada minuta.");
    return n;
  },
  build(d, variant) {
    const p = person(d.penghadap);
    const kbli = list<Kbli>(d.kbliBaru);
    const pengurus = list<Pengurus>(d.pengurusBaru);
    const alih = list<Alih>(d.peralihan);
    const hadir = num(d.sahamHadir);
    const total = num(d.sahamTotal);
    const sirkuler = str(d.jenisRapat).startsWith("Keputusan Sirkuler");
    const pemegang = list<Pemegang>(d.pemegangSaham).filter((x) => str(x.nama) || num(x.jumlah));
    const nominal = num(d.nominal);
    const keputusan: Block[][] = [];
    const urut = ["PERTAMA", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM", "KETUJUH", "KEDELAPAN", "KESEMBILAN", "KESEPULUH"];
    // Perubahan anggaran dasar (Pasal 88 UUPT) vs keputusan lain (Pasal 86 UUPT).
    const ubahAd = !!(str(d.bidangBaru) || kbli.length || str(d.perubahanModal) || str(d.kedudukanBaru) || str(d.namaBaru));

    if (str(d.bidangBaru) || kbli.length)
      keputusan.push([
        { t: "p", text: "Mengubah maksud dan tujuan serta kegiatan usaha Perseroan, sehingga Pasal 3 anggaran dasar Perseroan menjadi berbunyi sebagai berikut:" },
        { t: "center", text: "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA", bold: true },
        ...pasal(3),
        { t: "item", marker: "1.", text: `Maksud dan tujuan Perseroan ialah berusaha dalam bidang ${str(d.bidangBaru).replace(/[\s.;,]+$/, "") || "[...]"}.` },
        { t: "item", marker: "2.", text: "Untuk mencapai maksud dan tujuan tersebut di atas, Perseroan dapat melaksanakan kegiatan usaha sebagai berikut:" },
        ...(kbli.length
          ? kbli.map((k, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + (i % 26))}.`, level: 1, text: `${str(k.judul) || "[...]"} (KBLI ${str(k.kode) || "[...]"})${i === kbli.length - 1 ? "." : ";"}` }))
          : [{ t: "item" as const, marker: "a.", level: 1, text: "[...]." }])
      ]);
    if (alih.length)
      keputusan.push([
        { t: "p", text: "Menyetujui pengalihan saham-saham dalam Perseroan sebagai berikut:" },
        ...alih.map((a, i) => ({
          t: "item" as const,
          marker: `${i + 1}.`,
          text: `dari **${(str(a.dari) || "[...]").toUpperCase()}** kepada **${(str(a.kepada) || "[...]").toUpperCase()}** sebanyak ${lembar(num(a.jumlah))}${i === alih.length - 1 ? "." : ";"}`
        })),
        ...(pemegang.length
          ? ([
              { t: "p", text: "Dengan demikian susunan pemegang saham Perseroan menjadi sebagai berikut:" },
              ...pemegang.map((x, i) => ({
                t: "item" as const,
                marker: `${i + 1}.`,
                text: `**${(str(x.nama) || "[...]").toUpperCase()}**, sebanyak ${lembar(num(x.jumlah))}${nominal ? ` dengan nilai nominal seluruhnya sebesar ${rupiah(num(x.jumlah) * nominal)}` : ""}${i === pemegang.length - 1 ? "." : ";"}`
              }))
            ] as Block[])
          : [])
      ]);
    if (str(d.perubahanModal))
      keputusan.push([
        { t: "p", text: "Mengubah ketentuan mengenai modal Perseroan, sehingga Pasal 4 anggaran dasar Perseroan menjadi berbunyi sebagai berikut:" },
        { t: "center", text: "MODAL", bold: true },
        ...pasal(4),
        { t: "p", text: `${str(d.perubahanModal).replace(/[\s.;,]+$/, "")}.` }
      ]);
    if (str(d.kedudukanBaru) || str(d.namaBaru)) {
      const namaAkhir = `PT ${(str(d.namaBaru) || str(d.namaPt) || "[...]").toUpperCase()}`;
      const kedudukanAkhir = str(d.kedudukanBaru) || str(d.kedudukan) || "[...]";
      const apa = [str(d.namaBaru) ? "nama" : "", str(d.kedudukanBaru) ? "tempat kedudukan" : ""].filter(Boolean).join(" dan ");
      keputusan.push([
        { t: "p", text: `Mengubah ${apa} Perseroan, sehingga Pasal 1 ayat (1) anggaran dasar Perseroan menjadi berbunyi sebagai berikut:` },
        { t: "item", marker: "1.", text: `Perseroan terbatas ini bernama **${namaAkhir}** (selanjutnya dalam anggaran dasar ini cukup disingkat dengan "Perseroan"), berkedudukan di ${kedudukanAkhir}.` }
      ]);
    }
    if (pengurus.length) {
      const direksi = pengurus.some((x) => /direktur/i.test(str(x.jabatan)));
      const komisaris = pengurus.some((x) => /komisaris/i.test(str(x.jabatan)));
      const organ = direksi && komisaris ? "Direksi dan Dewan Komisaris" : komisaris ? "Dewan Komisaris" : "Direksi";
      keputusan.push([
        { t: "p", text: `Memberhentikan dengan hormat seluruh anggota ${organ} Perseroan yang lama, dengan ucapan terima kasih atas jasa-jasanya, dan mengangkat anggota ${organ} Perseroan yang baru, sehingga susunan ${organ} Perseroan menjadi sebagai berikut:` },
        ...pengurus.map((x, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: `${str(x.jabatan) || "[...]"}: ${komparisi(person(x.orang), i === pengurus.length - 1 ? "." : ";")}` })),
        { t: "p", text: `Masa jabatan anggota ${organ} tersebut sesuai ketentuan anggaran dasar Perseroan, terhitung sejak tanggal keputusan ini.` }
      ]);
    }
    if (keputusan.length === 0) keputusan.push([{ t: "p", text: "[...]" }]);

    const persen = hadir && total ? `${angka(Math.round((hadir / total) * 10000) / 100)} persen` : "[...] persen";
    const dasarKuasaDefault = "selaku kuasa berdasarkan keputusan rapat tersebut di bawah ini";
    const dasarKuasa =
      !str(d.dasarKuasa) || str(d.dasarKuasa) === dasarKuasaDefault
        ? sirkuler
          ? "selaku kuasa berdasarkan keputusan para pemegang saham tersebut di bawah ini"
          : dasarKuasaDefault
        : str(d.dasarKuasa);

    const blocks: Block[] = [
      judul(sirkuler ? "PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM" : "PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", d, `PT ${(str(d.namaPt) || "[...]").toUpperCase()}`),
      ...pembuka(d),
      ...daftarPenghadap([{ p, peran: `menurut keterangannya dalam hal ini bertindak ${dasarKuasa}` }]),
      dikenal(1),
      { t: "p", text: "Penghadap dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      { t: "item", marker: "a.", text: `bahwa penghadap bertindak untuk dan atas nama ${premisPt(d)};` },
      {
        t: "item",
        marker: "b.",
        text: sirkuler
          ? `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} seluruh pemegang saham Perseroan yang mewakili ${lembar(hadir)} dari ${lembar(total)} dengan hak suara yang sah telah mengambil keputusan di luar rapat secara tertulis yang ditandatangani oleh seluruh pemegang saham, sebagaimana dimaksud dalam Pasal 91 Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;`
          : `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} bertempat di ${str(d.tempatRapat) || "[...]"} telah diadakan Rapat Umum Pemegang Saham Luar Biasa Perseroan, yang dipimpin oleh ${str(d.pimpinanRapat) || "[...]"}, dan dihadiri oleh pemegang saham yang mewakili ${lembar(hadir)} atau ${persen} dari ${lembar(total)} dengan hak suara yang sah yang telah dikeluarkan Perseroan, sebagaimana ternyata dari daftar hadir rapat, sehingga kuorum sebagaimana dimaksud dalam Pasal ${ubahAd ? "88" : "86"} Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas dan anggaran dasar Perseroan telah terpenuhi;`
      },
      {
        t: "item",
        marker: "c.",
        text: sirkuler
          ? "bahwa keputusan para pemegang saham tersebut dibuat di bawah tangan dan dilekatkan pada minuta akta ini;"
          : "bahwa risalah rapat tersebut dibuat di bawah tangan dan bersama daftar hadir rapat dilekatkan pada minuta akta ini;"
      },
      { t: "item", marker: "d.", text: `bahwa penghadap diberi kuasa untuk menyatakan keputusan ${sirkuler ? "para pemegang saham" : "rapat"} tersebut dalam akta notaris.` },
      { t: "p", text: "Selanjutnya penghadap dengan bertindak sebagaimana tersebut di atas menyatakan keputusan-keputusan sebagai berikut:" }
    ];
    keputusan.forEach((k, i) => {
      blocks.push({ t: "center", text: `KEPUTUSAN ${urut[i] ?? i + 1}`, bold: true }, ...k);
    });
    blocks.push(
      { t: "center", text: `KEPUTUSAN ${urut[keputusan.length] ?? keputusan.length + 1}`, bold: true },
      { t: "p", text: `Memberi kuasa kepada penghadap, ${namaTebal(p)}, dan/atau Direksi Perseroan, dengan hak substitusi, untuk menyatakan keputusan-keputusan tersebut dalam akta notaris, memohon persetujuan dan/atau menyampaikan pemberitahuan perubahan anggaran dasar dan/atau perubahan data Perseroan kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum, serta melakukan segala tindakan yang diperlukan untuk maksud tersebut.` },
      domisili(d, "penghadap"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
