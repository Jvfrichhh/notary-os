import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, dikenal, judul, komparisi, list, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import { formatThousands, rupiah, terbilang } from "../words";

type Pendiri = { orang?: Person; saham?: string };
type Pengurus = { orang?: Person; jabatan?: string };
type Kbli = { kode?: string; judul?: string };

const num = (v: unknown) => Number(str(v).replace(/[^\d]/g, "")) || 0;

export const pendirianPt: DeedTemplate = {
  key: "pendirian_pt",
  title: "Akta Pendirian PT",
  description: "Pendirian Perseroan Terbatas beserta anggaran dasar, pengambilan saham, dan pengurus pertama.",
  sections: [
    {
      title: "Data Perseroan",
      fields: [
        { kind: "text", key: "namaPt", label: "Nama perseroan (tanpa 'PT')", placeholder: "SINAR MAJU SEJAHTERA" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "money", key: "modalDasar", label: "Modal dasar (Rp)" },
        { kind: "money", key: "nominal", label: "Nilai nominal per saham (Rp)", default: "1000000" },
        { kind: "text", key: "jangkaWaktu", label: "Jangka waktu berdiri", default: "tidak terbatas", help: "Biarkan 'tidak terbatas' bila tidak ditentukan." }
      ]
    },
    {
      title: "Maksud dan Tujuan (KBLI)",
      fields: [
        { kind: "text", key: "bidangUsaha", label: "Ringkasan bidang usaha", wide: true, placeholder: "Perdagangan Besar dan Jasa Konsultasi" },
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
      title: "Pendiri / Pemegang Saham (penghadap)",
      description: "Minimal dua pendiri (Pasal 7 UUPT), kecuali PT perorangan yang memakai formulir pendirian, bukan akta ini.",
      fields: [
        {
          kind: "list",
          key: "pendiri",
          label: "Pendiri",
          itemLabel: "Pendiri",
          min: 2,
          max: 10,
          fields: [
            { kind: "person", key: "orang", label: "Identitas" },
            { kind: "number", key: "saham", label: "Jumlah saham yang diambil" }
          ]
        }
      ]
    },
    {
      title: "Pengurus Pertama",
      fields: [
        {
          kind: "list",
          key: "direksi",
          label: "Direksi",
          itemLabel: "Anggota Direksi",
          min: 1,
          max: 6,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Direktur Utama", "Direktur"], default: "Direktur Utama" },
            { kind: "person", key: "orang", label: "Identitas" }
          ]
        },
        {
          kind: "list",
          key: "komisaris",
          label: "Dewan Komisaris",
          itemLabel: "Anggota Dewan Komisaris",
          min: 1,
          max: 6,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: ["Komisaris Utama", "Komisaris"], default: "Komisaris" },
            { kind: "person", key: "orang", label: "Identitas" }
          ]
        },
        { kind: "person", key: "penerimaKuasa", label: "Penerima kuasa pengurusan pengesahan (kosongkan = Direksi)", optional: true }
      ]
    }
  ],
  signers: (d) => list<Pendiri>(d.pendiri).map((x) => person(x.orang)),
  prefill: (ctx) => ({ pendiri: [{ orang: personFromClient(ctx.client), saham: "" }, { orang: {}, saham: "" }] }),
  notes: (d) => {
    const n: string[] = [];
    const nominal = num(d.nominal);
    const dasar = num(d.modalDasar);
    const totalSaham = list<Pendiri>(d.pendiri).reduce((s, p) => s + num(p.saham), 0);
    const ditempatkan = totalSaham * nominal;
    if (dasar && ditempatkan && ditempatkan * 4 < dasar)
      n.push(`Modal ditempatkan ${rupiah(ditempatkan)} kurang dari 25% modal dasar (Pasal 33 ayat (1) UUPT).`);
    if (dasar && nominal && dasar % nominal !== 0) n.push("Modal dasar tidak habis dibagi nilai nominal saham.");
    if (list(d.pendiri).length < 2) n.push("Pendiri kurang dari dua orang (Pasal 7 ayat (1) UUPT).");
    n.push("Pastikan nama perseroan sudah dipesan/disetujui di AHU sebelum penandatanganan.");
    n.push("Anggaran dasar ini versi standar; sesuaikan bila ada ketentuan khusus (klasifikasi saham, kuorum berbeda, dll.).");
    return n;
  },
  build(d, variant) {
    const pendiri = list<Pendiri>(d.pendiri);
    const direksi = list<Pengurus>(d.direksi);
    const komisaris = list<Pengurus>(d.komisaris);
    const kbli = list<Kbli>(d.kbli);
    const nama = `PT ${(str(d.namaPt) || "[...]").toUpperCase()}`;
    const kedudukan = str(d.kedudukan) || "[...]";
    const nominal = num(d.nominal);
    const dasar = num(d.modalDasar);
    const lembarDasar = nominal ? Math.floor(dasar / nominal) : 0;
    const totalSaham = pendiri.reduce((s, p) => s + num(p.saham), 0);
    const ditempatkan = totalSaham * nominal;
    const jangka = str(d.jangkaWaktu) || "tidak terbatas";
    const kuasa = person(d.penerimaKuasa);

    const lembar = (n: number) => (n ? `${terbilang(n)} (${formatThousands(n)}) saham` : "[...] saham");

    const blocks: Block[] = [
      judul("PENDIRIAN PERSEROAN TERBATAS", d, nama),
      ...pembuka(d),
      ...daftarPenghadap(pendiri.map((p) => ({ p: person(p.orang), peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))),
      dikenal(pendiri.length),
      {
        t: "p",
        text: `Para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan dengan ini telah sepakat untuk bersama-sama mendirikan suatu perseroan terbatas dengan anggaran dasar sebagai berikut:`
      },

      { t: "center", text: "NAMA DAN TEMPAT KEDUDUKAN", bold: true },
      ...pasal(1),
      ...ayat([
        `Perseroan terbatas ini bernama **${nama}** (selanjutnya dalam anggaran dasar ini cukup disingkat dengan "Perseroan"), berkedudukan di ${kedudukan}.`,
        "Perseroan dapat membuka kantor cabang atau perwakilan, baik di dalam maupun di luar wilayah Republik Indonesia sebagaimana ditetapkan oleh Direksi."
      ]),

      { t: "center", text: "JANGKA WAKTU BERDIRINYA PERSEROAN", bold: true },
      ...pasal(2),
      { t: "p", text: `Perseroan didirikan untuk jangka waktu ${jangka}.` },

      { t: "center", text: "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA", bold: true },
      ...pasal(3),
      { t: "item", marker: "1.", text: `Maksud dan tujuan Perseroan ialah berusaha dalam bidang ${str(d.bidangUsaha) || "[...]"}.` },
      { t: "item", marker: "2.", text: "Untuk mencapai maksud dan tujuan tersebut di atas, Perseroan dapat melaksanakan kegiatan usaha sebagai berikut:" },
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
      ...ayat([
        `Modal dasar Perseroan berjumlah ${rupiah(dasar)}, terbagi atas ${lembar(lembarDasar)}, masing-masing saham bernilai nominal ${rupiah(nominal)}.`,
        `Dari modal dasar tersebut telah ditempatkan dan disetor penuh sebesar ${ditempatkan ? Math.round((ditempatkan / (dasar || ditempatkan)) * 100) : "[...]"}% (${ditempatkan && dasar ? terbilang(Math.round((ditempatkan / dasar) * 100)) : "[...]"} persen) atau sejumlah ${lembar(totalSaham)} dengan nilai nominal seluruhnya sebesar ${rupiah(ditempatkan)} oleh para pendiri yang telah mengambil bagian saham dan rincian serta nilai nominal saham yang disebutkan pada bagian akhir akta ini.`,
        "Saham-saham yang masih dalam simpanan akan dikeluarkan oleh Perseroan menurut keperluan modal Perseroan dengan persetujuan Rapat Umum Pemegang Saham, dengan memperhatikan peraturan perundang-undangan yang berlaku."
      ]),

      { t: "center", text: "SAHAM", bold: true },
      ...pasal(5),
      ...ayat([
        "Saham-saham Perseroan adalah saham atas nama.",
        "Perseroan hanya mengakui seorang atau satu badan hukum sebagai pemilik satu saham.",
        "Setiap saham memberikan satu hak suara dalam Rapat Umum Pemegang Saham.",
        "Bukti pemilikan saham dapat berupa surat saham atau surat kolektif saham yang ditandatangani oleh Direksi, dan Direksi wajib mengadakan dan menyimpan Daftar Pemegang Saham dan Daftar Khusus sesuai ketentuan peraturan perundang-undangan."
      ]),

      { t: "center", text: "PEMINDAHAN HAK ATAS SAHAM", bold: true },
      ...pasal(6),
      ...ayat([
        "Pemindahan hak atas saham dilakukan berdasarkan akta pemindahan hak yang ditandatangani oleh pihak yang memindahkan dan pihak yang menerima pemindahan atau kuasa mereka yang sah.",
        "Pemegang saham yang hendak memindahkan sahamnya wajib terlebih dahulu menawarkan kepada pemegang saham lain dengan menyebutkan harga serta persyaratan penjualan, dan apabila dalam jangka waktu tiga puluh (30) hari sejak penawaran tidak ada yang membeli, pemegang saham tersebut dapat menawarkan dan menjualnya kepada pihak ketiga.",
        "Pemindahan hak atas saham harus mendapat persetujuan Rapat Umum Pemegang Saham, sepanjang tidak ditentukan lain oleh peraturan perundang-undangan.",
        "Direksi wajib mencatat pemindahan hak atas saham dalam Daftar Pemegang Saham dan memberitahukan perubahan susunan pemegang saham kepada Menteri sesuai peraturan perundang-undangan."
      ]),

      { t: "center", text: "RAPAT UMUM PEMEGANG SAHAM", bold: true },
      ...pasal(7),
      ...ayat([
        "Rapat Umum Pemegang Saham (RUPS) terdiri atas RUPS tahunan dan RUPS lainnya.",
        "RUPS tahunan wajib diadakan dalam waktu paling lambat enam (6) bulan setelah tahun buku berakhir, untuk menyetujui laporan tahunan dan mengesahkan laporan keuangan.",
        "RUPS lainnya dapat diadakan sewaktu-waktu berdasarkan kebutuhan.",
        "RUPS diadakan di tempat kedudukan Perseroan atau di tempat Perseroan melakukan kegiatan usaha utamanya, dan dapat juga dilakukan melalui media telekonferensi, video konferensi, atau sarana media elektronik lainnya sepanjang semua peserta dapat saling melihat dan mendengar serta berpartisipasi.",
        "Pemanggilan RUPS dilakukan oleh Direksi dengan surat tercatat dan/atau iklan dalam surat kabar paling lambat empat belas (14) hari sebelum tanggal RUPS, tidak termasuk tanggal pemanggilan dan tanggal RUPS.",
        "Dalam hal semua pemegang saham hadir dan/atau diwakili, pemanggilan terlebih dahulu tidak disyaratkan dan RUPS dapat mengambil keputusan yang sah serta mengikat.",
        "Pemegang saham juga dapat mengambil keputusan yang mengikat di luar RUPS dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan."
      ]),

      { t: "center", text: "KUORUM, HAK SUARA DAN KEPUTUSAN RUPS", bold: true },
      ...pasal(8),
      ...ayat([
        "RUPS dapat dilangsungkan apabila dihadiri lebih dari satu per dua (1/2) bagian dari jumlah seluruh saham dengan hak suara, kecuali undang-undang dan/atau anggaran dasar ini menentukan lain.",
        "Keputusan RUPS diambil berdasarkan musyawarah untuk mufakat; dalam hal tidak tercapai, keputusan sah apabila disetujui lebih dari satu per dua (1/2) bagian dari jumlah suara yang dikeluarkan.",
        "RUPS untuk mengubah anggaran dasar sah apabila dihadiri paling sedikit dua per tiga (2/3) bagian dari jumlah seluruh saham dengan hak suara dan keputusan sah apabila disetujui paling sedikit dua per tiga (2/3) bagian dari jumlah suara yang dikeluarkan.",
        "RUPS untuk menyetujui penggabungan, peleburan, pengambilalihan, pemisahan, pengajuan permohonan pailit, perpanjangan jangka waktu berdirinya, dan pembubaran Perseroan sah apabila dihadiri paling sedikit tiga per empat (3/4) bagian dari jumlah seluruh saham dengan hak suara dan keputusan sah apabila disetujui paling sedikit tiga per empat (3/4) bagian dari jumlah suara yang dikeluarkan."
      ]),

      { t: "center", text: "DIREKSI", bold: true },
      ...pasal(9),
      ...ayat([
        "Perseroan diurus dan dipimpin oleh Direksi yang terdiri dari satu (1) orang anggota Direksi atau lebih; apabila diangkat lebih dari satu (1) orang, seorang di antaranya dapat diangkat sebagai Direktur Utama.",
        "Anggota Direksi diangkat oleh RUPS untuk jangka waktu lima (5) tahun dan dapat diangkat kembali, dengan tidak mengurangi hak RUPS untuk memberhentikannya sewaktu-waktu.",
        "Direksi berhak mewakili Perseroan di dalam dan di luar Pengadilan tentang segala hal dan dalam segala kejadian, mengikat Perseroan dengan pihak lain dan pihak lain dengan Perseroan, serta menjalankan segala tindakan, baik mengenai kepengurusan maupun kepemilikan, dengan pembatasan bahwa untuk meminjam atau meminjamkan uang atas nama Perseroan (tidak termasuk mengambil uang Perseroan di bank), membeli, menjual, atau dengan cara lain memperoleh atau melepaskan hak atas barang tidak bergerak, serta mengagunkan kekayaan Perseroan, Direksi harus mendapat persetujuan tertulis dari Dewan Komisaris.",
        "Direktur Utama berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan; dalam hal Direktur Utama tidak hadir atau berhalangan, yang tidak perlu dibuktikan kepada pihak ketiga, salah seorang anggota Direksi lainnya berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan.",
        "Rapat Direksi dapat diadakan sewaktu-waktu bila dianggap perlu, dan keputusan diambil berdasarkan musyawarah untuk mufakat atau, bila tidak tercapai, dengan suara terbanyak biasa."
      ]),

      { t: "center", text: "DEWAN KOMISARIS", bold: true },
      ...pasal(10),
      ...ayat([
        "Dewan Komisaris terdiri dari satu (1) orang anggota Dewan Komisaris atau lebih; apabila diangkat lebih dari satu (1) orang, seorang di antaranya dapat diangkat sebagai Komisaris Utama.",
        "Anggota Dewan Komisaris diangkat oleh RUPS untuk jangka waktu lima (5) tahun dan dapat diangkat kembali, dengan tidak mengurangi hak RUPS untuk memberhentikannya sewaktu-waktu.",
        "Dewan Komisaris melakukan pengawasan atas kebijakan pengurusan dan jalannya pengurusan Perseroan oleh Direksi, serta memberikan nasihat kepada Direksi.",
        "Dewan Komisaris setiap waktu dalam jam kerja kantor Perseroan berhak memasuki bangunan dan halaman atau tempat lain yang dipergunakan atau yang dikuasai oleh Perseroan serta berhak memeriksa buku, surat, dan alat bukti lainnya."
      ]),

      { t: "center", text: "RENCANA KERJA, TAHUN BUKU DAN LAPORAN TAHUNAN", bold: true },
      ...pasal(11),
      ...ayat([
        "Direksi menyampaikan rencana kerja yang memuat juga anggaran tahunan Perseroan kepada Dewan Komisaris untuk mendapat persetujuan sebelum tahun buku dimulai.",
        "Tahun buku Perseroan berjalan dari tanggal satu (1) Januari sampai dengan tanggal tiga puluh satu (31) Desember; pada akhir bulan Desember tiap tahun buku Perseroan ditutup. Untuk pertama kalinya tahun buku Perseroan dimulai pada tanggal akta pendirian ini dan ditutup pada tanggal tiga puluh satu (31) Desember tahun berjalan.",
        "Direksi menyusun laporan tahunan dan menyampaikannya kepada RUPS setelah ditelaah oleh Dewan Komisaris, dalam jangka waktu paling lambat enam (6) bulan setelah tahun buku Perseroan berakhir."
      ]),

      { t: "center", text: "PENGGUNAAN LABA DAN PEMBAGIAN DIVIDEN", bold: true },
      ...pasal(12),
      ...ayat([
        "Laba bersih Perseroan dalam suatu tahun buku seperti tercantum dalam laporan keuangan yang telah disahkan oleh RUPS tahunan dan merupakan saldo laba yang positif, dibagi menurut cara penggunaannya yang ditentukan oleh RUPS.",
        "Perseroan wajib menyisihkan jumlah tertentu dari laba bersih setiap tahun buku untuk cadangan sampai cadangan mencapai paling sedikit dua puluh persen (20%) dari jumlah modal ditempatkan dan disetor.",
        "Dalam hal RUPS tahunan tidak menentukan cara penggunaannya, laba bersih setelah dikurangi cadangan yang diwajibkan dibagi seluruhnya sebagai dividen kepada pemegang saham sesuai dengan jumlah saham yang dimilikinya."
      ]),

      { t: "center", text: "PERUBAHAN ANGGARAN DASAR", bold: true },
      ...pasal(13),
      ...ayat([
        "Perubahan anggaran dasar ditetapkan oleh RUPS dengan memperhatikan ketentuan Pasal 8 anggaran dasar ini dan peraturan perundang-undangan.",
        "Perubahan anggaran dasar dibuat dengan akta notaris dalam bahasa Indonesia dan wajib memperoleh persetujuan atau diberitahukan kepada Menteri sesuai ketentuan peraturan perundang-undangan."
      ]),

      { t: "center", text: "PEMBUBARAN DAN LIKUIDASI", bold: true },
      ...pasal(14),
      ...ayat([
        "Pembubaran Perseroan terjadi berdasarkan keputusan RUPS, karena jangka waktu berdirinya berakhir, berdasarkan penetapan pengadilan, atau sebab lain sebagaimana ditentukan peraturan perundang-undangan.",
        "Dalam hal terjadi pembubaran Perseroan, wajib diikuti dengan likuidasi yang dilakukan oleh likuidator atau kurator, dan Perseroan tidak dapat melakukan perbuatan hukum kecuali diperlukan untuk membereskan kekayaannya dalam proses likuidasi."
      ]),

      { t: "center", text: "KETENTUAN PENUTUP", bold: true },
      ...pasal(15),
      { t: "p", text: "Segala sesuatu yang tidak atau belum cukup diatur dalam anggaran dasar ini akan diputuskan dalam RUPS dengan memperhatikan Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas beserta perubahannya dan peraturan pelaksanaannya." },

      { t: "p", text: "Akhirnya para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan bahwa:" },
      {
        t: "item",
        marker: "a.",
        text: `Untuk pertama kalinya dari modal dasar tersebut telah diambil bagian dan disetor penuh sejumlah ${lembar(totalSaham)} dengan nilai nominal seluruhnya sebesar ${rupiah(ditempatkan)} oleh para pendiri, yaitu:`
      },
      ...pendiri.map((p, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        level: 1,
        text: `${namaTebal(person(p.orang))}, sebanyak ${lembar(num(p.saham))} dengan nilai nominal seluruhnya sebesar ${rupiah(num(p.saham) * nominal)};`
      })),
      {
        t: "item",
        marker: "",
        level: 1,
        text: `sehingga seluruhnya berjumlah ${lembar(totalSaham)} dengan nilai nominal seluruhnya sebesar ${rupiah(ditempatkan)}.`
      },
      { t: "item", marker: "b.", text: "Penyetoran modal tersebut telah dilakukan oleh masing-masing pendiri dengan bukti penyetoran yang sah." },
      { t: "item", marker: "c.", text: "Menyimpang dari ketentuan tentang tata cara pengangkatan anggota Direksi dan Dewan Komisaris, telah diangkat untuk pertama kalinya:" },
      { t: "item", marker: "", level: 1, text: "**DIREKSI**:" },
      ...direksi.map((x, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        level: 1,
        text: `${str(x.jabatan) || "Direktur"}: ${komparisi(person(x.orang), "")};`
      })),
      { t: "item", marker: "", level: 1, text: "**DEWAN KOMISARIS**:" },
      ...komisaris.map((x, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        level: 1,
        text: `${str(x.jabatan) || "Komisaris"}: ${komparisi(person(x.orang), "")}${i === komisaris.length - 1 ? "." : ";"}`
      })),
      { t: "p", text: "Pengangkatan anggota Direksi dan Dewan Komisaris tersebut telah diterima oleh masing-masing yang bersangkutan." },
      {
        t: "item",
        marker: "d.",
        text: `Para penghadap memberi kuasa kepada ${str(kuasa.nama) ? `${komparisi(kuasa, "")}, ` : "Direksi Perseroan, "}dengan hak substitusi, untuk memohon pengesahan badan hukum Perseroan kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum, mengajukan dan menandatangani semua permohonan dan dokumen lainnya, memilih tempat kedudukan, serta melakukan perubahan dan/atau tambahan dalam bentuk yang bagaimanapun juga yang diperlukan untuk memperoleh pengesahan tersebut, dan untuk mengajukan serta menandatangani semua permohonan dan dokumen lainnya, serta melaksanakan tindakan lain yang mungkin diperlukan.`
      },
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
