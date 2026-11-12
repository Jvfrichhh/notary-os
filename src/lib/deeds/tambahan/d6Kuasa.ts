import type { Cfg } from "./types";
import { num, rp, sel, t, ta, tgl } from "./klausa";

const BA_PENGANTAR = (apa: string) => `Atas permintaan {PENGHADAP}, saya, Notaris, telah hadir untuk menyaksikan dan membuat berita acara mengenai ${apa}, dan mencatat hal-hal sebagai berikut:`;
const BA_NOTE = "Akta relaas: Notaris mencatat apa yang disaksikannya sendiri; Notaris wajib hadir di tempat kejadian dan hanya di dalam wilayah jabatannya.";
const BA_TASKS = ["Verifikasi kelengkapan dokumen", "Hadiri dan saksikan pelaksanaan", "Siapkan draft berita acara", "Review draft oleh Notaris", "Serahkan salinan kepada pemohon"];

export const D6_KUASA: Cfg[] = [
  {
    key: "pernyataan",
    title: "Akta Pernyataan",
    judul: "PERNYATAAN",
    sub: "{perihal:up}",
    category: "Umum",
    description: "Pernyataan sepihak penghadap mengenai suatu keadaan, kesanggupan, atau fakta (pernyataan umum).",
    pihak: [{ key: "pembuat", sebut: "", label: "Yang Membuat Pernyataan", max: 6, klien: true }],
    sections: [{ title: "Isi Pernyataan", fields: [t("perihal", "Perihal (untuk judul; opsional)", "Kepemilikan dan Tidak Sengketa"), ta("latar", "Latar belakang (opsional; satu per baris)"), ta("isi", "Isi pernyataan (satu per baris)", "bahwa tanah tersebut benar milik saya dan tidak dalam sengketa"), t("untuk", "Dibuat untuk keperluan (opsional)", "persyaratan permohonan kredit pada PT Bank ...")] }],
    tanpaPasal: true,
    tanpaDomisili: true,
    pengantar: "{Penghadap} dengan bertindak sebagaimana tersebut di atas dengan ini menyatakan dengan sebenar-benarnya:",
    pasal: [
      { jika: "latar", isi: ["Bahwa terlebih dahulu diterangkan hal-hal sebagai berikut:", { baris: "latar" }] },
      [{ baris: "isi" }],
      ["Pernyataan ini dibuat dengan sebenarnya, tanpa paksaan dari pihak mana pun<<, untuk keperluan {untuk}>>. {Penghadap} bertanggung jawab sepenuhnya atas kebenaran pernyataan ini dan membebaskan Notaris serta para saksi dari segala tuntutan apabila di kemudian hari ternyata pernyataan ini tidak benar."]
    ],
    subject: "Pernyataan {perihal}",
    notes: ["Notaris hanya menjamin bahwa penghadap benar menyatakan hal tersebut, bukan kebenaran materiil isinya; mintakan dokumen pendukung dan lekatkan pada minuta.", "Jangan dipakai untuk pernyataan yang isinya mengalihkan hak (pakai akta yang sesuai)."],
    checklist: ["KTP & KK Penghadap", "Dokumen Pendukung Isi Pernyataan", "?Akta Pendirian & SK (bila mewakili badan)"]
  },
  {
    key: "kuasa_direksi",
    title: "Akta Kuasa Direksi",
    judul: "KUASA DIREKSI",
    category: "Kuasa",
    description: "Kuasa dari Direksi perseroan kepada karyawan atau pihak lain untuk mewakili perseroan dalam tindakan tertentu (Pasal 103 UUPT).",
    pihak: [{ key: "pemberi", sebut: "Pemberi Kuasa", label: "Pemberi Kuasa (Direksi)", klien: true }, { key: "penerima", sebut: "Penerima Kuasa", label: "Penerima Kuasa" }],
    sections: [{ title: "Perseroan & Wewenang", fields: [t("perseroan", "Nama perseroan", "PT SINAR MAJU SEJAHTERA, berkedudukan di Kota Bogor"), t("jabatanPenerima", "Jabatan penerima kuasa (opsional)", "Kepala Cabang Bogor"), ta("wewenang", "Wewenang (satu per baris)", "menandatangani perjanjian kredit dengan nasabah sampai jumlah Rp..."), ta("batasan", "Batasan (opsional; satu per baris)"), sel("substitusi", "Hak substitusi", ["tanpa hak substitusi", "dengan hak substitusi"]), tgl("sampai", "Berlaku sampai (opsional)")] }],
    pasal: [
      ["Pemberi Kuasa, bertindak dalam jabatannya mewakili Direksi dari dan oleh karena itu untuk dan atas nama {perseroan} (selanjutnya disebut \"Perseroan\"), dengan ini memberi kuasa kepada Penerima Kuasa<<, dalam jabatannya selaku {jabatanPenerima}>>, {substitusi}, khusus untuk dan atas nama Perseroan:", { baris: "wewenang" }],
      { jika: "batasan", isi: ["Kuasa ini diberikan dengan batasan sebagai berikut:", { baris: "batasan" }] },
      ["Untuk keperluan tersebut Penerima Kuasa berhak menghadap pejabat dan pihak yang berkepentingan, memberikan keterangan, membuat dan menandatangani surat serta akta yang diperlukan, dan melakukan segala tindakan yang perlu dalam batas wewenang tersebut."],
      ["Kuasa ini berlaku sejak akta ini ditandatangani<< sampai dengan tanggal {sampai:tgl}>>, dan berakhir apabila dicabut oleh Direksi, Penerima Kuasa tidak lagi bekerja pada Perseroan, atau karena sebab lain menurut hukum. Penerima Kuasa wajib mempertanggungjawabkan pelaksanaan kuasa ini kepada Direksi."]
    ],
    tanpaDomisili: true,
    subject: "Kuasa Direksi {perseroan}",
    notes: ["Direksi dapat memberi kuasa tertulis kepada karyawan atau orang lain untuk perbuatan hukum tertentu (Pasal 103 UUPT); kuasa tidak boleh bersifat umum yang mengalihkan seluruh pengurusan.", "Periksa anggaran dasar: siapa yang berwenang mewakili Direksi dan apakah tindakan yang dikuasakan memerlukan persetujuan Dewan Komisaris/RUPS."],
    checklist: ["KTP Pemberi dan Penerima Kuasa", "Akta Pendirian & Perubahan Terakhir Perseroan", "SK Kemenkumham & Susunan Pengurus Terakhir", "?Persetujuan Dewan Komisaris (bila disyaratkan)"]
  },
  {
    key: "kuasa_rups",
    title: "Akta Kuasa Menghadiri RUPS",
    judul: "KUASA",
    sub: "UNTUK MENGHADIRI RAPAT UMUM PEMEGANG SAHAM",
    category: "Kuasa",
    description: "Kuasa pemegang saham untuk hadir dan memberikan suara dalam RUPS (Pasal 85 UUPT).",
    pihak: [{ key: "pemberi", sebut: "Pemberi Kuasa", label: "Pemberi Kuasa (pemegang saham)", klien: true }, { key: "penerima", sebut: "Penerima Kuasa", label: "Penerima Kuasa" }],
    sections: [{ title: "Saham & Rapat", fields: [t("perseroan", "Nama perseroan", "PT SINAR MAJU SEJAHTERA, berkedudukan di Kota Bogor"), num("saham", "Jumlah saham"), t("rapat", "Rapat", "Rapat Umum Pemegang Saham Luar Biasa"), tgl("tanggalRapat", "Tanggal rapat (opsional)"), ta("acara", "Mata acara (satu per baris)"), t("arahan", "Arahan suara (opsional)", "menyetujui seluruh mata acara")] }],
    pasal: [
      ["Pemberi Kuasa, selaku pemilik dan pemegang {saham:angka} saham dalam {perseroan} (selanjutnya disebut \"Perseroan\"), dengan ini memberi kuasa kepada Penerima Kuasa, khusus untuk mewakili Pemberi Kuasa menghadiri {rapat} Perseroan<< yang diadakan pada tanggal {tanggalRapat:tgl}>>, termasuk rapat lanjutan atau rapat kedua bila kuorum tidak tercapai, dengan mata acara:", { baris: "acara" }],
      ["Untuk itu Penerima Kuasa berhak menandatangani daftar hadir, ikut membicarakan mata acara, mengeluarkan suara atas seluruh saham Pemberi Kuasa<< dengan arahan {arahan}>>, menandatangani risalah atau berita acara rapat, dan melakukan segala sesuatu yang diperlukan sehubungan dengan rapat tersebut."],
      ["Pemberi Kuasa menyatakan akan mengesahkan dan menerima baik segala tindakan Penerima Kuasa berdasarkan kuasa ini."]
    ],
    tanpaDomisili: true,
    subject: "Kuasa menghadiri RUPS {perseroan}",
    notes: ["Anggota Direksi, Dewan Komisaris, dan karyawan Perseroan dilarang bertindak sebagai kuasa pemegang saham dalam pemungutan suara (Pasal 85 ayat (4) UUPT).", "Pemegang saham tidak boleh memecah suara atas sahamnya kepada lebih dari satu kuasa dengan suara berbeda (Pasal 85 ayat (3))."],
    checklist: ["KTP Pemberi dan Penerima Kuasa", "Daftar Pemegang Saham / Bukti Kepemilikan Saham", "Undangan / Panggilan RUPS", "?Akta Pendirian & SK (pemegang saham badan hukum)"]
  },
  {
    key: "kuasa_menagih",
    title: "Akta Kuasa Menagih",
    judul: "KUASA MENAGIH",
    category: "Kuasa",
    description: "Kuasa untuk menagih dan menerima pembayaran piutang.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Kuasa", label: "Pemberi Kuasa (pemilik piutang)", klien: true }, { key: "penerima", sebut: "Penerima Kuasa", label: "Penerima Kuasa" }],
    sections: [{ title: "Piutang", fields: [t("debitur", "Yang berutang", "Tuan ... / PT ..."), t("dasar", "Dasar piutang", "Akta Pengakuan Hutang Nomor ... tanggal ... / faktur Nomor ..."), rp("jumlah", "Jumlah piutang (Rp)"), sel("substitusi", "Hak substitusi", ["dengan hak substitusi", "tanpa hak substitusi"]), t("imbalan", "Imbalan penerima kuasa (opsional)", "10% (sepuluh persen) dari jumlah yang berhasil ditagih")] }],
    pasal: [
      ["Pemberi Kuasa dengan ini memberi kuasa kepada Penerima Kuasa, {substitusi}, khusus untuk dan atas nama Pemberi Kuasa menagih dan menerima pembayaran piutang Pemberi Kuasa terhadap {debitur} sebesar {jumlah:rp} berikut bunga, denda, dan biaya, berdasarkan {dasar}."],
      ["Untuk itu Penerima Kuasa berhak mengirim teguran dan somasi, mengadakan perundingan, membuat penjadwalan pembayaran dengan persetujuan Pemberi Kuasa, menerima pembayaran dan memberikan tanda penerimaan (kwitansi), serta bila perlu menunjuk advokat untuk mengajukan tuntutan di muka pengadilan."],
      ["Penerima Kuasa wajib menyetorkan seluruh hasil penagihan kepada Pemberi Kuasa selambat-lambatnya 3 (tiga) hari kerja setelah diterima<<, dan atas jasanya memperoleh imbalan sebesar {imbalan}>>, serta melaporkan pelaksanaan kuasa ini secara berkala."],
      ["Penerima Kuasa wajib melaksanakan penagihan dengan cara yang patut dan tidak melanggar hukum; segala akibat dari cara penagihan yang melanggar hukum menjadi tanggung jawab Penerima Kuasa sendiri."]
    ],
    tanpaDomisili: true,
    subject: "Kuasa menagih piutang terhadap {debitur}",
    notes: ["Kuasa menagih tidak mengalihkan piutang; bila piutang hendak dialihkan gunakan Akta Pengalihan Piutang (Cessie).", "Mewakili di pengadilan memerlukan surat kuasa khusus kepada advokat."],
    checklist: ["KTP Pemberi dan Penerima Kuasa", "Dokumen Dasar Piutang", "Rincian Saldo Piutang"]
  },
  {
    key: "kuasa_jual_saham",
    title: "Akta Kuasa Menjual Saham",
    judul: "KUASA MENJUAL SAHAM",
    category: "Kuasa",
    description: "Kuasa untuk menjual dan mengalihkan saham dalam perseroan.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Kuasa", label: "Pemberi Kuasa (pemilik saham)", pasangan: true, klien: true }, { key: "penerima", sebut: "Penerima Kuasa", label: "Penerima Kuasa" }],
    sections: [{ title: "Saham", fields: [t("perseroan", "Nama perseroan", "PT SINAR MAJU SEJAHTERA, berkedudukan di Kota Bogor"), num("saham", "Jumlah saham"), rp("nominal", "Nilai nominal per saham (Rp)"), t("hargaMin", "Harga / syarat penjualan", "dengan harga paling sedikit Rp... / dengan harga dan syarat yang dianggap baik oleh Penerima Kuasa"), t("dasar", "Dasar pemberian kuasa (opsional)", "Akta Gadai Saham Nomor ... / Perjanjian Pengikatan Jual Beli Saham Nomor ..."), sel("substitusi", "Hak substitusi", ["dengan hak substitusi", "tanpa hak substitusi"])] }],
    pasal: [
      ["Pemberi Kuasa dengan ini memberi kuasa kepada Penerima Kuasa, {substitusi}, khusus untuk dan atas nama Pemberi Kuasa menjual, mengalihkan, dan menyerahkan kepada siapa pun, termasuk kepada Penerima Kuasa sendiri, {saham:angka} saham<<, masing-masing bernilai nominal {nominal:rp},>> milik Pemberi Kuasa dalam {perseroan} (selanjutnya disebut \"Perseroan\"), {hargaMin}."],
      ["Untuk itu Penerima Kuasa berhak menghadap Notaris, membuat dan menandatangani akta pemindahan hak atas saham, menerima harga penjualan dan memberikan tanda penerimaannya, memberitahukan pemindahan hak kepada Direksi Perseroan untuk dicatat dalam Daftar Pemegang Saham, memenuhi tata cara penawaran terlebih dahulu dan memperoleh persetujuan organ Perseroan yang disyaratkan anggaran dasar, serta melakukan segala tindakan yang diperlukan."],
      { jika: "dasar", isi: ["Kuasa ini diberikan berdasarkan dan merupakan bagian yang tidak terpisahkan dari {dasar}, sehingga tidak dapat dicabut dan tidak berakhir karena sebab-sebab yang termaktub dalam Pasal 1813, 1814, dan 1816 Kitab Undang-Undang Hukum Perdata."] },
      ["Penerima Kuasa wajib mempertanggungjawabkan hasil penjualan kepada Pemberi Kuasa sesuai kesepakatan mereka."]
    ],
    tanpaDomisili: true,
    subject: "Kuasa menjual saham {perseroan}",
    notes: ["Pemindahan hak atas saham tetap harus memenuhi anggaran dasar (hak menawar lebih dahulu, persetujuan organ) dan Pasal 56–57 UUPT, serta diberitahukan ke Menteri.", "Kuasa yang tidak dapat dicabut hanya patut bila terkait perjanjian pokok (gadai saham, PPJB saham lunas); hak suara tidak dapat dipisahkan dari kepemilikan saham."],
    checklist: ["KTP & KK Pemberi dan Penerima Kuasa", "KTP Pasangan Pemberi Kuasa (persetujuan)", "Akta Pendirian & Perubahan Terakhir Perseroan", "Daftar Pemegang Saham / Bukti Kepemilikan Saham", "?Perjanjian Pokok (gadai / PPJB saham)"]
  },
  {
    key: "ba_undian",
    title: "Akta Berita Acara Penarikan Undian",
    judul: "BERITA ACARA",
    sub: "PENARIKAN UNDIAN {program:up}",
    category: "Umum",
    description: "Berita acara penarikan undian berhadiah yang disaksikan Notaris.",
    pihak: [{ key: "pemohon", sebut: "", label: "Pemohon (wakil penyelenggara)", max: 4, klien: true }],
    sections: [{ title: "Undian", fields: [t("penyelenggara", "Penyelenggara", "PT ..., berkedudukan di ..."), t("program", "Nama program", "Gebyar Hadiah ..."), t("izin", "Izin undian", "Keputusan Menteri Sosial Republik Indonesia Nomor ... tanggal ..."), t("tempat", "Tempat penarikan"), t("periode", "Periode program", "1 Januari 2026 sampai dengan 31 Maret 2026"), t("cara", "Cara penarikan", "pengacakan secara elektronik atas ... nomor undian yang sah"), t("hadir", "Pejabat/saksi lain yang hadir", "petugas Dinas Sosial Kota Bogor: ..."), ta("pemenang", "Hasil / pemenang (satu per baris: hadiah, nomor, nama)", "Hadiah utama 1 (satu) unit mobil: nomor undian ..., atas nama ...")] }],
    premis: ["bahwa {penyelenggara} (selanjutnya disebut \"Penyelenggara\") menyelenggarakan program undian berhadiah \"{program}\" untuk periode {periode}<<, berdasarkan {izin}>>;", "bahwa {PENGHADAP} meminta saya, Notaris, untuk menyaksikan penarikan undian tersebut dan membuat berita acaranya."],
    pengantar: BA_PENGANTAR("penarikan undian tersebut, yang dilaksanakan di {tempat}"),
    tanpaPasal: true,
    tanpaDomisili: true,
    pasal: [
      ["Penarikan undian dihadiri pula oleh {hadir}."],
      ["Sebelum penarikan, kepada saya, Notaris, diperlihatkan data peserta dan sarana penarikan; penarikan dilakukan dengan cara {cara}."],
      ["Dari penarikan tersebut diperoleh hasil sebagai berikut:", { baris: "pemenang" }],
      ["Penyelenggara menyatakan bertanggung jawab sepenuhnya atas keabsahan data peserta, penyerahan hadiah kepada para pemenang, pembayaran pajak hadiah, dan penyerahan hadiah yang tidak diambil sesuai ketentuan yang berlaku. Saya, Notaris, hanya mencatat pelaksanaan penarikan sebagaimana yang saya saksikan."]
    ],
    subject: "Berita acara undian {program}",
    notes: [BA_NOTE, "Undian berhadiah memerlukan izin Menteri Sosial dan penarikannya disaksikan Notaris serta petugas dinas sosial; hadiah tidak tertebak/tidak diambil diserahkan kepada Kementerian Sosial [VERIFIKASI: UU 22/1954, Permensos 13/2005 dan perubahannya].", "Lekatkan daftar pemenang dan salinan izin pada minuta."],
    checklist: ["KTP Wakil Penyelenggara & Surat Kuasa/Penugasan", "Akta Pendirian & SK Penyelenggara", "Izin Undian dari Kementerian Sosial", "Syarat & Ketentuan Program", "Data Peserta / Rekap Nomor Undian"],
    tasks: BA_TASKS
  },
  {
    key: "ba_pemusnahan",
    title: "Akta Berita Acara Pemusnahan",
    judul: "BERITA ACARA PEMUSNAHAN",
    sub: "{jenisBarang:up}",
    category: "Umum",
    description: "Berita acara pemusnahan barang, dokumen, atau persediaan yang disaksikan Notaris.",
    pihak: [{ key: "pemohon", sebut: "", label: "Pemohon (pemilik / wakil pemilik barang)", max: 4, klien: true }],
    sections: [{ title: "Pemusnahan", fields: [t("pemilik", "Pemilik barang", "PT ..., berkedudukan di ..."), t("jenisBarang", "Jenis barang (untuk judul)", "Barang Kedaluwarsa", false), ta("barang", "Barang yang dimusnahkan (satu per baris: jenis dan jumlah)"), t("alasan", "Alasan pemusnahan", "telah kedaluwarsa dan tidak layak edar"), t("tempat", "Tempat pemusnahan"), t("cara", "Cara pemusnahan", "dibakar / dihancurkan dengan mesin pencacah"), t("pelaksana", "Pelaksana", "PT ... selaku pengolah limbah berizin"), t("hadir", "Yang turut menyaksikan (opsional)", "petugas Kantor Pelayanan Pajak ...")] }],
    premis: ["bahwa {pemilik} bermaksud memusnahkan barang miliknya karena {alasan};", "bahwa {PENGHADAP} meminta saya, Notaris, untuk menyaksikan pemusnahan tersebut dan membuat berita acaranya."],
    pengantar: BA_PENGANTAR("pemusnahan tersebut, yang dilaksanakan di {tempat}"),
    tanpaPasal: true,
    tanpaDomisili: true,
    pasal: [
      ["Kepada saya, Notaris, diperlihatkan barang yang akan dimusnahkan, yang menurut keterangan {PENGHADAP} dan daftar yang diserahkan kepada saya terdiri atas:", { baris: "barang" }],
      ["Pemusnahan dilaksanakan oleh {pelaksana} dengan cara {cara}<<, dan disaksikan pula oleh {hadir}>>."],
      ["Setelah pemusnahan selesai, saya, Notaris, menyaksikan bahwa barang tersebut telah musnah atau rusak sehingga tidak dapat dipergunakan lagi."],
      ["{Penghadap} bertanggung jawab sepenuhnya atas kebenaran jenis, jumlah, dan kepemilikan barang yang dimusnahkan serta pemenuhan ketentuan lingkungan hidup dan perpajakan. Saya, Notaris, hanya mencatat pelaksanaan pemusnahan sebagaimana yang saya saksikan."]
    ],
    subject: "Berita acara pemusnahan {jenisBarang}",
    notes: [BA_NOTE, "Pemusnahan persediaan untuk keperluan pajak, barang kena cukai, obat/makanan, arsip, atau limbah B3 mempunyai tata cara dan pejabat saksi tersendiri; pastikan dipenuhi [VERIFIKASI].", "Notaris tidak menghitung sendiri kecuali dinyatakan; lekatkan daftar barang dan foto pada minuta."],
    checklist: ["KTP Pemohon & Surat Kuasa/Penugasan", "Akta Pendirian & SK Pemilik Barang", "Daftar Barang yang Dimusnahkan", "?Persetujuan / Pemberitahuan ke Instansi Terkait", "?Izin Pengolah Limbah"],
    tasks: BA_TASKS
  },
  {
    key: "ba_serah_terima",
    title: "Akta Berita Acara Serah Terima",
    judul: "BERITA ACARA SERAH TERIMA",
    sub: "{perihal:up}",
    category: "Umum",
    description: "Berita acara serah terima barang, dokumen, bangunan, atau pekerjaan antara dua pihak.",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama (yang menyerahkan)" }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua (yang menerima)", klien: true }],
    sections: [{ title: "Serah Terima", fields: [t("perihal", "Perihal (untuk judul)", "Tanah dan Bangunan", false), t("dasar", "Dasar serah terima", "Akta Jual Beli Nomor ... tanggal ... / Perjanjian Pemborongan Nomor ..."), ta("objek", "Yang diserahterimakan (satu per baris)"), t("keadaan", "Keadaan saat diserahkan", "baik, kosong, dan sesuai yang diperjanjikan"), ta("catatan", "Catatan / kekurangan (opsional; satu per baris)")] }],
    premis: ["bahwa berdasarkan {dasar}, Pihak Pertama berkewajiban menyerahkan kepada Pihak Kedua hal-hal yang disebut di bawah ini."],
    tanpaPasal: true,
    tanpaDomisili: true,
    pasal: [
      ["Pihak Pertama pada hari ini menyerahkan kepada Pihak Kedua, yang menerima penyerahan dari Pihak Pertama:", { baris: "objek" }],
      ["Pihak Kedua menyatakan telah memeriksa dan menerima hal tersebut dalam keadaan {keadaan}."],
      { jika: "catatan", isi: ["Mengenai serah terima ini dicatat hal-hal sebagai berikut:", { baris: "catatan" }] },
      ["Sejak serah terima ini segala tanggung jawab, risiko, dan beban atas hal yang diserahterimakan beralih kepada Pihak Kedua, dengan tidak mengurangi kewajiban penjaminan Pihak Pertama menurut perjanjian yang menjadi dasarnya."]
    ],
    subject: "Serah terima {perihal}",
    notes: ["Berita acara ini memuat keterangan para pihak (akta partij); Notaris tidak memeriksa fisik barang kecuali dinyatakan.", "Serah terima fisik tidak menggantikan peralihan hak secara yuridis (balik nama)."],
    checklist: ["KTP Para Pihak", "Perjanjian / Akta Dasar Serah Terima", "Daftar Barang / Dokumen yang Diserahterimakan", "?Foto Keadaan Objek"]
  },
  {
    key: "ba_sdb",
    title: "Akta Berita Acara Pembukaan Safe Deposit Box",
    judul: "BERITA ACARA",
    sub: "PEMBUKAAN SAFE DEPOSIT BOX",
    category: "Umum",
    description: "Berita acara pembukaan (paksa) kotak simpanan/safe deposit box dan pencatatan isinya.",
    pihak: [{ key: "pemohon", sebut: "", label: "Pemohon (wakil bank / ahli waris penyewa)", max: 6, klien: true }],
    sections: [{ title: "Safe Deposit Box", fields: [t("bank", "Bank & kantor", "PT Bank ... Kantor Cabang Bogor, Jalan ..."), t("nomorSdb", "Nomor kotak", "SDB Nomor ...", false), t("penyewa", "Penyewa", "Tuan ... (almarhum)"), t("alasan", "Alasan pembukaan", "penyewa telah meninggal dunia dan dibuka atas permintaan para ahli warisnya / sewa telah berakhir dan penyewa tidak dapat dihubungi"), t("dasar", "Dasar", "Surat Keterangan Hak Waris Nomor ... / Perjanjian Sewa SDB Nomor ... Pasal ..."), t("cara", "Cara pembukaan", "dibongkar oleh teknisi yang ditunjuk bank"), t("hadir", "Yang turut hadir", "pejabat bank: ..."), ta("isi", "Isi kotak (satu per baris)"), t("selanjutnya", "Penanganan isi", "diserahkan kepada para ahli waris dengan tanda terima / disimpan oleh bank dalam sampul tersegel")] }],
    premis: ["bahwa pada {bank} terdapat safe deposit box {nomorSdb} yang disewa oleh {penyewa};", "bahwa kotak tersebut perlu dibuka karena {alasan}<<, berdasarkan {dasar}>>;", "bahwa {PENGHADAP} meminta saya, Notaris, untuk menyaksikan pembukaan tersebut dan mencatat isinya."],
    pengantar: BA_PENGANTAR("pembukaan safe deposit box tersebut"),
    tanpaPasal: true,
    tanpaDomisili: true,
    pasal: [
      ["Pembukaan dilakukan di ruang penyimpanan bank tersebut dengan cara {cara}, dihadiri oleh {hadir}."],
      ["Setelah kotak terbuka, di hadapan saya, Notaris, dan para yang hadir, ditemukan isi sebagai berikut:", { baris: "isi" }],
      ["Isi kotak tersebut selanjutnya {selanjutnya}."],
      ["Saya, Notaris, hanya mencatat apa yang saya saksikan dan tidak menilai keaslian, mutu, maupun nilai barang-barang tersebut."]
    ],
    subject: "Pembukaan safe deposit box {nomorSdb}",
    notes: [BA_NOTE, "Pastikan dasar kewenangan pembukaan (perjanjian sewa SDB, bukti ahli waris lengkap, atau penetapan pengadilan) sebelum hadir.", "Catat isi secara rinci (jenis, jumlah, ciri) tanpa menaksir nilainya; lekatkan foto pada minuta."],
    checklist: ["KTP Pemohon & Surat Kuasa/Penugasan Bank", "Perjanjian Sewa Safe Deposit Box", "?Akta Kematian & Surat Keterangan Waris", "?Bukti Pemberitahuan kepada Penyewa", "?Penetapan Pengadilan"],
    tasks: BA_TASKS
  }
];
