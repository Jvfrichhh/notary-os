import type { Cfg } from "./types";
import { biaya, sel, t, ta, tgl } from "./klausa";

const WASIAT_CEK = ["KTP & KK Pewasiat", "?Akta Perkawinan / Akta Cerai", "?Surat Keterangan Sehat (bila usia lanjut/sakit)", "KTP 2 (dua) Saksi (bukan ahli waris/penerima wasiat)"];

export const D5_KELUARGA: Cfg[] = [
  {
    key: "pembagian_harta_bersama",
    title: "Akta Pembagian Harta Bersama",
    judul: "PEMBAGIAN HARTA BERSAMA",
    category: "Keluarga",
    description: "Pembagian harta bersama (gono-gini) setelah perceraian atau setelah dibuat perjanjian pemisahan harta.",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama (bekas suami / suami)", max: 1, klien: true }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua (bekas istri / istri)", max: 1 }],
    sections: [{ title: "Perkawinan & Harta", fields: [t("perkawinan", "Bukti perkawinan", "Kutipan Akta Nikah Nomor ... tanggal ... dari KUA ..."), t("dasar", "Dasar pembagian", "Akta Cerai Nomor ... tanggal ... dari Pengadilan Agama ... / Akta Perjanjian Pasca Nikah Nomor ..."), ta("bagian1", "Bagian Pihak Pertama (satu per baris)"), ta("bagian2", "Bagian Pihak Kedua (satu per baris)"), ta("utang", "Utang bersama & penanggungnya (opsional; satu per baris)"), t("kompensasi", "Kompensasi selisih nilai (opsional)", "Pihak Pertama membayar Rp... kepada Pihak Kedua")] }],
    premis: ["bahwa para pihak pernah/masih terikat perkawinan sebagaimana ternyata dari {perkawinan}, tanpa perjanjian pemisahan harta sebelumnya, sehingga terdapat harta bersama;", "bahwa berdasarkan {dasar}, para pihak bermaksud membagi harta bersama tersebut."],
    pasal: [
      ["Para pihak sepakat membagi harta bersama sehingga yang menjadi bagian dan milik Pihak Pertama adalah:", { baris: "bagian1" }],
      ["Dan yang menjadi bagian dan milik Pihak Kedua adalah:", { baris: "bagian2" }],
      { jika: "utang", isi: ["Mengenai utang bersama para pihak sepakat sebagai berikut:", { baris: "utang" }] },
      { jika: "kompensasi", isi: ["Untuk menyeimbangkan nilai pembagian, {kompensasi}."] },
      ["Masing-masing pihak menerima bagiannya, menyatakan pembagian ini adil, dan saling memberikan pembebasan dan pelunasan sepenuhnya. Para pihak menjamin tidak ada harta bersama lain yang belum dibagi; bila kemudian ternyata ada, akan dibagi sama rata kecuali disepakati lain."],
      ["Para pihak saling memberi kuasa untuk menandatangani akta dan surat yang diperlukan guna balik nama harta bagian masing-masing, termasuk Akta Pembagian Hak Bersama di hadapan Pejabat Pembuat Akta Tanah untuk harta berupa tanah."],
      [biaya("para pihak masing-masing untuk setengah bagian")]
    ],
    subject: "Pembagian harta bersama",
    notes: ["Selama perkawinan masih berlangsung, pembagian harta bersama hanya mungkin bila sudah ada perjanjian perkawinan pemisahan harta (Putusan MK 69/PUU-XIII/2015) yang dicatatkan.", "Harta berupa tanah dibalik nama dengan APHB (PPAT); pembagian tidak boleh merugikan kreditor."],
    checklist: ["KTP & KK Para Pihak", "Buku Nikah / Akta Perkawinan", "Akta Cerai & Putusan Pengadilan (bila cerai)", "Bukti Kepemilikan Harta (sertipikat, BPKB, rekening)", "?Akta Perjanjian Kawin (bila ada)", "?Daftar Utang Bersama"]
  },
  {
    key: "persetujuan_pasangan",
    title: "Akta Persetujuan dan Kuasa Suami/Istri",
    judul: "PERSETUJUAN DAN KUASA",
    category: "Keluarga",
    description: "Persetujuan (dan kuasa) dari suami/istri kepada pasangannya untuk menjual, menjaminkan, atau melakukan tindakan atas harta bersama.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Persetujuan", label: "Pemberi Persetujuan (suami/istri)", max: 1 }, { key: "penerima", sebut: "Penerima Persetujuan", label: "Penerima Persetujuan (pasangan; bila ikut menghadap)", min: 0, max: 1, klien: true }],
    sections: [{ title: "Persetujuan", fields: [t("namaPasangan", "Nama pasangan yang diberi persetujuan", "Tuan ..."), t("perkawinan", "Bukti perkawinan", "Kutipan Akta Nikah Nomor ... tanggal ..."), ta("tindakan", "Tindakan yang disetujui (satu per baris)", "menjual sebidang tanah Hak Milik Nomor ..."), t("objek", "Objek", "sebidang tanah Hak Milik Nomor .../..., seluas ... m², terletak di ..."), t("kepada", "Kepada / untuk kepentingan (opsional)", "PT Bank ...")] }],
    premis: ["bahwa Pemberi Persetujuan adalah suami/istri yang sah dari {namaPasangan} sebagaimana ternyata dari {perkawinan};", "bahwa {objek} merupakan harta bersama dalam perkawinan mereka."],
    pasal: [
      ["Pemberi Persetujuan dengan ini memberikan persetujuan sepenuhnya kepada {namaPasangan} untuk melakukan tindakan sebagai berikut atas {objek}<<, kepada atau untuk kepentingan {kepada}>>:", { baris: "tindakan" }],
      ["Sepanjang diperlukan, Pemberi Persetujuan dengan ini pula memberi kuasa kepada {namaPasangan} untuk mewakili Pemberi Persetujuan menghadap pejabat yang berwenang, menandatangani akta dan surat yang diperlukan, menerima uang dan memberikan tanda penerimaannya, serta melakukan segala sesuatu yang diperlukan untuk tindakan tersebut, tanpa ada yang dikecualikan."],
      ["Persetujuan dan kuasa ini berlaku sampai tindakan tersebut selesai dilaksanakan, dan Pemberi Persetujuan tidak akan mengajukan keberatan atau tuntutan apa pun mengenai tindakan tersebut."]
    ],
    tanpaDomisili: true,
    subject: "Persetujuan pasangan atas {objek}",
    notes: ["Tindakan atas harta bersama memerlukan persetujuan kedua belah pihak (Pasal 36 ayat (1) UU Perkawinan).", "Untuk pembebanan Hak Tanggungan, kuasa membebankan harus dengan SKMHT; persetujuan ini tidak menggantikannya."],
    checklist: ["KTP & KK Suami dan Istri", "Buku Nikah / Akta Perkawinan", "Bukti Kepemilikan Objek", "?Draft Akta / Perjanjian yang Disetujui"]
  },
  {
    key: "pembagian_warisan",
    title: "Akta Pemisahan dan Pembagian Harta Warisan",
    judul: "PEMISAHAN DAN PEMBAGIAN HARTA WARISAN",
    category: "Waris",
    description: "Pembagian harta peninggalan di antara para ahli waris (Pasal 1066 dst. KUHPerdata).",
    pihak: [{ key: "ahliWaris", sebut: "", label: "Para Ahli Waris", max: 12, klien: true }],
    sections: [{ title: "Pewaris & Pembagian", fields: [t("pewaris", "Nama pewaris", "almarhum Tuan ..."), t("meninggal", "Meninggal dunia", "di Kota Bogor pada tanggal ..., Akta Kematian Nomor ..."), t("skw", "Bukti ahli waris", "Surat Keterangan Hak Waris Nomor ... tanggal ... / Penetapan Pengadilan Agama ... Nomor ..."), ta("harta", "Harta peninggalan (satu per baris)"), ta("utang", "Utang pewaris & penyelesaiannya (opsional; satu per baris)"), ta("pembagian", "Pembagian (satu per baris: nama ahli waris memperoleh apa)", "Nyonya A memperoleh sebidang tanah Hak Milik Nomor ..."), t("kompensasi", "Kompensasi antar ahli waris (opsional)")] }],
    premis: ["bahwa {pewaris} telah meninggal dunia {meninggal} (selanjutnya disebut \"Pewaris\");", "bahwa berdasarkan {skw}, {PENGHADAP} adalah seluruh ahli waris Pewaris dan tidak ada ahli waris lain;", "bahwa Pewaris meninggalkan harta peninggalan yang belum terbagi sebagai berikut:", { baris: "harta" }],
    pasal: [
      { jika: "utang", isi: ["Para ahli waris sepakat menyelesaikan utang Pewaris sebagai berikut:", { baris: "utang" }] },
      ["Para ahli waris sepakat memisahkan dan membagi harta peninggalan tersebut sebagai berikut:", { baris: "pembagian" }],
      { jika: "kompensasi", isi: ["Untuk menyeimbangkan pembagian, {kompensasi}."] },
      ["Masing-masing ahli waris menerima bagiannya, menyatakan pembagian ini telah sesuai dengan kehendak dan haknya, dan saling memberikan pembebasan serta pelunasan sepenuhnya; mereka tidak akan saling menuntut lagi mengenai harta peninggalan Pewaris."],
      ["Para ahli waris menjamin bahwa tidak ada ahli waris lain, wasiat, atau pihak yang berhak atas harta peninggalan selain yang disebut dalam akta ini, dan menanggung sendiri segala akibat bila jaminan itu tidak benar."],
      ["Para ahli waris saling memberi kuasa untuk menandatangani akta dan surat yang diperlukan guna balik nama harta bagian masing-masing, termasuk Akta Pembagian Hak Bersama di hadapan Pejabat Pembuat Akta Tanah."],
      [biaya("para ahli waris menurut perbandingan bagian masing-masing")]
    ],
    subject: "Pembagian harta warisan {pewaris}",
    notes: ["Seluruh ahli waris harus ikut serta; bila ada yang belum dewasa atau di bawah pengampuan diperlukan wali/pengampu dan izin pengadilan [VERIFIKASI].", "Tanah yang sudah turun waris ke semua ahli waris dibagi dengan APHB (PPAT); perolehan karena waris/pembagian waris mempunyai perlakuan BPHTB dan PPh tersendiri.", "Lakukan pengecekan wasiat ke Daftar Pusat Wasiat sebelum pembagian."],
    checklist: ["KTP & KK Seluruh Ahli Waris", "Akta Kematian Pewaris", "Surat Keterangan Waris / Penetapan Ahli Waris", "Buku Nikah Pewaris & Akta Kelahiran Ahli Waris", "Bukti Kepemilikan Harta Peninggalan", "Surat Keterangan Wasiat dari Daftar Pusat Wasiat", "?Penetapan Pengadilan (ahli waris di bawah umur)"]
  },
  {
    key: "hibah_wasiat",
    title: "Akta Hibah Wasiat",
    judul: "HIBAH WASIAT",
    sub: "(LEGAAT)",
    category: "Waris",
    description: "Wasiat yang memberikan barang tertentu kepada orang tertentu (Pasal 957 KUHPerdata).",
    pihak: [{ key: "pewasiat", sebut: "Pewasiat", label: "Pewasiat", max: 1, klien: true }],
    sections: [{ title: "Hibah Wasiat", fields: [ta("legaat", "Hibah wasiat (satu per baris: barang kepada siapa)", "sebidang tanah Hak Milik Nomor ... kepada cucu saya, ..., lahir di ... tanggal ..."), sel("cabut", "Wasiat terdahulu", ["Tetap berlaku sepanjang tidak bertentangan", "Dicabut seluruhnya"]), t("pelaksana", "Pelaksana wasiat (opsional)", "Tuan ..., lahir di ... tanggal ..., bertempat tinggal di ..."), ta("pesan", "Ketentuan lain (opsional; satu per baris)")] }],
    pengantar: "{Penghadap}, yang menurut penglihatan saya, Notaris, sehat pikiran dan mampu menyatakan kehendaknya, menerangkan kehendak terakhirnya sebagai berikut:",
    tanpaPasal: true,
    tanpaDomisili: true,
    wasiat: true,
    lapor: true,
    pasal: [
      { jika: "cabut=Dicabut", isi: ["Saya mencabut dan menyatakan tidak berlaku lagi semua surat wasiat dan surat lain yang mempunyai kekuatan sebagai wasiat yang saya buat sebelum akta ini."] },
      { jika: "cabut=Tetap", isi: ["Wasiat yang pernah saya buat sebelum akta ini tetap berlaku sepanjang tidak bertentangan dengan akta ini."] },
      ["Saya hibah wasiatkan, bebas dari segala beban dan biaya kecuali ditentukan lain:", { baris: "legaat" }],
      ["Hibah wasiat tersebut diserahkan kepada para penerimanya setelah saya meninggal dunia, dan apabila penerima hibah wasiat meninggal lebih dahulu dari saya maka hibah wasiat untuknya gugur, kecuali saya tentukan lain."],
      { jika: "pelaksana", isi: ["Saya mengangkat sebagai pelaksana wasiat saya: {pelaksana}, dengan segala hak dan kekuasaan yang menurut undang-undang diberikan kepada pelaksana wasiat, terutama hak untuk menguasai dan mengurus harta peninggalan saya."] },
      { jika: "pesan", isi: ["Selanjutnya saya menghendaki:", { baris: "pesan" }] }
    ],
    subject: "Hibah wasiat",
    notes: ["Hibah wasiat tidak boleh melanggar bagian mutlak (legitieme portie) ahli waris legitimaris; bagi yang beragama Islam wasiat paling banyak 1/3 harta kecuali disetujui semua ahli waris (KHI Pasal 195).", "Saksi tidak boleh ahli waris/penerima hibah wasiat atau keluarganya sampai derajat keempat (Pasal 944 KUHPerdata). Akta dilaporkan ke Daftar Pusat Wasiat."],
    checklist: [...WASIAT_CEK, "Bukti Kepemilikan Barang yang Dihibahwasiatkan", "Identitas Penerima Hibah Wasiat"]
  },
  {
    key: "pencabutan_wasiat",
    title: "Akta Pencabutan Wasiat",
    judul: "PENCABUTAN WASIAT",
    category: "Waris",
    description: "Pencabutan seluruh atau sebagian wasiat yang pernah dibuat (Pasal 992 KUHPerdata).",
    pihak: [{ key: "pewasiat", sebut: "Pewasiat", label: "Pewasiat", max: 1, klien: true }],
    sections: [{ title: "Wasiat yang Dicabut", fields: [t("wasiatLama", "Wasiat yang dicabut", "akta Wasiat Nomor ... tanggal ..., dibuat di hadapan ..., Notaris di ..."), sel("lingkup", "Lingkup pencabutan", ["Seluruhnya", "Sebagian"]), ta("bagian", "Bagian yang dicabut (bila sebagian; satu per baris)")] }],
    pengantar: "{Penghadap}, yang menurut penglihatan saya, Notaris, sehat pikiran dan mampu menyatakan kehendaknya, menerangkan sebagai berikut:",
    tanpaPasal: true,
    tanpaDomisili: true,
    lapor: true,
    pasal: [
      { jika: "lingkup=Seluruhnya", isi: ["Saya dengan ini mencabut dan menyatakan tidak berlaku lagi untuk seluruhnya wasiat saya yang termuat dalam {wasiatLama}, sehingga wasiat tersebut tidak mempunyai kekuatan apa pun lagi."] },
      { jika: "lingkup=Sebagian", isi: ["Saya dengan ini mencabut dan menyatakan tidak berlaku lagi bagian-bagian berikut dari wasiat saya yang termuat dalam {wasiatLama}:", { baris: "bagian" }, "Ketentuan selebihnya dalam wasiat tersebut tetap berlaku."] },
      ["Dengan pencabutan ini, mengenai hal yang dicabut tersebut harta peninggalan saya akan diwaris menurut undang-undang, kecuali saya membuat wasiat baru."]
    ],
    subject: "Pencabutan {wasiatLama}",
    notes: ["Wasiat dapat dicabut dengan wasiat baru atau akta Notaris khusus (Pasal 992 KUHPerdata). Pencabutan dilaporkan ke Daftar Pusat Wasiat.", "Minta salinan wasiat lama atau Surat Keterangan Wasiat untuk memastikan nomor dan tanggalnya."],
    checklist: [...WASIAT_CEK, "Salinan Wasiat yang Dicabut / Surat Keterangan Wasiat"]
  },
  {
    key: "penyimpanan_wasiat",
    title: "Akta Penyimpanan Wasiat",
    judul: "PENYIMPANAN SURAT WASIAT",
    sub: "{jenis:up}",
    category: "Waris",
    description: "Akta penyimpanan (depot) surat wasiat olografis atau penjelasan (superskripsi) wasiat rahasia.",
    pihak: [{ key: "pewasiat", sebut: "Pewasiat", label: "Pewasiat", max: 1, klien: true }],
    sections: [{ title: "Surat Wasiat", fields: [sel("jenis", "Jenis", ["Wasiat Olografis", "Wasiat Rahasia (Tertutup)"]), sel("keadaan", "Diserahkan dalam keadaan", ["tertutup dan disegel", "terbuka"]), tgl("tanggalSurat", "Tanggal surat wasiat (bila diketahui)"), t("ciri", "Ciri sampul / segel (opsional)", "sampul cokelat bersegel lak merah dengan cap ...")] }],
    pengantar: "{Penghadap}, yang menurut penglihatan saya, Notaris, sehat pikiran, di hadapan saksi-saksi menerangkan sebagai berikut:",
    tanpaPasal: true,
    tanpaDomisili: true,
    lapor: true,
    pasal: [
      { jika: "jenis=Wasiat Olografis", isi: ["Bahwa surat yang diserahkannya kepada saya, Notaris, pada hari ini dalam keadaan {keadaan}<<, {ciri}>>, adalah surat wasiatnya yang seluruhnya ditulis, diberi tanggal<< {tanggalSurat:tgl}>>, dan ditandatangani dengan tangannya sendiri, dan ia menghendaki surat itu disimpan dalam protokol saya, Notaris."] },
      { jika: "jenis=Wasiat Rahasia", isi: ["Bahwa kertas yang diserahkannya kepada saya, Notaris, pada hari ini dalam keadaan tertutup dan disegel<<, {ciri}>>, memuat wasiatnya yang ditulis olehnya sendiri atau oleh orang lain dan telah ditandatangani olehnya, dan ia menghendaki surat itu disimpan dalam protokol saya, Notaris."] },
      ["Saya, Notaris, menerima surat wasiat tersebut untuk disimpan di antara minuta-minuta saya, dan akta penyimpanan ini dibuat serta ditandatangani oleh Pewasiat, saksi-saksi, dan saya, Notaris, sesuai ketentuan Kitab Undang-Undang Hukum Perdata."],
      ["Pewasiat berhak meminta kembali surat wasiat olografisnya sewaktu-waktu dengan akta autentik tersendiri, dan dengan pengembalian itu wasiat dianggap dicabut."]
    ],
    subject: "Penyimpanan {jenis}",
    notes: ["Wasiat olografis: Pasal 932–934 KUHPerdata (2 saksi); wasiat rahasia: Pasal 940 (4 saksi, akta superskripsi ditulis di atas kertas/sampulnya) [VERIFIKASI]. Template ini memakai 2 saksi; tambahkan saksi secara manual untuk wasiat rahasia.", "Akta penyimpanan dilaporkan ke Daftar Pusat Wasiat."],
    checklist: [...WASIAT_CEK, "Surat Wasiat yang Akan Disimpan"]
  },
  {
    key: "pengakuan_anak",
    title: "Akta Pengakuan Anak",
    judul: "PENGAKUAN ANAK",
    category: "Keluarga",
    description: "Pengakuan anak luar kawin oleh ayahnya dengan persetujuan ibu (Pasal 281 KUHPerdata; UU Adminduk).",
    pihak: [{ key: "ayah", sebut: "Pihak Pertama", label: "Pihak Pertama (ayah yang mengakui)", max: 1, klien: true }, { key: "ibu", sebut: "Pihak Kedua", label: "Pihak Kedua (ibu kandung anak)", max: 1 }],
    sections: [{ title: "Anak", fields: [t("namaAnak", "Nama anak"), t("lahir", "Tempat & tanggal lahir anak", "Bogor, 1 Januari 2022"), t("aktaLahir", "Akta kelahiran anak", "Kutipan Akta Kelahiran Nomor ... tanggal ..."), t("perkawinan", "Perkawinan orang tua (opsional)", "perkawinan menurut agama Islam pada tanggal ... di ...")] }],
    pasal: [
      ["Pihak Pertama dengan ini mengakui dengan sebenar-benarnya bahwa anak bernama **{namaAnak}**, lahir di {lahir}<<, sebagaimana tercatat dalam {aktaLahir}>>, yang dilahirkan oleh Pihak Kedua, adalah anak kandungnya."],
      ["Pihak Kedua selaku ibu kandung anak tersebut membenarkan keterangan Pihak Pertama dan menyetujui pengakuan ini<<; para pihak menerangkan telah melangsungkan {perkawinan}>>."],
      ["Dengan pengakuan ini timbul hubungan perdata antara anak tersebut dengan Pihak Pertama, dengan segala akibat hukumnya menurut peraturan perundang-undangan."],
      ["Para pihak akan melaporkan pengakuan ini kepada instansi pelaksana kependudukan dan pencatatan sipil untuk dicatat pada register dan kutipan akta kelahiran anak."]
    ],
    tanpaDomisili: true,
    subject: "Pengakuan anak {namaAnak}",
    notes: ["Pengakuan anak wajib dilaporkan ke Dukcapil paling lambat 30 hari sejak surat pengakuan disetujui ibu; pencatatan hanya bagi orang tua yang telah kawin sah menurut agama tetapi belum sah menurut hukum negara (Pasal 49 UU 24/2013) [VERIFIKASI].", "Pengakuan tidak boleh merugikan suami/istri dan anak sah dari perkawinan yang sudah ada (Pasal 285 KUHPerdata). Untuk yang beragama Islam, asal-usul anak ditetapkan Pengadilan Agama."],
    checklist: ["KTP & KK Ayah dan Ibu", "Akta Kelahiran Anak", "?Bukti Perkawinan Agama / Surat Keterangan Nikah", "?Hasil Tes DNA", "?Persetujuan Anak (bila sudah dewasa)"],
    duty: [{ title: "Ingatkan pelaporan pengakuan anak ke Dukcapil", days: 30, basis: "UU 24/2013 Pasal 49: 30 hari sejak pengakuan disetujui ibu [VERIFIKASI]" }]
  }
];
