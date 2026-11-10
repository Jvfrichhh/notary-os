import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, dikenal, domisili, judul, komparisi, list, pasal, pembuka, penutup, person, str } from "../common";
import { angka, rupiah, tanggalHuruf } from "../words";

type Kuasa = { orang?: Person };
type Organ = { orang?: Person; jabatan?: string };
type Kegiatan = { uraian?: string };

const JENIS = ["Konsumen", "Produsen", "Simpan Pinjam", "Jasa", "Pemasaran"];

/**
 * Akta Pendirian Koperasi (UU 25/1992 tentang Perkoperasian) -- anggaran
 * dasar ringkas: landasan & tujuan, keanggotaan, rapat anggota, pengurus,
 * pengawas, modal, sisa hasil usaha, pembubaran. Rumusan umum (belum dari
 * contoh akta kantor); wajib diperiksa Notaris.
 */
export const pendirianKoperasi: DeedTemplate = {
  key: "pendirian_koperasi",
  title: "Akta Pendirian Koperasi",
  description: "Pendirian Koperasi berdasarkan rapat pembentukan: anggaran dasar, modal, dan pengurus serta pengawas pertama.",
  sections: [
    {
      title: "Data Koperasi",
      fields: [
        { kind: "text", key: "namaKoperasi", label: "Nama koperasi (tanpa 'Koperasi')", placeholder: "SEJAHTERA BERSAMA" },
        { kind: "select", key: "jenis", label: "Jenis koperasi", options: JENIS, default: "Konsumen" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "text", key: "alamat", label: "Alamat kantor", wide: true },
        { kind: "text", key: "wilayah", label: "Wilayah keanggotaan", placeholder: "Kota Bogor", help: "Wilayah tempat tinggal/usaha anggota." }
      ]
    },
    {
      title: "Rapat Pembentukan",
      fields: [
        { kind: "date", key: "tanggalRapat", label: "Tanggal rapat pembentukan" },
        { kind: "text", key: "tempatRapat", label: "Tempat rapat", wide: true },
        { kind: "number", key: "jumlahPendiri", label: "Jumlah pendiri yang hadir", help: "Koperasi primer didirikan paling sedikit 9 orang." },
        { kind: "list", key: "kuasa", label: "Kuasa pendiri (penghadap)", itemLabel: "Kuasa pendiri", min: 1, max: 5, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }
      ]
    },
    {
      title: "Kegiatan Usaha",
      fields: [
        {
          kind: "list",
          key: "kegiatan",
          label: "Kegiatan usaha",
          itemLabel: "Kegiatan",
          min: 1,
          max: 15,
          fields: [{ kind: "textarea", key: "uraian", label: "Uraian kegiatan", placeholder: "pengadaan dan penyaluran barang kebutuhan pokok bagi anggota" }]
        }
      ]
    },
    {
      title: "Modal",
      fields: [
        { kind: "money", key: "simpananPokok", label: "Simpanan pokok per anggota (Rp)" },
        { kind: "money", key: "simpananWajib", label: "Simpanan wajib per bulan (Rp)" },
        { kind: "money", key: "modalAwal", label: "Modal awal yang telah disetor (Rp)" }
      ]
    },
    {
      title: "Pengurus & Pengawas Pertama",
      fields: [
        {
          kind: "list",
          key: "pengurus",
          label: "Pengurus",
          itemLabel: "Pengurus",
          min: 3,
          max: 9,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Ketua", "Sekretaris", "Bendahara", "Wakil Ketua", "Anggota Pengurus"], default: "Ketua" },
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
  signers: (d) => list<Kuasa>(d.kuasa).map((x) => person(x.orang)),
  subject: (d) => `Koperasi ${(str(d.namaKoperasi) || "[...]").toUpperCase()}`,
  prefill: (ctx) => ({ kuasa: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => {
    const n: string[] = [];
    const jml = Number(str(d.jumlahPendiri));
    if (jml > 0 && jml < 9) n.push("Jumlah pendiri kurang dari 9 orang (batas minimum koperasi primer).");
    n.push("Akta koperasi hanya dapat dibuat oleh Notaris yang terdaftar sebagai Notaris Pembuat Akta Koperasi (NPAK). Pastikan status NPAK kantor.");
    n.push("Lekatkan pada minuta: berita acara rapat pembentukan, daftar hadir, surat kuasa pendiri, dan bukti setoran modal.");
    if (str(d.jenis) === "Simpan Pinjam") n.push("Koperasi Simpan Pinjam mempunyai syarat modal dan perizinan usaha simpan pinjam tersendiri; periksa ketentuan terbaru Kementerian Koperasi.");
    n.push("Template ini rumusan umum (belum dari contoh akta kantor); sesuaikan dengan hasil rapat pembentukan dan ketentuan perkoperasian terbaru.");
    return n;
  },
  build(d, variant) {
    const kuasaIsi = list<Kuasa>(d.kuasa);
    const kuasa = kuasaIsi.length ? kuasaIsi : [{}];
    const jenis = str(d.jenis) || "Konsumen";
    const nama = `KOPERASI ${jenis.toUpperCase()} ${(str(d.namaKoperasi) || "[...]").toUpperCase()}`;
    const kedudukan = str(d.kedudukan) || "[...]";
    const jml = Number(str(d.jumlahPendiri));
    const kegiatan = list<Kegiatan>(d.kegiatan);
    const organ = (xs: unknown, bawaan: string): Block[] => {
      const items = list<Organ>(xs);
      const rows: Organ[] = items.length ? items : [{}];
      return rows.map((x, i) => ({ t: "item" as const, marker: `${i + 1}.`, level: 1, text: `${str(x.jabatan) || bawaan}: ${komparisi(person(x.orang), "")}${i === rows.length - 1 ? "." : ";"}` }));
    };

    const blocks: Block[] = [
      judul("PENDIRIAN KOPERASI", d, nama),
      ...pembuka(d),
      ...daftarPenghadap(
        kuasa.map((k) => ({
          p: person((k as Kuasa).orang),
          peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri dan selaku kuasa para pendiri berdasarkan keputusan rapat pembentukan yang akan disebut di bawah ini"
        }))
      ),
      dikenal(kuasa.length),
      {
        t: "p",
        text: `{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))}, bertempat di ${str(d.tempatRapat) || "[...]"}, telah diadakan rapat pembentukan koperasi yang dihadiri oleh ${jml > 0 ? angka(jml) : "[...]"} orang pendiri, sebagaimana ternyata dari berita acara rapat pembentukan dan daftar hadir yang dilekatkan pada minuta akta ini; dalam rapat tersebut para pendiri sepakat mendirikan koperasi dan memberi kuasa kepada {PENGHADAP} untuk menandatangani akta pendirian ini, dengan anggaran dasar sebagai berikut:`
      },

      { t: "center", text: "NAMA, TEMPAT KEDUDUKAN DAN JANGKA WAKTU", bold: true },
      ...pasal(1),
      ...ayat([
        `Koperasi ini bernama **${nama}** (selanjutnya dalam anggaran dasar ini disebut "Koperasi"), berkedudukan di ${kedudukan}${str(d.alamat) ? `, beralamat di ${str(d.alamat)}` : ""}.`,
        `Wilayah keanggotaan Koperasi meliputi ${str(d.wilayah) || kedudukan}.`,
        "Koperasi didirikan untuk jangka waktu yang tidak terbatas."
      ]),

      { t: "center", text: "LANDASAN, ASAS DAN TUJUAN", bold: true },
      ...pasal(2),
      ...ayat([
        "Koperasi berlandaskan Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, serta berdasar atas asas kekeluargaan.",
        "Koperasi bertujuan memajukan kesejahteraan anggota pada khususnya dan masyarakat pada umumnya, serta ikut membangun tatanan perekonomian nasional.",
        "Koperasi melaksanakan prinsip koperasi: keanggotaan bersifat sukarela dan terbuka; pengelolaan dilakukan secara demokratis; pembagian sisa hasil usaha dilakukan secara adil sebanding dengan besarnya jasa usaha masing-masing anggota; pemberian balas jasa yang terbatas terhadap modal; dan kemandirian."
      ]),

      { t: "center", text: "KEGIATAN USAHA", bold: true },
      ...pasal(3),
      { t: "p", text: `Untuk mencapai tujuannya, Koperasi menyelenggarakan kegiatan usaha sebagai koperasi ${jenis.toLowerCase()}, yaitu:` },
      ...(kegiatan.length ? kegiatan : [{}]).map((k, i, arr) => ({
        t: "item" as const,
        marker: `${String.fromCharCode(97 + (i % 26))}.`,
        text: `${str((k as Kegiatan).uraian).replace(/[\s.;]+$/, "") || "[...]"}${i === arr.length - 1 ? "." : ";"}`
      })),

      { t: "center", text: "KEANGGOTAAN", bold: true },
      ...pasal(4),
      ...ayat([
        "Yang dapat diterima menjadi anggota Koperasi adalah warga negara Indonesia yang mampu melakukan tindakan hukum, bertempat tinggal atau berusaha di wilayah keanggotaan Koperasi, menyetujui anggaran dasar ini, dan telah melunasi simpanan pokok.",
        "Keanggotaan Koperasi melekat pada diri anggota dan tidak dapat dipindahtangankan; keanggotaan berakhir apabila anggota meninggal dunia, berhenti atas permintaan sendiri, atau diberhentikan oleh Pengurus karena tidak memenuhi kewajibannya, dengan hak membela diri dalam Rapat Anggota.",
        "Setiap anggota mempunyai hak dan kewajiban yang sama, antara lain menghadiri dan menyatakan pendapat serta memberikan suara dalam Rapat Anggota, memilih dan dipilih menjadi Pengurus atau Pengawas, memanfaatkan pelayanan Koperasi, serta mematuhi anggaran dasar dan keputusan Rapat Anggota."
      ]),

      { t: "center", text: "RAPAT ANGGOTA", bold: true },
      ...pasal(5),
      ...ayat([
        "Rapat Anggota merupakan pemegang kekuasaan tertinggi dalam Koperasi; setiap anggota mempunyai satu hak suara dan tidak dapat diwakilkan.",
        "Rapat Anggota Tahunan diselenggarakan paling lambat enam (6) bulan setelah tahun buku berakhir, untuk mengesahkan pertanggungjawaban Pengurus dan Pengawas, laporan keuangan, serta pembagian sisa hasil usaha.",
        "Rapat Anggota sah apabila dihadiri lebih dari satu per dua (1/2) jumlah anggota, dan keputusan diambil berdasarkan musyawarah untuk mufakat atau, bila tidak tercapai, berdasarkan suara terbanyak; untuk perubahan anggaran dasar dan pembubaran Koperasi, rapat harus dihadiri paling sedikit dua per tiga (2/3) jumlah anggota dan disetujui paling sedikit dua per tiga (2/3) jumlah anggota yang hadir."
      ]),

      { t: "center", text: "PENGURUS", bold: true },
      ...pasal(6),
      ...ayat([
        "Pengurus dipilih dari dan oleh anggota dalam Rapat Anggota untuk masa jabatan paling lama lima (5) tahun dan dapat dipilih kembali; Pengurus sekurang-kurangnya terdiri atas Ketua, Sekretaris, dan Bendahara.",
        "Pengurus bertugas mengelola Koperasi dan usahanya, mengajukan rancangan rencana kerja serta rancangan rencana anggaran pendapatan dan belanja Koperasi, menyelenggarakan Rapat Anggota, mengajukan laporan keuangan dan pertanggungjawaban pelaksanaan tugas, serta memelihara buku daftar anggota, Pengurus, dan Pengawas.",
        "Pengurus berwenang mewakili Koperasi di dalam dan di luar Pengadilan; untuk meminjam uang atas nama Koperasi yang melebihi jumlah yang ditetapkan Rapat Anggota, serta membeli, menjual, atau menjaminkan barang tidak bergerak milik Koperasi, Pengurus harus mendapat persetujuan Rapat Anggota."
      ]),

      { t: "center", text: "PENGAWAS", bold: true },
      ...pasal(7),
      ...ayat([
        "Pengawas dipilih dari dan oleh anggota dalam Rapat Anggota untuk masa jabatan paling lama lima (5) tahun dan dapat dipilih kembali; Pengawas tidak boleh merangkap sebagai Pengurus.",
        "Pengawas bertugas melakukan pengawasan terhadap pelaksanaan kebijaksanaan dan pengelolaan Koperasi serta membuat laporan tertulis tentang hasil pengawasannya, dan berwenang meneliti catatan yang ada pada Koperasi serta mendapatkan segala keterangan yang diperlukan."
      ]),

      { t: "center", text: "MODAL", bold: true },
      ...pasal(8),
      ...ayat([
        `Modal Koperasi terdiri atas modal sendiri dan modal pinjaman; modal sendiri berasal dari simpanan pokok sebesar ${rupiah(str(d.simpananPokok))} untuk setiap anggota yang dibayar pada saat masuk menjadi anggota, simpanan wajib sebesar ${rupiah(str(d.simpananWajib))} setiap bulan, dana cadangan, dan hibah.`,
        `Pada saat pendirian ini modal sendiri yang telah disetor oleh para pendiri berjumlah ${rupiah(str(d.modalAwal))}.`,
        "Simpanan pokok dan simpanan wajib tidak dapat diambil kembali selama yang bersangkutan masih menjadi anggota."
      ]),

      { t: "center", text: "TAHUN BUKU DAN SISA HASIL USAHA", bold: true },
      ...pasal(9),
      ...ayat([
        "Tahun buku Koperasi dimulai dari tanggal satu (1) Januari sampai dengan tanggal tiga puluh satu (31) Desember.",
        "Sisa hasil usaha setelah dikurangi dana cadangan dibagikan kepada anggota sebanding dengan jasa usaha yang dilakukan masing-masing anggota dengan Koperasi, serta digunakan untuk keperluan pendidikan perkoperasian dan keperluan lain dari Koperasi, sesuai keputusan Rapat Anggota."
      ]),

      { t: "center", text: "PEMBUBARAN", bold: true },
      ...pasal(10),
      ...ayat([
        "Pembubaran Koperasi dapat dilakukan berdasarkan keputusan Rapat Anggota atau keputusan Pemerintah sesuai peraturan perundang-undangan.",
        "Dalam hal Koperasi dibubarkan, dilakukan penyelesaian oleh penyelesai yang ditunjuk; sisa kekayaan setelah seluruh kewajiban Koperasi dipenuhi dibagikan kepada anggota sesuai ketentuan yang diputuskan Rapat Anggota, dan anggota hanya menanggung kerugian sebatas simpanan pokok, simpanan wajib, dan modal penyertaan yang dimilikinya."
      ]),

      { t: "center", text: "KETENTUAN PENUTUP", bold: true },
      ...pasal(11),
      { t: "p", text: "Hal-hal yang belum diatur dalam anggaran dasar ini diatur lebih lanjut dalam anggaran rumah tangga dan peraturan khusus yang disahkan Rapat Anggota, dengan memperhatikan Undang-Undang Nomor 25 Tahun 1992 tentang Perkoperasian beserta perubahan dan peraturan pelaksanaannya." },

      { t: "p", text: "Akhirnya {PENGHADAP} dengan bertindak sebagaimana tersebut di atas menerangkan bahwa berdasarkan keputusan rapat pembentukan, untuk pertama kalinya telah dipilih dan diangkat sebagai:" },
      { t: "item", marker: "a.", text: "**PENGURUS**:" },
      ...organ(d.pengurus, "Ketua"),
      { t: "item", marker: "b.", text: "**PENGAWAS**:" },
      ...organ(d.pengawas, "Ketua Pengawas"),
      {
        t: "p",
        text: "{Penghadap}, dengan hak substitusi, dikuasakan untuk mengajukan permohonan pengesahan akta pendirian Koperasi ini kepada Menteri yang berwenang, membuat dan menandatangani segala permohonan dan dokumen yang diperlukan, melakukan perubahan dan/atau tambahan yang diminta untuk memperoleh pengesahan tersebut, serta melakukan segala tindakan lain yang diperlukan untuk maksud tersebut."
      },
      domisili(d, "{PENGHADAP}"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
