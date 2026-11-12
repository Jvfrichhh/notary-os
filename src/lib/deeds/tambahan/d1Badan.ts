import type { Cfg } from "./types";
import { AHLI_WARIS, KUASA_RAPAT, PREMIS_BADAN, biaya, dataBadan, num, rp, sel, t, ta, tgl } from "./klausa";

const RAPAT_FIELDS = [
  tgl("tanggalRapat", "Tanggal rapat"),
  t("tempatRapat", "Tempat rapat", "kantor Perseroan, Jalan ..."),
  t("pimpinanRapat", "Pimpinan rapat", "Tuan ..., selaku Direktur Utama"),
  t("kehadiran", "Kehadiran", "pemegang saham yang mewakili 1.000 (seribu) saham atau 100% (seratus persen) dari seluruh saham dengan hak suara yang sah")
];
const LIKUIDATOR = [
  t("likuidator", "Likuidator (nama & identitas singkat)", "Tuan ..., lahir di ..., pemegang NIK ..., bertempat tinggal di ..."),
  tgl("efektif", "Pembubaran berlaku sejak")
];

export const D1_BADAN: Cfg[] = [
  {
    key: "ba_rups",
    title: "Akta Berita Acara Rapat Umum Pemegang Saham",
    judul: "BERITA ACARA RAPAT UMUM PEMEGANG SAHAM",
    sub: "PT {nama:up}",
    category: "Korporasi",
    description: "Berita acara RUPS yang dihadiri langsung oleh Notaris (akta relaas).",
    pihak: [{ key: "pemohon", sebut: "", label: "Pemohon (Direksi / pimpinan rapat yang meminta berita acara)", max: 6, klien: true }],
    sections: [
      { title: "Data Perseroan", fields: dataBadan("PT") },
      { title: "Rapat", fields: [sel("jenis", "Jenis rapat", ["Rapat Umum Pemegang Saham Luar Biasa", "Rapat Umum Pemegang Saham Tahunan"]), ...RAPAT_FIELDS, t("panggilan", "Pemanggilan rapat", "surat tercatat tanggal ... / seluruh pemegang saham hadir sehingga panggilan tidak disyaratkan"), ta("acara", "Mata acara rapat (satu per baris)"), ta("jalannya", "Jalannya rapat / tanya jawab (opsional)"), ta("keputusan", "Keputusan rapat (satu per baris)"), t("suara", "Cara pengambilan keputusan", "musyawarah untuk mufakat dengan suara bulat")] }
    ],
    premis: [
      PREMIS_BADAN("PT", "Perseroan"),
      "bahwa {PENGHADAP} meminta saya, Notaris, untuk hadir dan membuat berita acara dari segala sesuatu yang dibicarakan dan diputuskan dalam {jenis} Perseroan yang diadakan pada tanggal {tanggalRapat:tgl} bertempat di {tempatRapat};",
      "bahwa atas permintaan tersebut saya, Notaris, telah hadir dalam rapat tersebut."
    ],
    pengantar: "Selanjutnya saya, Notaris, mencatat hal-hal yang terjadi dalam rapat tersebut sebagai berikut:",
    tanpaPasal: true,
    tanpaDomisili: true,
    pasal: [
      ["Rapat dipimpin oleh {pimpinanRapat}, yang membuka rapat dan menyatakan bahwa rapat dihadiri oleh {kehadiran}, sebagaimana ternyata dari daftar hadir yang dilekatkan pada minuta akta ini.", "Pemanggilan rapat: {panggilan}. Dengan demikian Ketua Rapat menyatakan rapat ini sah dan berhak mengambil keputusan yang mengikat mengenai mata acara rapat."],
      ["Mata acara rapat adalah sebagai berikut:", { baris: "acara" }],
      { jika: "jalannya", isi: ["Dalam pembahasan mata acara tersebut dicatat hal-hal sebagai berikut:", { baris: "jalannya" }] },
      ["Setelah dibicarakan secukupnya, rapat dengan {suara} memutuskan:", { baris: "keputusan" }],
      ["Rapat memberi kuasa kepada Direksi Perseroan, dengan hak substitusi, untuk memohon persetujuan dan/atau menyampaikan pemberitahuan kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum sepanjang diperlukan, serta melakukan segala tindakan untuk melaksanakan keputusan rapat.", "Oleh karena tidak ada hal lain yang dibicarakan, Ketua Rapat menutup rapat."]
    ],
    subject: "Berita Acara RUPS PT {nama:up}",
    notes: [
      "Akta relaas: Notaris wajib hadir sendiri dalam rapat. Bila Notaris tidak hadir, gunakan Akta Pernyataan Keputusan Rapat (Perubahan PT).",
      "Cocokkan kuorum kehadiran dan kuorum keputusan dengan UUPT (Pasal 86, 88, 89) dan anggaran dasar; lekatkan daftar hadir dan bukti panggilan pada minuta.",
      "Berita acara tetap sah walaupun pemegang saham tidak ikut menandatangani; sebutkan alasannya bila ada yang tidak menandatangani."
    ],
    checklist: ["Akta Pendirian & Seluruh Akta Perubahan", "SK Kemenkumham Pendirian & Perubahan", "Daftar Pemegang Saham Terakhir", "Bukti Pemanggilan Rapat", "KTP Pemegang Saham, Direksi, Komisaris", "?Surat Kuasa Pemegang Saham yang Diwakili", "?Bahan/Laporan yang Dibahas dalam Rapat"],
    tasks: ["Verifikasi kuorum & panggilan rapat", "Hadiri rapat dan catat jalannya", "Siapkan draft berita acara", "Review draft oleh Notaris", "Persetujuan/pemberitahuan ke Menteri (AHU Online) bila diperlukan"],
    duty: [{ title: "Ajukan persetujuan / pemberitahuan atas keputusan RUPS (AHU Online) bila ada perubahan", days: 30, basis: "UUPT Pasal 21 & 94/111: 30 hari sejak akta (bila ada perubahan anggaran dasar/data)" }]
  },
  {
    key: "pembubaran_pt",
    title: "Akta Pernyataan Keputusan Rapat (Pembubaran PT)",
    judul: "PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM",
    sub: "TENTANG PEMBUBARAN PT {nama:up}",
    category: "Korporasi",
    description: "Pembubaran Perseroan Terbatas berdasarkan keputusan RUPS dan penunjukan likuidator.",
    pihak: [{ key: "penghadap", sebut: "", label: "Penghadap (Kuasa Rapat)", max: 1, klien: true }],
    sections: [{ title: "Data Perseroan", fields: dataBadan("PT") }, { title: "Rapat & Pembubaran", fields: [...RAPAT_FIELDS, ...LIKUIDATOR, ta("alasan", "Alasan pembubaran (opsional)")] }],
    premis: [
      PREMIS_BADAN("PT", "Perseroan"),
      "bahwa pada tanggal {tanggalRapat:tgl} bertempat di {tempatRapat} telah diadakan Rapat Umum Pemegang Saham Luar Biasa Perseroan, yang dipimpin oleh {pimpinanRapat} dan dihadiri oleh {kehadiran}, sehingga kuorum sebagaimana dimaksud dalam Pasal 89 Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas dan anggaran dasar Perseroan telah terpenuhi;",
      "bahwa risalah rapat tersebut dibuat di bawah tangan dan bersama daftar hadir rapat dilekatkan pada minuta akta ini;",
      "bahwa {PENGHADAP} diberi kuasa untuk menyatakan keputusan rapat tersebut dalam akta notaris."
    ],
    pengantar: "Selanjutnya {PENGHADAP} dengan bertindak sebagaimana tersebut di atas menyatakan bahwa rapat telah mengambil keputusan sebagai berikut:",
    pasal: [
      ["Menyetujui pembubaran Perseroan terhitung sejak tanggal {efektif:tgl}<<, dengan alasan {alasan}>>, dan sejak saat itu Perseroan berada dalam likuidasi dan di belakang nama Perseroan dicantumkan kata \"dalam likuidasi\"."],
      ["Menunjuk dan mengangkat sebagai likuidator Perseroan: {likuidator}, dengan wewenang dan kewajiban melakukan pemberesan harta kekayaan Perseroan sebagaimana diatur dalam Pasal 147 sampai dengan Pasal 152 Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas."],
      ["Likuidator wajib memberitahukan pembubaran Perseroan kepada semua kreditor dengan mengumumkannya dalam Surat Kabar dan Berita Negara Republik Indonesia serta kepada Menteri, melakukan pemberesan, dan mempertanggungjawabkan hasil likuidasi kepada Rapat Umum Pemegang Saham."],
      ["Memberi kuasa kepada likuidator dan/atau {PENGHADAP}, dengan hak substitusi, untuk menyatakan keputusan ini dalam akta notaris, menyampaikan pemberitahuan kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum, serta melakukan segala tindakan yang diperlukan."]
    ],
    subject: "Pembubaran PT {nama:up}",
    notes: [
      "Kuorum pembubaran: dihadiri paling sedikit 3/4 dari seluruh saham dengan hak suara dan disetujui paling sedikit 3/4 dari suara yang dikeluarkan (Pasal 89 UUPT), kecuali anggaran dasar menentukan lebih besar.",
      "Dalam 30 hari sejak pembubaran likuidator wajib mengumumkan dalam Surat Kabar dan BNRI serta memberitahukan kepada Menteri (Pasal 147 UUPT). Setelah pemberesan selesai dibuat akta tersendiri untuk pertanggungjawaban likuidator dan pemberitahuan hasil akhir likuidasi."
    ],
    checklist: ["Akta Pendirian & Seluruh Akta Perubahan", "SK Kemenkumham Pendirian & Perubahan", "Risalah RUPS Pembubaran & Daftar Hadir", "KTP & NPWP Penghadap dan Likuidator", "NPWP & NIB Perseroan", "?Laporan Keuangan Terakhir"],
    tasks: ["Verifikasi kelengkapan dokumen", "Siapkan draft akta", "Review draft oleh Notaris", "Jadwalkan penandatanganan", "Pemberitahuan pembubaran ke Menteri (AHU Online)", "Pastikan pengumuman koran & BNRI oleh likuidator"],
    duty: [{ title: "Beritahukan pembubaran PT kepada Menteri dan umumkan di Surat Kabar & BNRI", days: 30, basis: "UUPT Pasal 147: 30 hari sejak tanggal pembubaran" }]
  },
  {
    key: "hibah_saham",
    title: "Akta Hibah Saham",
    judul: "HIBAH SAHAM",
    sub: "PT {namaPt:up}",
    category: "Korporasi",
    description: "Pemindahan hak atas saham dengan cara hibah.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Hibah", label: "Pemberi Hibah", pasangan: true }, { key: "penerima", sebut: "Penerima Hibah", label: "Penerima Hibah", klien: true }],
    sections: [{ title: "Saham", fields: [t("namaPt", "Nama PT (tanpa 'PT')", "SINAR MAJU SEJAHTERA", false), t("kedudukanPt", "Kedudukan PT", "Kota Bogor", false), num("jumlah", "Jumlah saham yang dihibahkan"), rp("nominal", "Nilai nominal per saham (Rp)"), t("persetujuan", "Persetujuan RUPS / organ perseroan", "keputusan Rapat Umum Pemegang Saham tanggal ...")] }],
    premis: [
      "bahwa Pemberi Hibah adalah pemilik dan pemegang yang sah dari {jumlah:angka} saham dalam PT {namaPt:up}, berkedudukan di {kedudukanPt} (selanjutnya disebut \"Perseroan\"), masing-masing saham bernilai nominal {nominal:rp};",
      "<<bahwa pemindahan hak atas saham ini telah memperoleh persetujuan sebagaimana ternyata dari {persetujuan};>>",
      "bahwa Pemberi Hibah bermaksud menghibahkan saham-saham tersebut kepada Penerima Hibah, dan Penerima Hibah menerangkan menerima hibah tersebut."
    ],
    pasal: [
      ["Pemberi Hibah dengan ini menghibahkan dan menyerahkan kepada Penerima Hibah, yang dengan ini menerima hibah dan penyerahan dari Pemberi Hibah, {jumlah:angka} saham dalam Perseroan tersebut, berikut segala hak yang melekat padanya termasuk dividen yang belum dibayarkan."],
      ["Hibah ini dilakukan dengan cuma-cuma dan tanpa syarat, dan terhitung sejak hari ini saham-saham tersebut menjadi milik Penerima Hibah dengan segala keuntungan dan kerugiannya."],
      ["Pemberi Hibah menjamin bahwa saham-saham tersebut benar miliknya, telah disetor penuh, tidak digadaikan atau dijaminkan dengan cara apa pun, tidak dalam sitaan, dan tidak dalam sengketa."],
      ["Para pihak memberi kuasa kepada Direksi Perseroan untuk mencatat pemindahan hak atas saham ini dalam Daftar Pemegang Saham dan memberitahukannya kepada Menteri Hukum Republik Indonesia."],
      [biaya("Penerima Hibah")]
    ],
    subject: "Hibah {jumlah} saham PT {namaPt:up}",
    notes: ["Periksa ketentuan anggaran dasar mengenai pemindahan hak atas saham (hak menawarkan lebih dahulu, persetujuan organ) dan Pasal 55-59 UUPT.", "Hibah kepada bukan keluarga sedarah garis lurus satu derajat dapat menjadi objek pajak penghasilan [VERIFIKASI]. Pemberi hibah yang kawin memerlukan persetujuan pasangan.", "Direksi wajib memberitahukan perubahan susunan pemegang saham kepada Menteri paling lambat 30 hari sejak pencatatan (Pasal 56 UUPT)."],
    checklist: ["KTP & NPWP Pemberi dan Penerima Hibah", "KTP Pasangan Pemberi Hibah (persetujuan)", "Akta Pendirian & Perubahan Terakhir + SK", "Daftar Pemegang Saham", "?Persetujuan RUPS / Surat Penolakan Hak Membeli Lebih Dahulu"],
    duty: [{ title: "Sampaikan pemberitahuan perubahan susunan pemegang saham (AHU Online)", days: 30, basis: "UUPT Pasal 56: 30 hari sejak pencatatan" }]
  },
  {
    key: "gadai_saham",
    title: "Akta Gadai Saham",
    judul: "GADAI SAHAM",
    sub: "PT {namaPt:up}",
    category: "Jaminan",
    description: "Pemberian jaminan gadai atas saham untuk menjamin pelunasan utang.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Gadai", label: "Pemberi Gadai (pemilik saham)", pasangan: true }, { key: "penerima", sebut: "Penerima Gadai", label: "Penerima Gadai (kreditor)", klien: true }],
    sections: [{ title: "Utang & Saham", fields: [t("perjanjianPokok", "Perjanjian utang yang dijamin", "Perjanjian Kredit Nomor ... tanggal ..."), t("debitur", "Debitor (bila bukan Pemberi Gadai)", "PT ..."), rp("nilaiUtang", "Jumlah utang pokok (Rp)"), t("namaPt", "Nama PT (tanpa 'PT')", undefined, false), t("kedudukanPt", "Kedudukan PT", "Kota Bogor", false), num("jumlah", "Jumlah saham yang digadaikan"), rp("nominal", "Nilai nominal per saham (Rp)")] }],
    premis: [
      "bahwa berdasarkan {perjanjianPokok}, <<{debitur} selaku debitor>> mempunyai utang kepada Penerima Gadai dengan jumlah pokok sebesar {nilaiUtang:rp} (selanjutnya disebut \"Utang\");",
      "bahwa untuk menjamin pelunasan Utang tersebut Pemberi Gadai bersedia menggadaikan saham miliknya kepada Penerima Gadai."
    ],
    pasal: [
      ["Pemberi Gadai dengan ini menggadaikan kepada Penerima Gadai, yang dengan ini menerima gadai, {jumlah:angka} saham dalam PT {namaPt:up}, berkedudukan di {kedudukanPt}, masing-masing bernilai nominal {nominal:rp} (selanjutnya disebut \"Saham\"), berikut segala hak yang melekat padanya."],
      ["Hak suara atas Saham tetap berada pada Pemberi Gadai. Dividen atas Saham menjadi hak Pemberi Gadai selama debitor tidak lalai, kecuali ditentukan lain secara tertulis oleh para pihak."],
      ["Pemberi Gadai menjamin bahwa Saham benar miliknya, telah disetor penuh, tidak dijaminkan kepada pihak lain, tidak dalam sitaan dan tidak dalam sengketa, serta berjanji tidak akan mengalihkan atau membebani Saham selama gadai ini berlangsung."],
      ["Apabila debitor lalai memenuhi kewajibannya, Penerima Gadai berhak menjual Saham di muka umum atau dengan cara lain yang diperkenankan undang-undang dan mengambil pelunasan piutangnya dari hasil penjualan tersebut; kelebihannya dikembalikan kepada Pemberi Gadai."],
      ["Gadai ini wajib dicatat dalam Daftar Pemegang Saham dan Daftar Khusus Perseroan; untuk itu Pemberi Gadai memberi kuasa kepada Penerima Gadai untuk memberitahukannya kepada Direksi Perseroan.", "Gadai ini berakhir dengan sendirinya setelah Utang dibayar lunas, dan Penerima Gadai wajib memberitahukan penghapusan gadai kepada Perseroan."],
      [biaya("Pemberi Gadai")]
    ],
    subject: "Gadai {jumlah} saham PT {namaPt:up}",
    notes: ["Gadai saham wajib dicatat dalam Daftar Pemegang Saham dan Daftar Khusus (Pasal 60 UUPT); hak suara tetap pada pemegang saham.", "Periksa anggaran dasar perseroan apakah saham boleh digadaikan dan apakah perlu persetujuan organ."],
    checklist: ["KTP & NPWP Pemberi dan Penerima Gadai", "KTP Pasangan Pemberi Gadai (persetujuan)", "Perjanjian Kredit / Utang yang Dijamin", "Akta Pendirian & Perubahan Terakhir + SK", "Daftar Pemegang Saham", "?Persetujuan Organ Perseroan"]
  },
  {
    key: "saham_waris",
    title: "Akta Pemindahan Hak atas Saham karena Pewarisan",
    judul: "PEMINDAHAN HAK ATAS SAHAM",
    sub: "KARENA PEWARISAN",
    category: "Korporasi",
    description: "Pernyataan para ahli waris mengenai peralihan dan pembagian saham milik pewaris.",
    pihak: [{ key: "ahliWaris", sebut: "", label: "Para Ahli Waris", max: 10, klien: true }],
    sections: [{ title: "Pewaris & Saham", fields: [t("pewaris", "Nama pewaris", "almarhum Tuan ..."), tgl("tanggalMeninggal", "Tanggal meninggal"), t("keteranganWaris", "Bukti kedudukan ahli waris", "Akta Keterangan Hak Waris Nomor ... tanggal ..., dibuat di hadapan ..."), t("namaPt", "Nama PT (tanpa 'PT')", undefined, false), t("kedudukanPt", "Kedudukan PT", "Kota Bogor", false), num("jumlah", "Jumlah saham milik pewaris"), rp("nominal", "Nilai nominal per saham (Rp)"), ta("pembagian", "Pembagian saham kepada ahli waris (satu per baris)", "Nyonya A sebanyak 500 (lima ratus) saham")] }],
    premis: [
      "bahwa {pewaris} telah meninggal dunia pada tanggal {tanggalMeninggal:tgl}, dan {PENGHADAP} adalah seluruh ahli warisnya sebagaimana ternyata dari {keteranganWaris};",
      "bahwa semasa hidupnya pewaris adalah pemilik dan pemegang {jumlah:angka} saham dalam PT {namaPt:up}, berkedudukan di {kedudukanPt}, masing-masing bernilai nominal {nominal:rp}."
    ],
    pasal: [
      ["Dengan meninggalnya pewaris, hak atas saham-saham tersebut demi hukum beralih kepada {PENGHADAP} selaku para ahli warisnya."],
      ["{Penghadap} sepakat membagi saham-saham tersebut sehingga menjadi milik masing-masing sebagai berikut:", { baris: "pembagian" }],
      ["{Penghadap} menjamin bahwa tidak ada ahli waris lain selain mereka dan bahwa saham-saham tersebut tidak dijaminkan, tidak dalam sitaan, dan tidak dalam sengketa, serta membebaskan Perseroan dan Notaris dari segala tuntutan mengenai hal tersebut."],
      ["{Penghadap} memberi kuasa kepada Direksi Perseroan untuk mencatat peralihan hak ini dalam Daftar Pemegang Saham dan memberitahukannya kepada Menteri Hukum Republik Indonesia."]
    ],
    subject: "Peralihan saham PT {namaPt:up} karena waris",
    notes: ["Peralihan karena pewarisan terjadi demi hukum, tetapi tetap harus dicatat dalam Daftar Pemegang Saham dan diberitahukan kepada Menteri (Pasal 56-57 UUPT).", "Pastikan seluruh ahli waris hadir atau diwakili; lekatkan keterangan hak waris dan akta kematian pada minuta."],
    checklist: ["KTP & KK Seluruh Ahli Waris", "Akta Kematian Pewaris", "Akta / Surat Keterangan Hak Waris", "Akta Pendirian & Perubahan Terakhir + SK", "Daftar Pemegang Saham"],
    duty: [{ title: "Sampaikan pemberitahuan perubahan susunan pemegang saham (AHU Online)", days: 30, basis: "UUPT Pasal 56: 30 hari sejak pencatatan" }]
  },
  {
    key: "penggabungan",
    title: "Akta Penggabungan (Merger)",
    judul: "PENGGABUNGAN",
    sub: "PT {menggabung:up} KE DALAM PT {menerima:up}",
    category: "Korporasi",
    description: "Penggabungan satu perseroan ke dalam perseroan lain yang menerima penggabungan.",
    pihak: [{ key: "pihak1", sebut: "Perseroan yang Menggabungkan Diri", label: "Wakil perseroan yang menggabungkan diri", max: 3 }, { key: "pihak2", sebut: "Perseroan yang Menerima Penggabungan", label: "Wakil perseroan yang menerima penggabungan", max: 3, klien: true }],
    sections: [{ title: "Penggabungan", fields: [t("menggabung", "Nama PT yang menggabungkan diri (tanpa 'PT')", undefined, false), t("menerima", "Nama PT yang menerima (tanpa 'PT')", undefined, false), t("rups1", "Persetujuan RUPS perseroan yang menggabungkan diri", "akta Nomor ... tanggal ..."), t("rups2", "Persetujuan RUPS perseroan yang menerima", "akta Nomor ... tanggal ..."), t("rancangan", "Rancangan Penggabungan", "Rancangan Penggabungan tanggal ... yang telah diumumkan dalam Surat Kabar ... tanggal ..."), tgl("efektif", "Tanggal efektif penggabungan"), t("konversi", "Konversi saham", "setiap 1 (satu) saham dalam Perseroan yang Menggabungkan Diri ditukar dengan 2 (dua) saham baru"), ta("ketentuanLain", "Ketentuan lain (satu per baris; opsional)")] }],
    premis: [
      "bahwa Rapat Umum Pemegang Saham PT {menggabung:up} telah menyetujui penggabungan sebagaimana ternyata dari {rups1}, dan Rapat Umum Pemegang Saham PT {menerima:up} telah menyetujuinya sebagaimana ternyata dari {rups2};",
      "bahwa penggabungan ini dilakukan berdasarkan {rancangan}, dan tidak ada keberatan kreditor yang belum diselesaikan."
    ],
    pasal: [
      ["PT {menggabung:up} dengan ini menggabungkan diri ke dalam PT {menerima:up}, yang dengan ini menerima penggabungan tersebut, terhitung sejak tanggal {efektif:tgl} atau tanggal lain yang ditentukan peraturan perundang-undangan (selanjutnya disebut \"Tanggal Efektif\")."],
      ["Pada Tanggal Efektif seluruh aktiva dan pasiva Perseroan yang Menggabungkan Diri beralih karena hukum kepada Perseroan yang Menerima Penggabungan, dan Perseroan yang Menggabungkan Diri berakhir karena hukum tanpa dilakukan likuidasi terlebih dahulu."],
      ["Pemegang saham Perseroan yang Menggabungkan Diri karena hukum menjadi pemegang saham Perseroan yang Menerima Penggabungan dengan ketentuan: {konversi}."],
      ["Seluruh karyawan Perseroan yang Menggabungkan Diri beralih menjadi karyawan Perseroan yang Menerima Penggabungan dengan memperhatikan ketentuan peraturan perundang-undangan di bidang ketenagakerjaan."],
      { jika: "ketentuanLain", isi: ["Para pihak selanjutnya menyetujui ketentuan sebagai berikut:", { baris: "ketentuanLain" }] },
      ["Direksi Perseroan yang Menerima Penggabungan diberi kuasa untuk mengajukan permohonan persetujuan dan/atau pemberitahuan kepada Menteri Hukum Republik Indonesia serta mengumumkan hasil penggabungan sesuai peraturan perundang-undangan."]
    ],
    subject: "Penggabungan PT {menggabung:up} ke dalam PT {menerima:up}",
    notes: ["Penggabungan wajib melalui tahapan UUPT Pasal 122-133 dan PP 27/1998: rancangan penggabungan, pengumuman koran dan kepada karyawan paling lambat 30 hari sebelum panggilan RUPS, penyelesaian keberatan kreditor, dan persetujuan RUPS dengan kuorum Pasal 89 [VERIFIKASI].", "Periksa kewajiban notifikasi KPPU dan izin sektor (perbankan, asuransi, dan lain-lain) bila berlaku.", "Akta ini kerangka umum; untuk transaksi nyata lekatkan rancangan penggabungan dan sesuaikan seluruh ketentuannya."],
    checklist: ["Akta Pendirian & Perubahan Kedua Perseroan + SK", "Rancangan Penggabungan yang Disetujui Dewan Komisaris", "Bukti Pengumuman Koran & Pemberitahuan Karyawan", "Akta/Risalah RUPS Kedua Perseroan", "Laporan Keuangan Kedua Perseroan", "?Persetujuan Instansi Terkait / Notifikasi KPPU"],
    duty: [{ title: "Ajukan persetujuan/pemberitahuan penggabungan ke Menteri (AHU Online)", days: 30, basis: "UUPT Pasal 21 & 129: paling lambat 30 hari sejak akta" }]
  },
  {
    key: "pengambilalihan",
    title: "Akta Pengambilalihan (Akuisisi) Saham",
    judul: "PENGAMBILALIHAN",
    sub: "SAHAM PT {namaPt:up}",
    category: "Korporasi",
    description: "Pengambilalihan saham yang mengakibatkan beralihnya pengendalian perseroan.",
    pihak: [{ key: "penjual", sebut: "Pihak Pertama", label: "Pihak Pertama (pemegang saham yang mengalihkan)", pasangan: true }, { key: "pembeli", sebut: "Pihak Kedua", label: "Pihak Kedua (pihak yang mengambil alih)", klien: true }],
    sections: [{ title: "Saham & Harga", fields: [t("namaPt", "Nama PT (tanpa 'PT')", undefined, false), t("kedudukanPt", "Kedudukan PT", "Kota Bogor", false), num("jumlah", "Jumlah saham yang diambil alih"), t("persen", "Persentase dari seluruh saham", "70% (tujuh puluh persen)", false), rp("nominal", "Nilai nominal per saham (Rp)"), rp("harga", "Harga pengambilalihan seluruhnya (Rp)"), t("rups", "Persetujuan RUPS", "akta Pernyataan Keputusan Rapat Nomor ... tanggal ..."), t("pengumuman", "Pengumuman rencana pengambilalihan", "Surat Kabar ... tanggal ...")] }],
    premis: [
      "bahwa Pihak Pertama adalah pemilik {jumlah:angka} saham atau {persen} dari seluruh saham yang telah dikeluarkan dalam PT {namaPt:up}, berkedudukan di {kedudukanPt} (selanjutnya disebut \"Perseroan\");",
      "bahwa pengambilalihan ini telah disetujui Rapat Umum Pemegang Saham Perseroan sebagaimana ternyata dari {rups}<<, dan rencananya telah diumumkan dalam {pengumuman}>>;",
      "bahwa dengan pengambilalihan ini pengendalian atas Perseroan beralih kepada Pihak Kedua."
    ],
    pasal: [
      ["Pihak Pertama dengan ini menjual dan menyerahkan kepada Pihak Kedua, yang dengan ini membeli dan menerima penyerahan, {jumlah:angka} saham dalam Perseroan, masing-masing bernilai nominal {nominal:rp}, berikut segala hak yang melekat padanya."],
      ["Pengambilalihan ini dilakukan dengan harga seluruhnya sebesar {harga:rp}, yang telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama, dan untuk penerimaannya akta ini berlaku pula sebagai kwitansi yang sah."],
      ["Pihak Pertama menjamin bahwa saham-saham tersebut benar miliknya, telah disetor penuh, bebas dari gadai, jaminan, sitaan, dan sengketa, serta bahwa keterangan mengenai keadaan Perseroan yang diberikan kepada Pihak Kedua adalah benar."],
      ["Terhitung sejak hari ini segala hak dan kewajiban atas saham-saham tersebut beralih kepada Pihak Kedua. Para pihak memberi kuasa kepada Direksi Perseroan untuk mencatat pemindahan hak ini dalam Daftar Pemegang Saham dan menyampaikan pemberitahuan kepada Menteri Hukum Republik Indonesia."],
      [biaya("Pihak Kedua")]
    ],
    subject: "Pengambilalihan {jumlah} saham PT {namaPt:up}",
    notes: ["Pengambilalihan yang mengakibatkan beralihnya pengendalian tunduk pada Pasal 125-133 UUPT: pengumuman rencana dalam Surat Kabar dan kepada karyawan paling lambat 30 hari sebelum panggilan RUPS, penyelesaian keberatan kreditor, dan persetujuan RUPS [VERIFIKASI].", "Periksa kewajiban notifikasi KPPU, hak menawarkan lebih dahulu dalam anggaran dasar, dan pajak penghasilan atas pengalihan saham."],
    checklist: ["KTP & NPWP Para Pihak", "KTP Pasangan Pihak Pertama (persetujuan)", "Akta Pendirian & Perubahan Terakhir + SK", "Akta/Risalah RUPS Persetujuan Pengambilalihan", "Bukti Pengumuman Koran & Pemberitahuan Karyawan", "Daftar Pemegang Saham", "?Laporan Keuangan / Hasil Uji Tuntas"],
    duty: [{ title: "Sampaikan pemberitahuan pengambilalihan & perubahan pemegang saham (AHU Online)", days: 30, basis: "UUPT Pasal 131: 30 hari sejak akta pengambilalihan" }]
  },
  {
    key: "perubahan_firma",
    title: "Akta Perubahan Firma",
    judul: "MASUK DAN KELUAR SEBAGAI SEKUTU SERTA PERUBAHAN ANGGARAN DASAR",
    sub: "PERSEKUTUAN FIRMA {nama:up}",
    category: "Korporasi",
    description: "Masuk-keluarnya sekutu dan perubahan nama, kedudukan, kegiatan usaha, atau modal Firma.",
    pihak: [{ key: "sekutu", sebut: "", label: "Seluruh sekutu (lama dan baru) yang menghadap", max: 10, klien: true }],
    sections: [{ title: "Data Firma", fields: dataBadan("Firma") }, { title: "Perubahan", fields: [ta("keluar", "Sekutu yang keluar (satu per baris; opsional)", "Tuan A, yang menyerahkan bagiannya kepada Tuan C"), ta("masuk", "Sekutu yang masuk (satu per baris; opsional)", "Tuan C, dengan pemasukan modal Rp50.000.000,00"), ta("susunan", "Susunan sekutu setelah perubahan (satu per baris)"), ta("perubahanAd", "Perubahan anggaran dasar (satu per baris; opsional)", "Nama Firma menjadi ...")] }],
    premis: [PREMIS_BADAN("Persekutuan Firma", "Firma"), "bahwa para sekutu Firma telah sepakat mengadakan perubahan sebagaimana diuraikan di bawah ini."],
    pasal: [
      { jika: "keluar", isi: ["Terhitung sejak tanggal akta ini keluar dari Firma:", { baris: "keluar" }, "Sekutu yang keluar menyatakan telah menerima segala haknya dari Firma, dan para sekutu lainnya memberikan pembebasan dan pelunasan (acquit et decharge) kepadanya atas tindakannya selama menjadi sekutu sepanjang tercermin dalam pembukuan Firma."] },
      { jika: "masuk", isi: ["Terhitung sejak tanggal akta ini masuk ke dalam Firma dan diterima oleh para sekutu lainnya:", { baris: "masuk" }] },
      ["Dengan demikian susunan sekutu Firma menjadi sebagai berikut:", { baris: "susunan" }, "Setiap sekutu berhak bertindak untuk dan atas nama Firma serta bertanggung jawab secara tanggung renteng untuk seluruh perikatan Firma."],
      { jika: "perubahanAd", isi: ["Mengubah ketentuan anggaran dasar Firma sebagai berikut:", { baris: "perubahanAd" }] },
      ["Ketentuan anggaran dasar Firma selebihnya yang tidak diubah dengan akta ini tetap berlaku.", "{Penghadap} memberi kuasa kepada salah seorang sekutu dan/atau pegawai kantor Notaris, dengan hak substitusi, untuk mendaftarkan perubahan ini pada Sistem Administrasi Badan Usaha."]
    ],
    subject: "Perubahan Firma {nama:up}",
    notes: ["Seluruh sekutu lama dan baru harus hadir atau diwakili dengan kuasa yang sah.", "Sekutu yang keluar tetap bertanggung jawab kepada pihak ketiga atas perikatan Firma sebelum ia keluar.", "Daftarkan perubahan melalui SABU paling lambat 30 hari sejak akta [VERIFIKASI: Permenkumham 17/2018]."],
    checklist: ["Akta Pendirian & Seluruh Akta Perubahan Firma", "Surat Keterangan Terdaftar (AHU) / Pendaftaran Pengadilan", "KTP & NPWP Seluruh Sekutu (lama dan baru)", "NPWP & NIB Firma", "?KTP Pasangan Sekutu yang Keluar"],
    duty: [{ title: "Daftarkan perubahan Firma di Sistem Administrasi Badan Usaha (AHU Online)", days: 30, basis: "Permenkumham 17/2018: 30 hari sejak akta perubahan ditandatangani" }]
  },
  {
    key: "pembubaran_cv",
    title: "Akta Pembubaran CV / Firma",
    judul: "PEMBUBARAN",
    sub: "{jenis:up} {nama:up}",
    category: "Korporasi",
    description: "Pembubaran Persekutuan Komanditer atau Firma dan penunjukan pemberes.",
    pihak: [{ key: "sekutu", sebut: "", label: "Seluruh sekutu", max: 10, klien: true }],
    sections: [{ title: "Data Persekutuan", fields: [sel("jenis", "Jenis persekutuan", ["Persekutuan Komanditer", "Persekutuan Firma"]), ...dataBadan("persekutuan")] }, { title: "Pembubaran", fields: [...LIKUIDATOR, ta("alasan", "Alasan pembubaran (opsional)"), ta("pembagian", "Pembagian sisa kekayaan (opsional; satu per baris)")] }],
    premis: [PREMIS_BADAN("Persekutuan", "Persekutuan"), "bahwa {PENGHADAP} adalah seluruh sekutu dalam Persekutuan dan telah sepakat untuk membubarkan Persekutuan."],
    pasal: [
      ["{Penghadap} dengan ini membubarkan Persekutuan terhitung sejak tanggal {efektif:tgl}<<, dengan alasan {alasan}>>."],
      ["Untuk melakukan pemberesan ditunjuk {likuidator} selaku pemberes (likuidator), yang berwenang menagih piutang, membayar utang, menjual harta kekayaan Persekutuan, dan melakukan segala tindakan pemberesan lainnya, serta wajib memberikan perhitungan dan pertanggungjawaban kepada para sekutu."],
      ["Sisa hasil pemberesan setelah seluruh utang Persekutuan dilunasi dibagikan kepada para sekutu menurut perbandingan pemasukan masing-masing, kecuali ditentukan lain di bawah ini.", { jika: "pembagian", maka: [{ baris: "pembagian" }] }],
      ["Para sekutu tetap bertanggung jawab kepada pihak ketiga atas perikatan Persekutuan yang timbul sebelum pembubaran ini, sesuai kedudukan masing-masing dalam Persekutuan."],
      ["{Penghadap} memberi kuasa kepada pemberes dan/atau pegawai kantor Notaris, dengan hak substitusi, untuk mendaftarkan pembubaran ini pada Sistem Administrasi Badan Usaha serta mengurus pencabutan NPWP dan perizinan Persekutuan."]
    ],
    subject: "Pembubaran {jenis} {nama:up}",
    notes: ["Pembubaran didaftarkan melalui SABU dan diumumkan; periksa kewajiban pajak (pencabutan NPWP/PKP) dan pencabutan NIB.", "Pembubaran tidak menghapus tanggung jawab sekutu terhadap kreditor Persekutuan."],
    checklist: ["Akta Pendirian & Seluruh Akta Perubahan", "Surat Keterangan Terdaftar (AHU)", "KTP & NPWP Seluruh Sekutu", "NPWP & NIB Persekutuan", "?Neraca / Laporan Keuangan Terakhir"],
    duty: [{ title: "Daftarkan pembubaran di Sistem Administrasi Badan Usaha (AHU Online)", days: 30, basis: "Permenkumham 17/2018: 30 hari sejak akta pembubaran" }]
  },
  {
    key: "persekutuan_perdata",
    title: "Akta Pendirian Persekutuan Perdata",
    judul: "PENDIRIAN PERSEKUTUAN PERDATA",
    sub: "{nama:up}",
    category: "Korporasi",
    description: "Pendirian Persekutuan Perdata (Maatschap), mis. kantor konsultan, dokter, akuntan, advokat.",
    pihak: [{ key: "sekutu", sebut: "", label: "Para sekutu pendiri", min: 2, max: 10, klien: true }],
    sections: [{ title: "Data Persekutuan", fields: [t("nama", "Nama persekutuan", "KANTOR KONSULTAN ...", false), { kind: "text", key: "kedudukan", label: "Tempat kedudukan", default: "Kota Bogor" }, t("alamat", "Alamat kantor"), t("bidang", "Bidang kegiatan / profesi", "jasa konsultasi hukum"), ta("pemasukan", "Pemasukan tiap sekutu (satu per baris)", "Tuan A: uang sebesar Rp50.000.000,00 dan keahlian"), t("pengurus", "Sekutu pengurus", "Tuan A selaku Managing Partner"), t("laba", "Pembagian laba dan rugi", "menurut perbandingan pemasukan masing-masing")] }],
    pengantar: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan dengan ini mendirikan suatu Persekutuan Perdata (Maatschap) dengan ketentuan sebagai berikut:",
    pasal: [
      [{ j: "NAMA DAN TEMPAT KEDUDUKAN" }, "Persekutuan ini bernama **{nama:up}**, berkedudukan di {kedudukan}<<, beralamat di {alamat}>>, dan didirikan untuk jangka waktu yang tidak ditentukan lamanya terhitung sejak tanggal akta ini."],
      [{ j: "MAKSUD DAN TUJUAN" }, "Maksud dan tujuan Persekutuan ialah menjalankan kegiatan {bidang} untuk kepentingan bersama para sekutu."],
      [{ j: "PEMASUKAN" }, "Para sekutu memasukkan ke dalam Persekutuan:", { baris: "pemasukan" }],
      [{ j: "PENGURUSAN" }, "Persekutuan diurus oleh {pengurus}. Tindakan mengikat Persekutuan sebagai penjamin, meminjam uang, dan mengalihkan atau menjaminkan harta Persekutuan memerlukan persetujuan seluruh sekutu.", "Setiap sekutu bertanggung jawab secara pribadi atas perikatan yang dibuatnya; sekutu lain hanya terikat apabila memberi kuasa atau perikatan itu nyata-nyata menguntungkan Persekutuan."],
      [{ j: "LABA DAN RUGI" }, "Laba dan rugi Persekutuan dibagi dan dipikul oleh para sekutu {laba}. Tahun buku Persekutuan berjalan dari tanggal 1 Januari sampai dengan tanggal 31 Desember."],
      [{ j: "KELUAR DAN MASUKNYA SEKUTU" }, "Sekutu hanya dapat mengundurkan diri dengan pemberitahuan tertulis paling lambat 3 (tiga) bulan sebelumnya. Sekutu baru hanya dapat diterima dengan persetujuan seluruh sekutu. Persekutuan tidak berakhir karena seorang sekutu meninggal dunia atau mengundurkan diri, dan dilanjutkan oleh para sekutu lainnya."],
      [{ j: "PEMBUBARAN" }, "Persekutuan dapat dibubarkan atas kesepakatan seluruh sekutu; pemberesan dilakukan oleh sekutu pengurus kecuali para sekutu menentukan lain."]
    ],
    subject: "Persekutuan Perdata {nama:up}",
    notes: ["Persekutuan Perdata bukan badan hukum; para sekutu bertanggung jawab pribadi (Pasal 1618-1652 KUHPerdata).", "Daftarkan pendirian melalui SABU paling lambat 60 hari sejak akta [VERIFIKASI: Permenkumham 17/2018]. Untuk profesi tertentu periksa izin praktik masing-masing sekutu."],
    checklist: ["KTP & NPWP Seluruh Sekutu", "Usulan Nama Persekutuan", "Alamat Lengkap Kedudukan", "?Izin Praktik / Sertifikat Profesi Para Sekutu", "Rincian Pemasukan & Pembagian Laba"],
    duty: [{ title: "Daftarkan pendirian Persekutuan Perdata di Sistem Administrasi Badan Usaha (AHU Online)", days: 60, basis: "Permenkumham 17/2018: 60 hari sejak akta ditandatangani" }]
  },
  {
    key: "pendirian_perkumpulan",
    title: "Akta Pendirian Perkumpulan",
    judul: "PENDIRIAN PERKUMPULAN",
    sub: "{nama:up}",
    category: "Korporasi",
    description: "Pendirian Perkumpulan berbadan hukum (termasuk organisasi kemasyarakatan berbasis anggota) beserta pengurus pertamanya.",
    pihak: [{ key: "pendiri", sebut: "", label: "Para pendiri", min: 3, max: 15, klien: true }],
    sections: [{ title: "Data Perkumpulan", fields: [t("nama", "Nama Perkumpulan (tanpa kata 'Perkumpulan')", "LEMBAGA ...", false), { kind: "text", key: "kedudukan", label: "Tempat kedudukan", default: "Kota Bogor" }, t("alamat", "Alamat lengkap"), t("asas", "Asas", "Pancasila dan Undang-Undang Dasar Negara Republik Indonesia Tahun 1945"), ta("tujuan", "Maksud dan tujuan (satu per baris)"), ta("kegiatan", "Kegiatan (satu per baris)"), rp("kekayaan", "Kekayaan awal (Rp)"), ta("pengurus", "Susunan Pengurus pertama (satu per baris: jabatan dan nama)", "Ketua: Tuan ..."), ta("pengawas", "Susunan Pengawas pertama (satu per baris)"), t("masaJabatan", "Masa jabatan Pengurus & Pengawas", "5 (lima) tahun", false)] }],
    pengantar: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan dengan ini mendirikan suatu Perkumpulan dengan anggaran dasar sebagai berikut:",
    pasal: [
      [{ j: "NAMA, TEMPAT KEDUDUKAN, DAN JANGKA WAKTU" }, "Perkumpulan ini bernama **PERKUMPULAN {nama:up}** (selanjutnya disebut \"Perkumpulan\"), berkedudukan di {kedudukan}<<, beralamat di {alamat}>>, dan didirikan untuk jangka waktu yang tidak ditentukan lamanya."],
      [{ j: "ASAS, MAKSUD DAN TUJUAN" }, "Perkumpulan berasaskan {asas}. Maksud dan tujuan Perkumpulan ialah:", { baris: "tujuan" }],
      [{ j: "KEGIATAN" }, "Untuk mencapai maksud dan tujuan tersebut Perkumpulan menjalankan kegiatan sebagai berikut:", { baris: "kegiatan" }, "Perkumpulan tidak membagikan keuntungan kepada anggotanya."],
      [{ j: "KEKAYAAN" }, "Kekayaan awal Perkumpulan berjumlah {kekayaan:rp}, yang berasal dari para pendiri dan dipisahkan dari kekayaan pribadi mereka. Kekayaan Perkumpulan selanjutnya diperoleh dari iuran anggota, sumbangan yang tidak mengikat, hibah, dan pendapatan lain yang sah."],
      [{ j: "KEANGGOTAAN" }, "Anggota Perkumpulan adalah para pendiri dan mereka yang diterima sebagai anggota oleh Pengurus sesuai ketentuan Anggaran Rumah Tangga. Keanggotaan berakhir karena meninggal dunia, mengundurkan diri, atau diberhentikan berdasarkan keputusan Rapat Umum Anggota."],
      [{ j: "RAPAT UMUM ANGGOTA" }, "Rapat Umum Anggota adalah pemegang kekuasaan tertinggi dalam Perkumpulan, diadakan paling sedikit satu kali dalam satu tahun, dan sah apabila dihadiri lebih dari 1/2 (satu per dua) jumlah anggota. Keputusan diambil dengan musyawarah untuk mufakat, dan apabila tidak tercapai dengan suara terbanyak.", "Perubahan anggaran dasar dan pembubaran Perkumpulan hanya sah apabila rapat dihadiri paling sedikit 2/3 (dua per tiga) jumlah anggota dan disetujui paling sedikit 2/3 (dua per tiga) suara yang dikeluarkan."],
      [{ j: "PENGURUS DAN PENGAWAS" }, "Perkumpulan diurus oleh Pengurus yang sekurang-kurangnya terdiri atas seorang Ketua, seorang Sekretaris, dan seorang Bendahara, dan diawasi oleh Pengawas; keduanya diangkat oleh Rapat Umum Anggota untuk masa jabatan {masaJabatan} dan dapat diangkat kembali.", "Ketua bersama-sama dengan Sekretaris atau Bendahara mewakili Perkumpulan di dalam dan di luar Pengadilan. Untuk meminjam uang, mengalihkan, atau menjaminkan harta tetap Perkumpulan, Pengurus memerlukan persetujuan Rapat Umum Anggota."],
      [{ j: "TAHUN BUKU" }, "Tahun buku Perkumpulan berjalan dari tanggal 1 Januari sampai dengan tanggal 31 Desember. Pengurus wajib menyampaikan laporan tahunan dan laporan keuangan kepada Rapat Umum Anggota paling lambat 5 (lima) bulan setelah tahun buku ditutup."],
      [{ j: "PEMBUBARAN" }, "Apabila Perkumpulan dibubarkan, pemberesan dilakukan oleh likuidator yang ditunjuk Rapat Umum Anggota, dan sisa kekayaan diserahkan kepada perkumpulan atau badan lain yang mempunyai maksud dan tujuan yang serupa."],
      [{ j: "KETENTUAN PENUTUP" }, "Untuk pertama kali diangkat sebagai Pengurus Perkumpulan:", { baris: "pengurus" }, "dan sebagai Pengawas Perkumpulan:", { baris: "pengawas" }, "Pengurus, dengan hak substitusi, dikuasakan untuk memohon pengesahan badan hukum Perkumpulan kepada Menteri Hukum Republik Indonesia dan melakukan perubahan anggaran dasar yang disyaratkan untuk memperoleh pengesahan tersebut."]
    ],
    subject: "Perkumpulan {nama:up}",
    notes: ["Pesan nama dan ajukan pengesahan badan hukum Perkumpulan melalui AHU Online [VERIFIKASI: Permenkumham 3/2016 jo. perubahannya, termasuk jumlah pendiri minimum dan tenggat].", "Organisasi kemasyarakatan berbasis anggota berbadan hukum memakai bentuk Perkumpulan (UU 17/2013). Pendirian partai politik TIDAK memakai template ini; syaratnya khusus menurut UU Partai Politik.", "Hal yang belum diatur di anggaran dasar dimuat dalam Anggaran Rumah Tangga."],
    checklist: ["KTP & NPWP Seluruh Pendiri", "KTP & NPWP Pengurus dan Pengawas", "Usulan Nama Perkumpulan (3 alternatif)", "Alamat Lengkap & Surat Pernyataan Domisili", "Notulen Rapat Pendirian", "Maksud, Tujuan, dan Program Kerja", "Bukti Kekayaan Awal / Surat Pernyataan"],
    tasks: ["Pemesanan nama Perkumpulan di AHU", "Verifikasi kelengkapan dokumen", "Siapkan draft akta", "Review draft oleh Notaris", "Jadwalkan penandatanganan", "Permohonan pengesahan badan hukum Perkumpulan (AHU Online)"],
    duty: [{ title: "Ajukan pengesahan badan hukum Perkumpulan (AHU Online)", days: 60, basis: "Permenkumham 3/2016: tenggat umum sejak akta ditandatangani (verifikasi)" }]
  },
  {
    key: "perubahan_koperasi",
    title: "Akta Perubahan Anggaran Dasar Koperasi",
    judul: "PERNYATAAN KEPUTUSAN RAPAT ANGGOTA",
    sub: "KOPERASI {nama:up}",
    category: "Korporasi",
    description: "Pernyataan keputusan Rapat Anggota mengenai perubahan anggaran dasar atau pengurus Koperasi.",
    pihak: [{ key: "penghadap", sebut: "", label: "Penghadap (Kuasa Rapat Anggota)", max: 3, klien: true }],
    sections: [{ title: "Data Koperasi", fields: dataBadan("Koperasi") }, { title: "Rapat & Keputusan", fields: [...RAPAT_FIELDS, ta("keputusan", "Keputusan rapat (satu per baris)", "Mengubah Pasal 4 anggaran dasar sehingga berbunyi: ...")] }],
    premis: [
      PREMIS_BADAN("Koperasi", "Koperasi"),
      "bahwa pada tanggal {tanggalRapat:tgl} bertempat di {tempatRapat} telah diadakan Rapat Anggota Koperasi, yang dipimpin oleh {pimpinanRapat} dan dihadiri oleh {kehadiran}, sehingga kuorum yang disyaratkan anggaran dasar Koperasi telah terpenuhi;",
      "bahwa berita acara rapat tersebut dibuat di bawah tangan dan bersama daftar hadir dilekatkan pada minuta akta ini, dan {PENGHADAP} diberi kuasa untuk menyatakan keputusan rapat dalam akta notaris."
    ],
    pengantar: "Selanjutnya {PENGHADAP} menyatakan bahwa Rapat Anggota telah mengambil keputusan sebagai berikut:",
    pasal: [
      [{ baris: "keputusan" }],
      ["Ketentuan anggaran dasar Koperasi selebihnya yang tidak diubah tetap berlaku.", "Memberi kuasa kepada Pengurus Koperasi dan/atau {PENGHADAP}, dengan hak substitusi, untuk mengajukan permohonan pengesahan atau pelaporan perubahan anggaran dasar ini kepada pejabat yang berwenang."]
    ],
    subject: "Perubahan Anggaran Dasar Koperasi {nama:up}",
    notes: ["Akta Koperasi dibuat oleh Notaris yang terdaftar sebagai Notaris Pembuat Akta Koperasi (NPAK); pastikan status tersebut [VERIFIKASI].", "Perubahan bidang usaha, penggabungan, dan pembagian memerlukan pengesahan; perubahan lain dilaporkan [VERIFIKASI: UU 25/1992 dan Permenkop/Permenkumham yang berlaku]."],
    checklist: ["Akta Pendirian & Perubahan Koperasi + Pengesahan", "Berita Acara Rapat Anggota & Daftar Hadir", "Undangan Rapat Anggota", "KTP Penghadap dan Pengurus", "NPWP & NIK Koperasi"],
    duty: [{ title: "Ajukan pengesahan / pelaporan perubahan anggaran dasar Koperasi", days: 30, basis: "Tenggat umum 30 hari sejak akta (verifikasi ketentuan koperasi yang berlaku)" }]
  },
  {
    key: "pembubaran_badan",
    title: "Akta Pembubaran Yayasan / Perkumpulan / Koperasi",
    judul: "PERNYATAAN KEPUTUSAN RAPAT",
    sub: "TENTANG PEMBUBARAN {jenis:up} {nama:up}",
    category: "Korporasi",
    description: "Pernyataan keputusan rapat mengenai pembubaran Yayasan, Perkumpulan, atau Koperasi dan penunjukan likuidator.",
    pihak: [{ key: "penghadap", sebut: "", label: "Penghadap (Kuasa Rapat)", max: 3, klien: true }],
    sections: [{ title: "Data Badan", fields: [sel("jenis", "Jenis badan", ["Yayasan", "Perkumpulan", "Koperasi"]), ...dataBadan("badan")] }, { title: "Rapat & Pembubaran", fields: [sel("organ", "Rapat yang memutuskan", ["Rapat Pembina", "Rapat Umum Anggota", "Rapat Anggota"]), ...RAPAT_FIELDS, ...LIKUIDATOR, ta("alasan", "Alasan pembubaran (opsional)"), t("sisa", "Sisa kekayaan diserahkan kepada", "Yayasan ... yang mempunyai maksud dan tujuan yang sama")] }],
    premis: [
      "bahwa **{jenis:up} {nama:up}**, berkedudukan di {kedudukan}, didirikan dengan {aktaPendirian}<<, yang telah memperoleh pengesahan berdasarkan {pengesahan}>><<, terakhir diubah dengan {perubahanTerakhir}>>;",
      "bahwa pada tanggal {tanggalRapat:tgl} bertempat di {tempatRapat} telah diadakan {organ}, yang dipimpin oleh {pimpinanRapat} dan dihadiri oleh {kehadiran}, sehingga kuorum yang disyaratkan anggaran dasar dan undang-undang telah terpenuhi;",
      "bahwa risalah rapat dan daftar hadir dilekatkan pada minuta akta ini, dan {PENGHADAP} diberi kuasa untuk menyatakan keputusan rapat dalam akta notaris."
    ],
    pengantar: "Selanjutnya {PENGHADAP} menyatakan bahwa rapat telah mengambil keputusan sebagai berikut:",
    pasal: [
      ["Membubarkan {jenis} {nama:up} terhitung sejak tanggal {efektif:tgl}<<, dengan alasan {alasan}>>."],
      ["Menunjuk {likuidator} sebagai likuidator untuk membereskan kekayaan badan tersebut; selama pemberesan di belakang nama badan dicantumkan kata \"dalam likuidasi\"."],
      ["Likuidator wajib mengumumkan pembubaran dan proses likuidasi dalam surat kabar harian berbahasa Indonesia, membereskan kekayaan, dan melaporkan hasilnya kepada organ yang menunjuknya serta kepada Menteri atau pejabat yang berwenang."],
      ["Sisa kekayaan hasil likuidasi diserahkan kepada {sisa}, dan tidak dibagikan kepada pendiri, pengurus, pengawas, ataupun anggota, kecuali untuk Koperasi sesuai ketentuan perkoperasian."],
      ["Memberi kuasa kepada likuidator dan/atau {PENGHADAP}, dengan hak substitusi, untuk melaksanakan keputusan ini dan menyampaikan pemberitahuan kepada pejabat yang berwenang."]
    ],
    subject: "Pembubaran {jenis} {nama:up}",
    notes: ["Yayasan: pembubaran karena keputusan Pembina, likuidator wajib mengumumkan dalam surat kabar paling lambat 5 hari sejak ditunjuk dan sisa kekayaan diserahkan kepada Yayasan lain yang sama maksud dan tujuannya (Pasal 62-68 UU Yayasan) [VERIFIKASI].", "Koperasi: akta dibuat oleh NPAK dan tunduk pada UU 25/1992; Perkumpulan mengikuti anggaran dasarnya."],
    checklist: ["Akta Pendirian & Seluruh Akta Perubahan + Pengesahan", "Risalah Rapat Pembubaran & Daftar Hadir", "KTP & NPWP Penghadap dan Likuidator", "NPWP Badan", "?Laporan Keuangan Terakhir"],
    duty: [{ title: "Beritahukan pembubaran kepada Menteri / pejabat berwenang dan pastikan pengumuman koran", days: 30, basis: "UU Yayasan Pasal 64-67 / ketentuan badan terkait: tenggat umum (verifikasi)" }]
  }
];
