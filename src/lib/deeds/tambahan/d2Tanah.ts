import type { Cfg } from "./types";
import { AHLI_WARIS, LALAI, MUSYAWARAH, biaya, num, rp, sel, t, ta, tgl } from "./klausa";

const TANAH = [
  t("hak", "Jenis & nomor hak / alas hak", "Hak Milik Nomor 123/Babakan"),
  num("luas", "Luas tanah (m²)"),
  t("atasNama", "Tercatat atas nama"),
  t("letak", "Letak tanah", "Kelurahan Babakan, Kecamatan Bogor Tengah, Kota Bogor, Provinsi Jawa Barat"),
  t("diAtasnya", "Bangunan di atasnya (opsional)", "sebuah bangunan rumah tinggal")
];
const SEBUT_TANAH = "sebidang tanah {hak}, seluas {luas:angka} meter persegi, tercatat atas nama {atasNama}, terletak di {letak}<<, berikut {diAtasnya} yang berdiri di atasnya>>";

export const D2_TANAH: Cfg[] = [
  {
    key: "pelepasan_hak",
    title: "Akta Pelepasan Hak atas Tanah",
    judul: "PELEPASAN HAK ATAS TANAH",
    category: "Pertanahan",
    description: "Pelepasan hak atas tanah kepada Negara untuk kepentingan pihak yang akan memohon hak baru (mis. badan hukum membeli tanah Hak Milik).",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama (yang melepaskan hak)", pasangan: true }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua (yang memperoleh manfaat / pemohon hak baru)", klien: true }],
    sections: [{ title: "Tanah & Ganti Rugi", fields: [...TANAH, rp("gantiRugi", "Uang ganti rugi (Rp)"), t("hakBaru", "Hak yang akan dimohon Pihak Kedua", "Hak Guna Bangunan", false)] }],
    premis: [
      `bahwa Pihak Pertama adalah pemegang hak atas ${SEBUT_TANAH} (selanjutnya disebut "Tanah");`,
      "bahwa Pihak Kedua tidak memenuhi syarat sebagai pemegang hak atas Tanah tersebut dalam status haknya yang sekarang, sehingga perolehannya dilakukan dengan cara pelepasan hak oleh Pihak Pertama disertai permohonan {hakBaru} oleh Pihak Kedua;"
    ],
    pasal: [
      ["Pihak Pertama dengan ini melepaskan segala hak dan kepentingannya atas Tanah tersebut sehingga Tanah menjadi tanah yang dikuasai langsung oleh Negara, dengan maksud agar Pihak Kedua dapat memohon {hakBaru} atas Tanah tersebut kepada instansi yang berwenang."],
      ["Pelepasan hak ini dilakukan dengan ganti rugi sebesar {gantiRugi:rp}, yang telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama, dan untuk penerimaannya akta ini berlaku pula sebagai kwitansi yang sah."],
      ["Tanah diserahkan kepada Pihak Kedua pada hari ini dalam keadaan kosong. Mulai hari ini segala keuntungan dan kerugian atas Tanah menjadi hak dan tanggungan Pihak Kedua."],
      ["Pihak Pertama menjamin bahwa Tanah benar haknya, tidak dalam sengketa, tidak dikenakan sitaan, tidak dibebani Hak Tanggungan atau jaminan lain, dan belum dialihkan kepada pihak lain, serta membebaskan Pihak Kedua dari segala tuntutan mengenai hal tersebut."],
      ["Pihak Pertama memberi kuasa kepada Pihak Kedua, kuasa mana merupakan bagian yang tidak terpisahkan dari akta ini, untuk menyerahkan sertipikat dan surat-surat Tanah kepada Kantor Pertanahan, mengurus pencatatan hapusnya hak, serta mengajukan dan menandatangani permohonan hak atas nama Pihak Kedua."],
      ["Pajak yang terutang ditanggung masing-masing pihak sesuai ketentuan perundang-undangan; biaya akta dan permohonan hak ditanggung Pihak Kedua."]
    ],
    subject: "Pelepasan {hak} seluas {luas} m² di {letak}",
    notes: ["Pelepasan hak dapat dibuat dengan akta Notaris; hak hapus sejak pelepasan dan dicatat di Kantor Pertanahan. Periksa persyaratan Kantor Pertanahan setempat [VERIFIKASI: PP 18/2021 dan Permen ATR/BPN 18/2021].", "Lakukan pengecekan sertipikat dan pastikan PPh serta BPHTB diperhitungkan seperti pada pengalihan hak.", "Bila Pihak Kedua memenuhi syarat sebagai pemegang hak, gunakan Akta Jual Beli PPAT, bukan pelepasan hak."],
    checklist: ["KTP & KK Pihak Pertama", "KTP Pasangan Pihak Pertama (persetujuan)", "Sertipikat Asli", "SPPT PBB & Bukti Lunas 5 Tahun", "Akta Pendirian & SK Pihak Kedua (badan hukum)", "NPWP Para Pihak", "?Izin Lokasi / KKPR Pihak Kedua"],
    tasks: ["Cek sertipikat ke Kantor Pertanahan", "Verifikasi kelengkapan dokumen", "Hitung & validasi pajak (PPh & BPHTB)", "Siapkan draft akta", "Review draft oleh Notaris", "Jadwalkan penandatanganan", "Ajukan pencatatan hapusnya hak & permohonan hak baru"]
  },
  {
    key: "pengikatan_hibah",
    title: "Akta Pengikatan Hibah",
    judul: "PENGIKATAN HIBAH",
    category: "Pertanahan",
    description: "Perjanjian pendahuluan hibah tanah sebelum Akta Hibah PPAT dapat dibuat.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Hibah", label: "Calon Pemberi Hibah", pasangan: true }, { key: "penerima", sebut: "Penerima Hibah", label: "Calon Penerima Hibah", klien: true }],
    sections: [{ title: "Tanah", fields: [...TANAH, t("hubungan", "Hubungan pemberi dan penerima", "anak kandung"), t("sebab", "Sebab akta hibah PPAT belum dapat dibuat", "sertipikat masih dalam proses pemecahan")] }],
    premis: [`bahwa Pemberi Hibah adalah pemilik ${SEBUT_TANAH} (selanjutnya disebut "Tanah");`, "bahwa Pemberi Hibah bermaksud menghibahkan Tanah kepada Penerima Hibah<<, yaitu {hubungan} Pemberi Hibah>>, tetapi akta hibah di hadapan Pejabat Pembuat Akta Tanah belum dapat dibuat karena {sebab}."],
    pasal: [
      ["Pemberi Hibah berjanji dan mengikatkan diri untuk menghibahkan Tanah kepada Penerima Hibah, yang berjanji menerimanya, segera setelah syarat pembuatan akta hibah di hadapan Pejabat Pembuat Akta Tanah terpenuhi."],
      ["Sejak hari ini Tanah diserahkan untuk dikuasai dan dimanfaatkan oleh Penerima Hibah; pajak dan beban atas Tanah sejak hari ini ditanggung Penerima Hibah."],
      ["Pemberi Hibah menjamin Tanah tidak dalam sengketa, tidak dijaminkan, tidak dikenakan sitaan, dan tidak akan dialihkan atau dibebani dengan cara apa pun kepada pihak lain."],
      ["Pemberi Hibah memberi kuasa kepada Penerima Hibah, kuasa mana tidak akan berakhir karena sebab-sebab dalam Pasal 1813 Kitab Undang-Undang Hukum Perdata, untuk mewakili Pemberi Hibah menandatangani akta hibah di hadapan Pejabat Pembuat Akta Tanah serta mengurus pendaftaran peralihan haknya."],
      [AHLI_WARIS],
      [biaya("Penerima Hibah")]
    ],
    subject: "Pengikatan hibah {hak}",
    notes: ["Hibah tidak boleh melanggar bagian mutlak (legitieme portie) ahli waris lain; untuk yang beragama Islam hibah paling banyak 1/3 harta kecuali disetujui ahli waris [VERIFIKASI].", "Kuasa di dalam pengikatan ini harus dicermati terhadap larangan kuasa mutlak (Instruksi Mendagri 14/1982)."],
    checklist: ["KTP & KK Pemberi dan Penerima Hibah", "KTP Pasangan Pemberi Hibah (persetujuan)", "Sertipikat / Bukti Hak", "SPPT PBB Tahun Berjalan", "?Persetujuan Ahli Waris Lain", "?Bukti Hubungan Keluarga (Akta Kelahiran)"]
  },
  {
    key: "penegasan",
    title: "Akta Penegasan Jual Beli / Hibah",
    judul: "PENEGASAN",
    sub: "{jenis:up}",
    category: "Pertanahan",
    description: "Penegasan atas jual beli atau hibah yang pernah dilakukan di bawah tangan atau buktinya tidak lengkap.",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama (penjual/pemberi atau ahli warisnya)", max: 8 }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua (pembeli/penerima)", klien: true }],
    sections: [{ title: "Perbuatan yang Ditegaskan", fields: [sel("jenis", "Jenis", ["Jual Beli", "Hibah"]), tgl("tanggalAsal", "Tanggal perbuatan semula"), t("buktiAsal", "Bukti semula", "kwitansi tanggal ... / surat jual beli di bawah tangan tanggal ..."), ...TANAH, rp("harga", "Harga yang telah dibayar (Rp; untuk jual beli)")] }],
    premis: [`bahwa pada tanggal {tanggalAsal:tgl} antara Pihak Pertama dan Pihak Kedua telah dilakukan {jenis} atas ${SEBUT_TANAH} (selanjutnya disebut "Tanah"), sebagaimana ternyata dari {buktiAsal};`, "bahwa para pihak bermaksud menegaskan perbuatan hukum tersebut dalam akta ini."],
    pasal: [
      ["Pihak Pertama dengan ini menegaskan dan mengakui dengan sebenar-benarnya bahwa {jenis} tersebut benar telah dilakukan, dan sejak tanggal {tanggalAsal:tgl} Tanah telah diserahkan kepada serta dikuasai oleh Pihak Kedua."],
      { jika: "harga", isi: ["Harga sebesar {harga:rp} telah dibayar lunas oleh Pihak Kedua dan telah diterima oleh Pihak Pertama; Pihak Pertama tidak mempunyai tagihan apa pun lagi mengenai hal itu."] },
      ["Pihak Pertama menjamin Tanah tidak pernah dialihkan atau dijaminkan kepada pihak lain dan tidak dalam sengketa, serta berjanji membantu Pihak Kedua, setiap kali diminta, untuk menandatangani akta pemindahan hak di hadapan Pejabat Pembuat Akta Tanah dan surat lain yang diperlukan untuk pendaftaran peralihan hak."],
      [AHLI_WARIS]
    ],
    subject: "Penegasan {jenis} {hak}",
    notes: ["Akta penegasan tidak menggantikan akta PPAT; pendaftaran peralihan hak tetap memerlukan akta PPAT atau putusan pengadilan.", "Bila pihak semula sudah meninggal, seluruh ahli warisnya harus hadir dengan bukti keterangan waris."],
    checklist: ["KTP & KK Para Pihak", "Bukti Jual Beli/Hibah Semula (kwitansi, surat di bawah tangan)", "Sertipikat / Bukti Hak", "SPPT PBB", "?Surat Keterangan Waris & Akta Kematian"]
  },
  {
    key: "pengalihan_sewa",
    title: "Akta Pengalihan Hak Sewa",
    judul: "PENGALIHAN HAK SEWA",
    category: "Perjanjian",
    description: "Pengalihan hak sewa (oper kontrak) dari penyewa lama kepada penyewa baru dengan persetujuan pemilik.",
    pihak: [{ key: "lama", sebut: "Pihak Pertama", label: "Pihak Pertama (penyewa lama)" }, { key: "baru", sebut: "Pihak Kedua", label: "Pihak Kedua (penyewa baru)", klien: true }, { key: "pemilik", sebut: "Pemilik", label: "Pemilik (yang menyetujui)", min: 0 }],
    sections: [{ title: "Sewa yang Dialihkan", fields: [t("objek", "Objek sewa", "sebuah ruko di Jalan ... Nomor ..., Kota Bogor"), t("perjanjianSewa", "Perjanjian sewa semula", "akta Perjanjian Sewa Nomor ... tanggal ..., dibuat di hadapan ..."), tgl("sisaSampai", "Masa sewa berakhir"), rp("pengganti", "Uang pengganti / kompensasi (Rp)"), t("persetujuanPemilik", "Persetujuan pemilik (bila tidak ikut menghadap)", "surat persetujuan tanggal ...")] }],
    premis: ["bahwa berdasarkan {perjanjianSewa}, Pihak Pertama adalah penyewa atas {objek} (selanjutnya disebut \"Objek Sewa\") dengan masa sewa sampai dengan tanggal {sisaSampai:tgl};", "<<bahwa pemilik Objek Sewa telah menyetujui pengalihan ini sebagaimana ternyata dari {persetujuanPemilik};>>"],
    pasal: [
      ["Pihak Pertama dengan ini mengalihkan kepada Pihak Kedua, yang dengan ini menerima pengalihan, seluruh hak dan kewajiban Pihak Pertama selaku penyewa berdasarkan perjanjian sewa tersebut untuk sisa masa sewa sampai dengan tanggal {sisaSampai:tgl}."],
      ["Untuk pengalihan ini Pihak Kedua membayar kepada Pihak Pertama uang sebesar {pengganti:rp}, yang telah diterima lunas, dan untuk penerimaannya akta ini berlaku pula sebagai kwitansi yang sah."],
      ["Objek Sewa diserahkan kepada Pihak Kedua pada hari ini. Kewajiban penyewa sampai dengan hari ini tetap menjadi tanggungan Pihak Pertama; sejak hari ini menjadi tanggungan Pihak Kedua."],
      ["Pihak Kedua menyatakan telah membaca dan menerima seluruh ketentuan perjanjian sewa semula dan mengikatkan diri untuk memenuhinya kepada pemilik."],
      { jika: "pemilik", isi: ["Pemilik yang turut menghadap menyatakan menyetujui pengalihan hak sewa ini dan menerima Pihak Kedua sebagai penyewa."] },
      [biaya("Pihak Kedua")]
    ],
    subject: "Pengalihan hak sewa {objek}",
    notes: ["Penyewa tidak boleh mengulangsewakan atau melepaskan sewanya kepada orang lain tanpa izin pemilik (Pasal 1559 KUHPerdata, PP 44/1994); persetujuan pemilik wajib ada."],
    checklist: ["KTP Para Pihak", "Perjanjian Sewa Semula", "Persetujuan Tertulis Pemilik / KTP Pemilik", "Bukti Pembayaran Sewa & Tagihan Terakhir (listrik, air)", "?Bukti Kepemilikan Objek Sewa"]
  },
  {
    key: "bangun_guna_serah",
    title: "Akta Perjanjian Bangun Guna Serah",
    judul: "PERJANJIAN BANGUN GUNA SERAH",
    category: "Perjanjian",
    description: "Kerja sama pemanfaatan tanah: investor membangun, mengelola selama jangka waktu tertentu, lalu menyerahkan bangunan kepada pemilik tanah (BOT).",
    pihak: [{ key: "pemilik", sebut: "Pihak Pertama", label: "Pihak Pertama (pemilik tanah)", pasangan: true }, { key: "investor", sebut: "Pihak Kedua", label: "Pihak Kedua (investor/pembangun)", klien: true }],
    sections: [{ title: "Tanah & Proyek", fields: [...TANAH, t("bangunan", "Bangunan yang akan didirikan", "gedung pertokoan 3 (tiga) lantai"), rp("nilaiInvestasi", "Perkiraan nilai investasi (Rp)"), num("lamaBangun", "Masa pembangunan (bulan)"), num("lamaKelola", "Masa pengelolaan (tahun)"), t("kontribusi", "Kontribusi kepada pemilik tanah", "Rp100.000.000,00 (seratus juta Rupiah) setiap tahun"), ta("ketentuanLain", "Ketentuan lain (satu per baris; opsional)")] }],
    premis: [`bahwa Pihak Pertama adalah pemilik ${SEBUT_TANAH} (selanjutnya disebut "Tanah");`, "bahwa Pihak Kedua bermaksud membangun dan mengelola {bangunan} di atas Tanah atas biayanya sendiri, dan pada akhir masa perjanjian menyerahkannya kepada Pihak Pertama."],
    pasal: [
      ["Pihak Pertama mengizinkan Pihak Kedua untuk membangun {bangunan} (selanjutnya disebut \"Bangunan\") di atas Tanah atas biaya dan risiko Pihak Kedua sepenuhnya, dengan perkiraan nilai investasi sebesar {nilaiInvestasi:rp}."],
      ["Pembangunan wajib diselesaikan dalam waktu {lamaBangun:angka} bulan sejak izin mendirikan bangunan diperoleh. Setelah itu Pihak Kedua berhak mengelola dan memungut hasil Bangunan selama {lamaKelola:angka} tahun."],
      ["Selama masa pengelolaan Pihak Kedua memberikan kontribusi kepada Pihak Pertama berupa {kontribusi}, dan menanggung seluruh pajak, pemeliharaan, serta asuransi Bangunan."],
      ["Pada akhir masa pengelolaan, atau lebih awal bila perjanjian berakhir, Pihak Kedua wajib menyerahkan Bangunan berikut perlengkapannya kepada Pihak Pertama dalam keadaan baik dan layak pakai, tanpa ganti rugi apa pun."],
      ["Pihak Kedua tidak boleh mengalihkan perjanjian ini atau menjaminkan Tanah tanpa persetujuan tertulis Pihak Pertama. Pihak Pertama tidak akan mengalihkan atau membebani Tanah dengan cara yang merugikan Pihak Kedua selama perjanjian berlangsung."],
      [`Apabila salah satu pihak lalai memenuhi kewajibannya dan tidak memperbaikinya dalam 30 (tiga puluh) hari setelah ditegur secara tertulis, pihak lainnya berhak mengakhiri perjanjian dan menuntut ganti rugi; ${LALAI}.`],
      { jika: "ketentuanLain", isi: ["Ketentuan lain yang disepakati:", { baris: "ketentuanLain" }] },
      [AHLI_WARIS, MUSYAWARAH],
      [biaya("Pihak Kedua")]
    ],
    subject: "Bangun Guna Serah atas {hak}",
    notes: ["Bila tanah milik pemerintah/BUMN, berlaku aturan khusus pemanfaatan barang milik negara/daerah. Untuk tanah Hak Milik perorangan, pertimbangkan pemberian HGB di atas Hak Milik dengan akta PPAT agar Pihak Kedua mempunyai hak kebendaan.", "Pastikan perizinan (PBG, KKPR) dan pajak (PPh final atas pengalihan bangunan di akhir masa BGS) diperhitungkan [VERIFIKASI]."],
    checklist: ["KTP & NPWP Para Pihak", "KTP Pasangan Pemilik Tanah (persetujuan)", "Sertipikat Asli", "SPPT PBB", "Akta Pendirian & SK Investor (badan hukum)", "?Rencana Bangunan / Studi Kelayakan", "?KKPR & Perizinan"]
  }
];
