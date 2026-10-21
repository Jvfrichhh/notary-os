import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, denganPasangan, dikenal, domisili, judul, komparisi, list, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import type { FieldDef, SectionDef } from "../schema";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { formatThousands, rupiah, tanggalHuruf, terbilang } from "../words";
import { PT_CHANGE_OPTIONS } from "../../serviceCatalog";

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
        { kind: "number", key: "jumlah", label: "Jumlah saham yang dijual" },
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
    const jumlah = num(d.jumlah);
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
        text: `Penghadap ${nomorPenghadap(1, penjual.length)}${ada ? " (dengan persetujuan pasangannya)" : ""} untuk selanjutnya disebut **PENJUAL**; dan penghadap ${nomorPenghadap(n1 + 1, pembeli.length)} untuk selanjutnya disebut **PEMBELI**.`
      },
      dikenal(pen.length),
      { t: "p", text: "Para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      { t: "item", marker: "a.", text: `bahwa Penjual adalah pemilik sah atas ${lembar(jumlah)} dalam ${premisPt(d)};` },
      { t: "item", marker: "b.", text: `bahwa penjualan saham tersebut telah memperoleh persetujuan sebagaimana ternyata dari ${str(d.persetujuan) || "[...]"}, serta telah memenuhi ketentuan anggaran dasar Perseroan tentang penawaran saham;` },
      { t: "p", text: "Selanjutnya para penghadap menerangkan telah sepakat mengadakan jual beli saham dengan syarat-syarat sebagai berikut:" },
      ...pasal(1, "Jual Beli"),
      { t: "p", text: `Penjual menjual dan menyerahkan kepada Pembeli, dan Pembeli membeli dan menerima penyerahan dari Penjual, ${lembar(jumlah)} dalam Perseroan dengan nilai nominal seluruhnya sebesar ${rupiah(jumlah * num(d.nominal))}, untuk selanjutnya disebut **SAHAM**.` },
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

type Pengurus = { jabatan?: string; orang?: Person };
type Alih = { dari?: string; kepada?: string; jumlah?: string };
type Kbli = { kode?: string; judul?: string };

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
    const keputusan: Block[][] = [];
    const urut = ["PERTAMA", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM", "KETUJUH", "KEDELAPAN"];

    if (str(d.bidangBaru) || kbli.length)
      keputusan.push([
        { t: "p", text: `Mengubah maksud dan tujuan serta kegiatan usaha Perseroan sehingga Pasal 3 anggaran dasar Perseroan menjadi berbunyi: maksud dan tujuan Perseroan ialah berusaha dalam bidang ${str(d.bidangBaru) || "[...]"}, dengan kegiatan usaha:` },
        ...kbli.map((k, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + (i % 26))}.`, text: `${str(k.judul) || "[...]"} (KBLI ${str(k.kode) || "[...]"})${i === kbli.length - 1 ? "." : ";"}` }))
      ]);
    if (alih.length)
      keputusan.push([
        { t: "p", text: "Menyetujui pengalihan saham-saham dalam Perseroan sebagai berikut:" },
        ...alih.map((a, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: `dari ${str(a.dari) || "[...]"} kepada ${str(a.kepada) || "[...]"} sebanyak ${lembar(num(a.jumlah))}${i === alih.length - 1 ? "." : ";"}` }))
      ]);
    if (str(d.perubahanModal)) keputusan.push([{ t: "p", text: `Mengubah ketentuan Pasal 4 anggaran dasar Perseroan tentang modal menjadi: ${str(d.perubahanModal)}` }]);
    if (str(d.kedudukanBaru)) keputusan.push([{ t: "p", text: `Mengubah tempat kedudukan Perseroan menjadi di ${str(d.kedudukanBaru)}, sehingga Pasal 1 ayat (1) anggaran dasar Perseroan diubah sesuai dengan itu.` }]);
    if (str(d.namaBaru)) keputusan.push([{ t: "p", text: `Mengubah nama Perseroan menjadi **PT ${str(d.namaBaru).toUpperCase()}**, sehingga Pasal 1 ayat (1) anggaran dasar Perseroan diubah sesuai dengan itu.` }]);
    if (pengurus.length)
      keputusan.push([
        { t: "p", text: "Memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris lama dengan ucapan terima kasih atas jasa-jasanya, dan mengangkat susunan Direksi dan Dewan Komisaris Perseroan yang baru sebagai berikut:" },
        ...pengurus.map((x, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: `${str(x.jabatan) || "[...]"}: ${komparisi(person(x.orang), i === pengurus.length - 1 ? "." : ";")}` })),
        { t: "p", text: "Masa jabatan anggota Direksi dan Dewan Komisaris tersebut sesuai ketentuan anggaran dasar Perseroan, terhitung sejak tanggal keputusan ini." }
      ]);
    if (keputusan.length === 0) keputusan.push([{ t: "p", text: "[...]" }]);

    const blocks: Block[] = [
      judul(
        str(d.jenisRapat).startsWith("Keputusan Sirkuler")
          ? "PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM"
          : "PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM LUAR BIASA",
        d,
        `PT ${(str(d.namaPt) || "[...]").toUpperCase()}`
      ),
      ...pembuka(d),
      ...daftarPenghadap([{ p, peran: `menurut keterangannya dalam hal ini bertindak ${str(d.dasarKuasa) || "selaku kuasa berdasarkan keputusan rapat tersebut di bawah ini"}` }]),
      dikenal(1),
      { t: "p", text: "Penghadap dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      { t: "item", marker: "a.", text: `bahwa penghadap bertindak untuk dan atas nama ${premisPt(d)};` },
      {
        t: "item",
        marker: "b.",
        text: sirkuler
          ? `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} seluruh pemegang saham Perseroan telah mengambil keputusan di luar rapat secara sirkuler yang ditandatangani oleh seluruh pemegang saham yang mewakili ${lembar(hadir)} dari ${lembar(total)}, sebagaimana dimaksud dalam Pasal 91 Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;`
          : `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} bertempat di ${str(d.tempatRapat) || "[...]"} telah diadakan ${str(d.jenisRapat)} Perseroan yang dihadiri oleh pemegang saham yang mewakili ${lembar(hadir)} dari ${lembar(total)} yang telah dikeluarkan Perseroan, sehingga kuorum sebagaimana ditentukan anggaran dasar dan undang-undang telah terpenuhi;`
      },
      { t: "item", marker: "c.", text: "bahwa penghadap diberi kuasa untuk menyatakan keputusan tersebut dalam akta notaris; maka penghadap dengan bertindak sebagaimana tersebut di atas menyatakan keputusan-keputusan sebagai berikut:" }
    ];
    keputusan.forEach((k, i) => {
      blocks.push({ t: "center", text: `KEPUTUSAN ${urut[i] ?? i + 1}`, bold: true }, ...k);
    });
    blocks.push(
      { t: "center", text: `KEPUTUSAN ${urut[keputusan.length] ?? keputusan.length + 1}`, bold: true },
      { t: "p", text: `Memberi kuasa kepada penghadap, ${namaTebal(p)}, dengan hak substitusi, untuk menyatakan keputusan-keputusan tersebut dalam akta notaris, memohon persetujuan dan/atau menyampaikan pemberitahuan perubahan anggaran dasar dan/atau perubahan data Perseroan kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum, serta melakukan segala tindakan yang diperlukan.` },
      domisili(d, "penghadap"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
