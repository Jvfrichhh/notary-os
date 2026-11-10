import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, dikenal, domisili, judul, komparisi, list, pasal, pembuka, penutup, person, str } from "../common";
import { rupiah } from "../words";

type Pendiri = { orang?: Person };
type Organ = { orang?: Person; jabatan?: string };
type Kegiatan = { uraian?: string };

const BIDANG = ["Sosial", "Keagamaan", "Kemanusiaan"];
const num = (v: unknown) => Number(str(v).replace(/[^\d]/g, "")) || 0;

function gabung(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "[...]";
  return `${xs.slice(0, -1).join(", ")} dan ${xs[xs.length - 1]}`;
}

/**
 * Akta Pendirian Yayasan (UU 16/2001 jo. UU 28/2004) -- anggaran dasar
 * standar: maksud & tujuan, kegiatan, kekayaan, organ (Pembina, Pengurus,
 * Pengawas), tahun buku, perubahan, pembubaran. Belum ada contoh akta kantor;
 * rumusan wajib diperiksa Notaris.
 */
export const pendirianYayasan: DeedTemplate = {
  key: "pendirian_yayasan",
  title: "Akta Pendirian Yayasan",
  description: "Pendirian Yayasan beserta anggaran dasar, kekayaan awal, dan susunan Pembina, Pengurus, dan Pengawas pertama.",
  sections: [
    {
      title: "Data Yayasan",
      fields: [
        { kind: "text", key: "namaYayasan", label: "Nama yayasan (tanpa 'Yayasan')", placeholder: "CAHAYA INSAN MANDIRI" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "money", key: "kekayaanAwal", label: "Kekayaan awal yang dipisahkan pendiri (Rp)", help: "Paling sedikit Rp10.000.000 bila pendiri Warga Negara Indonesia." },
        { kind: "checks", key: "bidang", label: "Maksud dan tujuan di bidang", options: BIDANG }
      ]
    },
    {
      title: "Kegiatan",
      fields: [
        {
          kind: "list",
          key: "kegiatan",
          label: "Kegiatan yayasan",
          itemLabel: "Kegiatan",
          min: 1,
          max: 20,
          fields: [{ kind: "textarea", key: "uraian", label: "Uraian kegiatan", placeholder: "mendirikan dan menyelenggarakan lembaga pendidikan formal dan nonformal" }]
        }
      ]
    },
    {
      title: "Pendiri (penghadap)",
      fields: [{ kind: "list", key: "pendiri", label: "Pendiri", itemLabel: "Pendiri", min: 1, max: 10, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    {
      title: "Organ Yayasan Pertama",
      description: "Pembina tidak boleh merangkap Pengurus atau Pengawas; Pengurus tidak boleh merangkap Pembina atau Pengawas.",
      fields: [
        {
          kind: "list",
          key: "pembina",
          label: "Pembina",
          itemLabel: "Pembina",
          min: 1,
          max: 7,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Ketua Pembina", "Anggota Pembina"], default: "Ketua Pembina" },
            { kind: "person", key: "orang", label: "Identitas" }
          ]
        },
        {
          kind: "list",
          key: "pengurus",
          label: "Pengurus",
          itemLabel: "Pengurus",
          min: 3,
          max: 9,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Ketua", "Sekretaris", "Bendahara", "Wakil Ketua", "Anggota"], default: "Ketua" },
            { kind: "person", key: "orang", label: "Identitas" }
          ]
        },
        {
          kind: "list",
          key: "pengawas",
          label: "Pengawas",
          itemLabel: "Pengawas",
          min: 1,
          max: 5,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Ketua Pengawas", "Anggota Pengawas"], default: "Ketua Pengawas" },
            { kind: "person", key: "orang", label: "Identitas" }
          ]
        }
      ]
    }
  ],
  signers: (d) => list<Pendiri>(d.pendiri).map((x) => person(x.orang)),
  subject: (d) => `Yayasan ${(str(d.namaYayasan) || "[...]").toUpperCase()}`,
  prefill: (ctx) => ({ pendiri: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => {
    const n: string[] = [];
    const kaya = num(d.kekayaanAwal);
    if (kaya > 0 && kaya < 10_000_000) n.push("Kekayaan awal kurang dari Rp10.000.000 (batas minimum untuk pendiri WNI menurut PP 63/2008).");
    const jab = list<Organ>(d.pengurus).map((x) => str(x.jabatan));
    for (const j of ["Ketua", "Sekretaris", "Bendahara"]) if (!jab.includes(j)) n.push(`Pengurus belum memuat jabatan ${j} (paling sedikit Ketua, Sekretaris, dan Bendahara).`);
    const nama = (xs: unknown) => list<Organ>(xs).map((x) => str(person(x.orang).nik) || str(person(x.orang).nama).toLowerCase()).filter(Boolean);
    const [pb, pg, pw] = [nama(d.pembina), nama(d.pengurus), nama(d.pengawas)];
    if (pb.some((x) => pg.includes(x) || pw.includes(x)) || pg.some((x) => pw.includes(x))) n.push("Ada orang yang merangkap di lebih dari satu organ (Pembina/Pengurus/Pengawas) — rangkap jabatan dilarang.");
    n.push("Pastikan nama yayasan sudah dipesan/disetujui di AHU sebelum penandatanganan.");
    n.push("Permohonan pengesahan badan hukum yayasan disampaikan Notaris paling lambat 10 hari sejak akta ditandatangani (UU 28/2004 Pasal 11).");
    n.push("Lampirkan surat pernyataan pemisahan kekayaan pendiri dan bukti penyetoran kekayaan awal.");
    n.push("Template ini rumusan umum (belum dari contoh akta kantor); sesuaikan kegiatan dan kewenangan organ dengan kebutuhan yayasan.");
    return n;
  },
  build(d, variant) {
    const pendiri = list<Pendiri>(d.pendiri);
    const P = pendiri.length ? pendiri : [{}];
    const nama = `YAYASAN ${(str(d.namaYayasan) || "[...]").toUpperCase()}`;
    const kedudukan = str(d.kedudukan) || "[...]";
    const dipilih = Array.isArray(d.bidang) ? (d.bidang as string[]).filter((b) => BIDANG.includes(b)) : [];
    const bidang = gabung((dipilih.length ? dipilih : BIDANG).map((b) => b.toLowerCase()));
    const kegiatan = list<Kegiatan>(d.kegiatan);
    const organ = (xs: unknown, bawaan: string): Block[] => {
      const items = list<Organ>(xs);
      const rows = items.length ? items : [{}];
      return rows.map((x, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        level: 1,
        text: `${str((x as Organ).jabatan) || bawaan}: ${komparisi(person((x as Organ).orang), "")}${i === rows.length - 1 ? "." : ";"}`
      }));
    };

    const blocks: Block[] = [
      judul("PENDIRIAN YAYASAN", d, nama),
      ...pembuka(d),
      ...daftarPenghadap(P.map((p) => ({ p: person(p.orang), peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))),
      dikenal(P.length),
      {
        t: "p",
        text: `{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan bahwa dengan tidak mengurangi izin dari pihak yang berwenang, {PENGHADAP} telah memisahkan dari harta kekayaannya berupa uang tunai sejumlah ${rupiah(str(d.kekayaanAwal))}, dan dengan ini mendirikan suatu Yayasan dengan anggaran dasar sebagai berikut:`
      },

      { t: "center", text: "NAMA DAN TEMPAT KEDUDUKAN", bold: true },
      ...pasal(1),
      ...ayat([
        `Yayasan ini bernama **${nama}** (selanjutnya dalam anggaran dasar ini cukup disebut "Yayasan"), berkedudukan dan berkantor pusat di ${kedudukan}.`,
        "Yayasan dapat membuka kantor cabang atau perwakilan di tempat lain, baik di dalam maupun di luar wilayah Republik Indonesia, berdasarkan keputusan Pengurus dengan persetujuan Pembina."
      ]),

      { t: "center", text: "MAKSUD DAN TUJUAN", bold: true },
      ...pasal(2),
      { t: "p", text: `Yayasan mempunyai maksud dan tujuan di bidang ${bidang}.` },

      { t: "center", text: "KEGIATAN", bold: true },
      ...pasal(3),
      { t: "p", text: "Untuk mencapai maksud dan tujuan tersebut di atas, Yayasan menjalankan kegiatan sebagai berikut:" },
      ...(kegiatan.length ? kegiatan : [{}]).map((k, i, arr) => ({
        t: "item" as const,
        marker: `${String.fromCharCode(97 + (i % 26))}.`,
        text: `${str((k as Kegiatan).uraian).replace(/[\s.;]+$/, "") || "[...]"}${i === arr.length - 1 ? "." : ";"}`
      })),

      { t: "center", text: "JANGKA WAKTU", bold: true },
      ...pasal(4),
      { t: "p", text: "Yayasan didirikan untuk jangka waktu tidak terbatas." },

      { t: "center", text: "KEKAYAAN", bold: true },
      ...pasal(5),
      ...ayat([
        `Yayasan mempunyai kekayaan awal yang berasal dari kekayaan pendiri yang dipisahkan, berupa uang tunai sejumlah ${rupiah(str(d.kekayaanAwal))}.`,
        "Selain kekayaan tersebut, kekayaan Yayasan dapat juga diperoleh dari sumbangan atau bantuan yang tidak mengikat, wakaf, hibah, hibah wasiat, dan perolehan lain yang tidak bertentangan dengan anggaran dasar Yayasan dan/atau peraturan perundang-undangan.",
        "Semua kekayaan Yayasan harus dipergunakan untuk mencapai maksud dan tujuan Yayasan, dan dilarang dialihkan atau dibagikan secara langsung atau tidak langsung, baik dalam bentuk gaji, upah, maupun honorarium atau bentuk lain yang dapat dinilai dengan uang, kepada Pembina, Pengurus, dan Pengawas, kecuali sebagaimana diperkenankan oleh Undang-Undang tentang Yayasan."
      ]),

      { t: "center", text: "ORGAN YAYASAN", bold: true },
      ...pasal(6),
      { t: "p", text: "Yayasan mempunyai organ yang terdiri atas Pembina, Pengurus, dan Pengawas." },

      { t: "center", text: "PEMBINA", bold: true },
      ...pasal(7),
      ...ayat([
        "Pembina adalah organ Yayasan yang mempunyai kewenangan yang tidak diserahkan kepada Pengurus atau Pengawas; Pembina terdiri atas seorang atau lebih anggota Pembina, dan apabila lebih dari seorang, seorang di antaranya diangkat sebagai Ketua Pembina.",
        "Yang dapat diangkat sebagai anggota Pembina adalah orang perseorangan sebagai pendiri Yayasan dan/atau mereka yang berdasarkan keputusan rapat anggota Pembina dinilai mempunyai dedikasi yang tinggi untuk mencapai maksud dan tujuan Yayasan.",
        "Anggota Pembina tidak boleh merangkap sebagai anggota Pengurus dan/atau anggota Pengawas.",
        "Kewenangan Pembina meliputi: keputusan mengenai perubahan anggaran dasar; pengangkatan dan pemberhentian anggota Pengurus dan anggota Pengawas; penetapan kebijakan umum Yayasan berdasarkan anggaran dasar; pengesahan program kerja dan rancangan anggaran tahunan Yayasan; penetapan keputusan mengenai penggabungan atau pembubaran Yayasan; dan pengesahan laporan tahunan.",
        "Pembina mengadakan rapat paling sedikit sekali dalam satu (1) tahun; rapat sah apabila dihadiri lebih dari satu per dua (1/2) jumlah anggota Pembina, dan keputusan diambil berdasarkan musyawarah untuk mufakat atau, bila tidak tercapai, dengan suara terbanyak."
      ]),

      { t: "center", text: "PENGURUS", bold: true },
      ...pasal(8),
      ...ayat([
        "Pengurus adalah organ Yayasan yang melaksanakan kepengurusan Yayasan, sekurang-kurangnya terdiri atas seorang Ketua, seorang Sekretaris, dan seorang Bendahara.",
        "Anggota Pengurus diangkat oleh Pembina melalui rapat Pembina untuk jangka waktu lima (5) tahun dan dapat diangkat kembali; anggota Pengurus tidak boleh merangkap sebagai anggota Pembina atau anggota Pengawas.",
        "Pengurus bertanggung jawab penuh atas kepengurusan Yayasan untuk kepentingan dan tujuan Yayasan, serta berhak mewakili Yayasan di dalam dan di luar Pengadilan; Ketua bersama-sama dengan salah seorang anggota Pengurus lainnya berwenang bertindak untuk dan atas nama Pengurus serta mewakili Yayasan.",
        "Pengurus tidak berwenang mengikat Yayasan sebagai penjamin utang, dan untuk mengalihkan kekayaan Yayasan, membebani kekayaan Yayasan untuk kepentingan pihak lain, meminjam atau meminjamkan uang atas nama Yayasan, serta membeli atau dengan cara lain memperoleh harta tetap, Pengurus harus mendapat persetujuan tertulis dari Pembina.",
        "Pengurus wajib menyusun program kerja dan rancangan anggaran tahunan Yayasan untuk disahkan Pembina, serta membuat dan menyimpan catatan atau tulisan yang berisi keterangan mengenai hak dan kewajiban serta hal lain yang berkaitan dengan kegiatan usaha Yayasan."
      ]),

      { t: "center", text: "PENGAWAS", bold: true },
      ...pasal(9),
      ...ayat([
        "Pengawas adalah organ Yayasan yang bertugas melakukan pengawasan serta memberi nasihat kepada Pengurus dalam menjalankan kegiatan Yayasan; Pengawas terdiri atas seorang atau lebih anggota Pengawas.",
        "Anggota Pengawas diangkat oleh Pembina melalui rapat Pembina untuk jangka waktu lima (5) tahun dan dapat diangkat kembali; anggota Pengawas tidak boleh merangkap sebagai anggota Pembina atau anggota Pengurus.",
        "Pengawas berwenang memasuki bangunan, halaman, atau tempat lain yang dipergunakan Yayasan, memeriksa dokumen, pembukuan, dan keadaan uang kas, serta dapat memberhentikan sementara anggota Pengurus dengan menyebutkan alasannya dan wajib melaporkannya kepada Pembina paling lambat tujuh (7) hari sejak tanggal pemberhentian sementara."
      ]),

      { t: "center", text: "TAHUN BUKU DAN LAPORAN TAHUNAN", bold: true },
      ...pasal(10),
      ...ayat([
        "Tahun buku Yayasan dimulai dari tanggal satu (1) Januari sampai dengan tanggal tiga puluh satu (31) Desember; untuk pertama kalinya dimulai pada tanggal akta pendirian ini dan ditutup pada tanggal tiga puluh satu (31) Desember tahun berjalan.",
        "Pengurus wajib menyusun secara tertulis laporan tahunan paling lambat lima (5) bulan setelah berakhirnya tahun buku Yayasan, yang memuat sekurang-kurangnya laporan keadaan dan kegiatan Yayasan serta laporan keuangan; laporan tahunan ditandatangani oleh Pengurus dan Pengawas dan disahkan oleh rapat Pembina."
      ]),

      { t: "center", text: "PERUBAHAN ANGGARAN DASAR", bold: true },
      ...pasal(11),
      ...ayat([
        "Perubahan anggaran dasar hanya dapat dilaksanakan berdasarkan keputusan rapat Pembina yang dihadiri paling sedikit dua per tiga (2/3) dari jumlah anggota Pembina, dan keputusan disetujui paling sedikit dua per tiga (2/3) dari jumlah anggota Pembina yang hadir atau diwakili.",
        "Perubahan anggaran dasar dilakukan dengan akta notaris dan dibuat dalam bahasa Indonesia; perubahan anggaran dasar tidak dapat dilakukan terhadap maksud dan tujuan Yayasan.",
        "Perubahan nama dan kegiatan Yayasan harus mendapat persetujuan Menteri, sedangkan perubahan lainnya cukup diberitahukan kepada Menteri sesuai peraturan perundang-undangan."
      ]),

      { t: "center", text: "PENGGABUNGAN DAN PEMBUBARAN", bold: true },
      ...pasal(12),
      ...ayat([
        "Penggabungan Yayasan dapat dilakukan dengan menggabungkan satu atau lebih Yayasan dengan Yayasan lain, berdasarkan keputusan rapat Pembina yang dihadiri paling sedikit tiga per empat (3/4) dari jumlah anggota Pembina dan disetujui paling sedikit tiga per empat (3/4) dari jumlah anggota Pembina yang hadir.",
        "Yayasan bubar karena tujuan Yayasan yang ditetapkan dalam anggaran dasar telah tercapai atau tidak tercapai, putusan pengadilan yang telah memperoleh kekuatan hukum tetap, atau sebab lain menurut peraturan perundang-undangan.",
        "Dalam hal Yayasan bubar, Pembina menunjuk likuidator untuk membereskan kekayaan Yayasan; kekayaan sisa hasil likuidasi diserahkan kepada Yayasan lain yang mempunyai maksud dan tujuan yang sama dengan Yayasan yang bubar, dan apabila tidak diserahkan demikian, diserahkan kepada Negara dan penggunaannya dilakukan sesuai dengan maksud dan tujuan Yayasan."
      ]),

      { t: "center", text: "KETENTUAN PENUTUP", bold: true },
      ...pasal(13),
      { t: "p", text: "Hal-hal yang tidak diatur atau belum cukup diatur dalam anggaran dasar ini diputuskan oleh rapat Pembina, dengan memperhatikan Undang-Undang Nomor 16 Tahun 2001 tentang Yayasan sebagaimana telah diubah dengan Undang-Undang Nomor 28 Tahun 2004 beserta peraturan pelaksanaannya." },

      { t: "p", text: "Akhirnya {PENGHADAP} dengan bertindak sebagaimana tersebut di atas menerangkan bahwa untuk pertama kalinya telah diangkat sebagai:" },
      { t: "item", marker: "a.", text: "**PEMBINA**:" },
      ...organ(d.pembina, "Ketua Pembina"),
      { t: "item", marker: "b.", text: "**PENGURUS**:" },
      ...organ(d.pengurus, "Ketua"),
      { t: "item", marker: "c.", text: "**PENGAWAS**:" },
      ...organ(d.pengawas, "Ketua Pengawas"),
      { t: "p", text: "Pengangkatan anggota Pembina, Pengurus, dan Pengawas tersebut telah diterima oleh masing-masing yang bersangkutan." },
      {
        t: "p",
        text: "Pengurus Yayasan, baik bersama-sama maupun masing-masing, dengan hak substitusi, dikuasakan untuk memohon pengesahan atas anggaran dasar ini kepada Menteri Hukum Republik Indonesia, membuat dan menandatangani segala permohonan dan dokumen yang diperlukan, melakukan perubahan dan/atau tambahan dalam bentuk apa pun yang diminta untuk memperoleh pengesahan tersebut, serta melakukan segala tindakan lain yang diperlukan untuk maksud tersebut."
      },
      domisili(d, "{PENGHADAP}"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
