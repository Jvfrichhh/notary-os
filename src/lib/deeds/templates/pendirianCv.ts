import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, dikenal, domisili, judul, komparisi, list, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import { angka, rupiah } from "../words";

type Sekutu = { orang?: Person; setoran?: string; bagianLaba?: string };
type Kbli = { kode?: string; judul?: string };

const num = (v: unknown) => Number(str(v).replace(/[^\d]/g, "")) || 0;

const sekutuFields = (labaHelp: string) => [
  { kind: "person" as const, key: "orang", label: "Identitas" },
  { kind: "money" as const, key: "setoran", label: "Pemasukan modal (Rp)" },
  { kind: "number" as const, key: "bagianLaba", label: "Bagian laba/rugi (%)", help: labaHelp }
];

/**
 * Akta Pendirian Persekutuan Komanditer (CV) -- susunan lazim: sekutu
 * komplementer (pengurus) dan sekutu komanditer, modal, pengurusan,
 * pembagian laba, keluar/masuk sekutu, pembubaran. Belum ada contoh akta
 * kantor; rumusan wajib diperiksa Notaris.
 */
export const pendirianCv: DeedTemplate = {
  key: "pendirian_cv",
  title: "Akta Pendirian CV",
  description: "Pendirian Persekutuan Komanditer (CV): sekutu pengurus, sekutu komanditer, modal, dan pembagian laba.",
  sections: [
    {
      title: "Data Persekutuan",
      fields: [
        { kind: "text", key: "namaCv", label: "Nama persekutuan (tanpa 'CV')", placeholder: "SINAR MAJU SEJAHTERA" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "text", key: "alamat", label: "Alamat kantor", wide: true, placeholder: "Jalan Pajajaran Nomor 10, Kelurahan Babakan, Kecamatan Bogor Tengah" },
        { kind: "text", key: "jangkaWaktu", label: "Jangka waktu berdiri", default: "tidak terbatas" }
      ]
    },
    {
      title: "Maksud dan Tujuan (KBLI)",
      fields: [
        { kind: "text", key: "bidangUsaha", label: "Ringkasan bidang usaha", wide: true, placeholder: "Perdagangan Umum dan Jasa" },
        {
          kind: "list",
          key: "kbli",
          label: "Kegiatan usaha (KBLI 2020)",
          itemLabel: "KBLI",
          min: 1,
          max: 20,
          fields: [
            { kind: "text", key: "kode", label: "Kode", placeholder: "46900" },
            { kind: "text", key: "judul", label: "Judul KBLI", placeholder: "Perdagangan Besar Berbagai Macam Barang" }
          ]
        }
      ]
    },
    {
      title: "Sekutu Komplementer (Pengurus)",
      description: "Sekutu aktif yang mengurus persekutuan dan bertanggung jawab penuh sampai harta pribadinya. Yang pertama menjadi Direktur.",
      fields: [{ kind: "list", key: "aktif", label: "Sekutu komplementer", itemLabel: "Sekutu komplementer", min: 1, max: 5, fields: sekutuFields("Kosongkan semua = dibagi menurut perbandingan pemasukan modal.") }]
    },
    {
      title: "Sekutu Komanditer",
      description: "Sekutu pasif: hanya memasukkan modal, tidak mengurus, tanggung jawab terbatas pada modal yang dimasukkan.",
      fields: [{ kind: "list", key: "pasif", label: "Sekutu komanditer", itemLabel: "Sekutu komanditer", min: 1, max: 10, fields: sekutuFields("Kosongkan semua = dibagi menurut perbandingan pemasukan modal.") }]
    }
  ],
  signers: (d) => [...list<Sekutu>(d.aktif), ...list<Sekutu>(d.pasif)].map((x) => person(x.orang)),
  subject: (d) => `CV ${(str(d.namaCv) || "[...]").toUpperCase()}`,
  prefill: (ctx) => ({ aktif: [{ orang: personFromClient(ctx.client), setoran: "", bagianLaba: "" }], pasif: [{ orang: {}, setoran: "", bagianLaba: "" }] }),
  notes: (d) => {
    const semua = [...list<Sekutu>(d.aktif), ...list<Sekutu>(d.pasif)];
    const n: string[] = [];
    const laba = semua.map((s) => Number(str(s.bagianLaba)) || 0);
    const total = laba.reduce((a, b) => a + b, 0);
    if (total > 0 && Math.abs(total - 100) > 0.001) n.push(`Jumlah bagian laba ${total}% — harus tepat 100%.`);
    if (!list(d.pasif).length) n.push("CV wajib mempunyai paling sedikit satu sekutu komanditer.");
    n.push("Pastikan nama CV sudah diajukan/disetujui di Sistem Administrasi Badan Usaha (AHU) sebelum penandatanganan.");
    n.push("Pendaftaran CV diajukan melalui AHU Online paling lambat 60 hari sejak akta ditandatangani (Permenkumham 17/2018).");
    n.push("Template ini rumusan umum (belum dari contoh akta kantor); sesuaikan ketentuan pengurusan, pembagian laba, dan keluar-masuk sekutu.");
    return n;
  },
  build(d, variant) {
    const aktif = list<Sekutu>(d.aktif);
    const pasif = list<Sekutu>(d.pasif);
    const A = aktif.length ? aktif : [{}];
    const P = pasif.length ? pasif : [{}];
    const semua = [...A, ...P];
    const kbli = list<Kbli>(d.kbli);
    const nama = `CV ${(str(d.namaCv) || "[...]").toUpperCase()}`;
    const kedudukan = str(d.kedudukan) || "[...]";
    const totalModal = semua.reduce((s, x) => s + num(x.setoran), 0);
    const adaPersen = semua.some((s) => Number(str(s.bagianLaba)) > 0);
    const pen = [
      ...A.map((x) => ({ p: person(x.orang), peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" })),
      ...P.map((x) => ({ p: person(x.orang), peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))
    ];
    const direktur = person(A[0].orang);

    const blocks: Block[] = [
      judul("PENDIRIAN PERSEKUTUAN KOMANDITER", d, nama),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      dikenal(pen.length),
      {
        t: "p",
        text: "Para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan dengan ini telah sepakat untuk bersama-sama mendirikan suatu Persekutuan Komanditer (Commanditaire Vennootschap) dengan anggaran dasar sebagai berikut:"
      },

      { t: "center", text: "NAMA DAN TEMPAT KEDUDUKAN", bold: true },
      ...pasal(1),
      ...ayat([
        `Persekutuan ini bernama Persekutuan Komanditer **${nama}** (selanjutnya dalam akta ini disebut "Persekutuan"), berkedudukan di ${kedudukan}${str(d.alamat) ? `, beralamat di ${str(d.alamat)}` : ""}.`,
        "Persekutuan dapat membuka cabang atau perwakilan di tempat lain di dalam wilayah Republik Indonesia sebagaimana ditetapkan oleh para sekutu."
      ]),

      { t: "center", text: "JANGKA WAKTU", bold: true },
      ...pasal(2),
      { t: "p", text: `Persekutuan didirikan untuk jangka waktu ${str(d.jangkaWaktu) || "tidak terbatas"} dan dimulai sejak tanggal akta ini ditandatangani.` },

      { t: "center", text: "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA", bold: true },
      ...pasal(3),
      { t: "item", marker: "1.", text: `Maksud dan tujuan Persekutuan ialah berusaha dalam bidang ${str(d.bidangUsaha) || "[...]"}.` },
      { t: "item", marker: "2.", text: "Untuk mencapai maksud dan tujuan tersebut di atas, Persekutuan dapat melaksanakan kegiatan usaha sebagai berikut:" },
      ...(kbli.length
        ? kbli.map((k, i) => ({
            t: "item" as const,
            marker: `${String.fromCharCode(97 + (i % 26))}.`,
            level: 1,
            text: `${str(k.judul) || "[...]"} (KBLI ${str(k.kode) || "[...]"})${i === kbli.length - 1 ? "." : ";"}`
          }))
        : [{ t: "item" as const, marker: "a.", level: 1, text: "[...]." }]),

      { t: "center", text: "MODAL", bold: true },
      ...pasal(4),
      { t: "item", marker: "1.", text: `Modal Persekutuan seluruhnya berjumlah ${rupiah(totalModal || "")}, yang merupakan pemasukan dari para sekutu, yaitu:` },
      ...semua.map((s, i) => ({
        t: "item" as const,
        marker: `${String.fromCharCode(97 + i)}.`,
        level: 1,
        text: `${namaTebal(person(s.orang))}, sebesar ${rupiah(str(s.setoran))}${i === semua.length - 1 ? "." : ";"}`
      })),
      { t: "item", marker: "2.", text: "Pemasukan modal tersebut telah disetor oleh masing-masing sekutu ke dalam kas Persekutuan, dan untuk penerimaannya akta ini berlaku sebagai tanda terima yang sah." },
      { t: "item", marker: "3.", text: "Penambahan atau pengurangan modal Persekutuan hanya dapat dilakukan dengan persetujuan semua sekutu, dan dicatat dalam pembukuan Persekutuan." },

      { t: "center", text: "PARA SEKUTU DAN PENGURUSAN", bold: true },
      ...pasal(5),
      ...ayat([
        `Penghadap ${A.map((x) => namaTebal(person(x.orang))).join(", ")} adalah sekutu komplementer (sekutu pengurus) yang bertanggung jawab sepenuhnya, secara tanggung renteng sampai dengan harta kekayaan pribadinya, atas segala perikatan Persekutuan.`,
        `Penghadap ${P.map((x) => namaTebal(person(x.orang))).join(", ")} adalah sekutu komanditer, yang tidak turut serta dalam pengurusan Persekutuan dan hanya bertanggung jawab sampai dengan jumlah pemasukan modalnya dalam Persekutuan.`,
        `Persekutuan diurus dan dipimpin oleh sekutu komplementer, dengan ${namaTebal(direktur)} sebagai **Direktur**${A.length > 1 ? ` dan sekutu komplementer lainnya sebagai **Wakil Direktur**` : ""}.`,
        "Direktur berhak dan berwenang mewakili Persekutuan di dalam dan di luar Pengadilan, mengikat Persekutuan dengan pihak lain dan pihak lain dengan Persekutuan, serta menjalankan segala tindakan mengenai pengurusan maupun kepemilikan, dengan pembatasan bahwa untuk meminjam atau meminjamkan uang atas nama Persekutuan (tidak termasuk mengambil uang Persekutuan di bank), membeli, menjual, atau dengan cara lain memperoleh atau melepaskan hak atas barang tidak bergerak, mengagunkan kekayaan Persekutuan, dan mengikat Persekutuan sebagai penjamin, harus mendapat persetujuan tertulis terlebih dahulu dari sekutu komanditer.",
        "Sekutu komanditer berhak setiap waktu dalam jam kerja memeriksa pembukuan, surat-surat, dan keadaan kas Persekutuan, dan sekutu komplementer wajib memberikan segala keterangan yang diminta."
      ]),

      { t: "center", text: "TAHUN BUKU DAN LAPORAN KEUANGAN", bold: true },
      ...pasal(6),
      ...ayat([
        "Tahun buku Persekutuan berjalan dari tanggal satu (1) Januari sampai dengan tanggal tiga puluh satu (31) Desember; untuk pertama kalinya dimulai pada tanggal akta ini dan ditutup pada tanggal tiga puluh satu (31) Desember tahun berjalan.",
        "Paling lambat tiga (3) bulan setelah tahun buku ditutup, sekutu komplementer wajib membuat neraca dan perhitungan laba rugi untuk disahkan oleh semua sekutu; pengesahan tersebut berarti memberikan pelunasan dan pembebasan tanggung jawab kepada sekutu komplementer atas pengurusan dalam tahun buku yang bersangkutan."
      ]),

      { t: "center", text: "PEMBAGIAN LABA DAN RUGI", bold: true },
      ...pasal(7),
      ...(adaPersen
        ? ([
            { t: "item", marker: "1.", text: "Laba bersih Persekutuan sebagaimana ternyata dari perhitungan laba rugi yang telah disahkan dibagi di antara para sekutu sebagai berikut:" },
            ...semua.map((s, i) => ({
              t: "item" as const,
              marker: `${String.fromCharCode(97 + i)}.`,
              level: 1,
              text: `${namaTebal(person(s.orang))}, sebesar ${Number(str(s.bagianLaba)) > 0 ? `${angka(Number(str(s.bagianLaba)))} persen` : "[...] persen"}${i === semua.length - 1 ? "." : ";"}`
            })),
            { t: "item", marker: "2.", text: "Kerugian Persekutuan dipikul oleh para sekutu menurut perbandingan yang sama, dengan ketentuan sekutu komanditer hanya memikul kerugian sampai dengan jumlah pemasukan modalnya." }
          ] as Block[])
        : ayat([
            "Laba bersih Persekutuan sebagaimana ternyata dari perhitungan laba rugi yang telah disahkan dibagi di antara para sekutu menurut perbandingan pemasukan modal masing-masing.",
            "Kerugian Persekutuan dipikul oleh para sekutu menurut perbandingan yang sama, dengan ketentuan sekutu komanditer hanya memikul kerugian sampai dengan jumlah pemasukan modalnya."
          ])),

      { t: "center", text: "KELUAR DAN MASUKNYA SEKUTU", bold: true },
      ...pasal(8),
      ...ayat([
        "Sekutu yang hendak mengundurkan diri wajib memberitahukan maksudnya secara tertulis kepada sekutu lainnya paling lambat tiga (3) bulan sebelumnya; bagiannya dalam Persekutuan diperhitungkan dan dibayarkan berdasarkan neraca terakhir yang disahkan.",
        "Bagian seorang sekutu dalam Persekutuan tidak dapat dialihkan atau dijaminkan kepada pihak lain, dan sekutu baru tidak dapat diterima, kecuali dengan persetujuan tertulis semua sekutu lainnya.",
        "Apabila seorang sekutu meninggal dunia, Persekutuan tidak berakhir dan dilanjutkan oleh sekutu yang masih ada bersama para ahli waris sekutu yang meninggal, yang wajib menunjuk seorang wakil; apabila para ahli waris tidak bersedia, bagiannya dibayarkan berdasarkan neraca terakhir yang disahkan.",
        "Apabila seorang sekutu dinyatakan pailit atau ditaruh di bawah pengampuan, ia dianggap keluar dari Persekutuan terhitung sejak tanggal putusan yang bersangkutan."
      ]),

      { t: "center", text: "PEMBUBARAN DAN LIKUIDASI", bold: true },
      ...pasal(9),
      ...ayat([
        "Persekutuan bubar berdasarkan keputusan semua sekutu, karena jangka waktunya berakhir, atau sebab lain menurut peraturan perundang-undangan.",
        "Dalam hal Persekutuan dibubarkan, sekutu komplementer bertindak sebagai likuidator, kecuali para sekutu menunjuk pihak lain; sisa kekayaan setelah semua utang Persekutuan dilunasi dibagikan kepada para sekutu menurut perbandingan pemasukan modal masing-masing."
      ]),

      { t: "center", text: "KETENTUAN PENUTUP", bold: true },
      ...pasal(10),
      { t: "p", text: "Segala sesuatu yang tidak atau belum cukup diatur dalam akta ini diputuskan oleh para sekutu secara musyawarah, dengan memperhatikan Kitab Undang-Undang Hukum Dagang, Kitab Undang-Undang Hukum Perdata, dan peraturan perundang-undangan lainnya." },
      {
        t: "p",
        text: `Para penghadap dengan ini memberi kuasa kepada ${komparisi(direktur, "")}, dengan hak substitusi, untuk mengajukan permohonan pendaftaran Persekutuan melalui Sistem Administrasi Badan Usaha pada Kementerian Hukum Republik Indonesia, mengurus perizinan berusaha, membuat dan menandatangani segala permohonan dan dokumen yang diperlukan, serta melakukan segala tindakan lain yang diperlukan untuk maksud tersebut.`
      },
      domisili(d, "para penghadap"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
