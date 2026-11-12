import type { Cfg } from "./types";
import { AHLI_WARIS, LALAI, LEPAS_1266, MUSYAWARAH, biaya, num, rp, sel, t, ta, tgl } from "./klausa";

export const D4_PERJANJIAN: Cfg[] = [
  {
    key: "jual_beli_umum",
    title: "Akta Jual Beli (Bukan Tanah)",
    judul: "JUAL BELI",
    sub: "{jenisObjek:up}",
    category: "Perjanjian",
    description: "Jual beli benda selain tanah: kendaraan, mesin, persediaan, usaha, bangunan tanpa tanah, dan sebagainya.",
    pihak: [{ key: "penjual", sebut: "Penjual", label: "Penjual", pasangan: true }, { key: "pembeli", sebut: "Pembeli", label: "Pembeli", klien: true }],
    sections: [{ title: "Objek & Harga", fields: [t("jenisObjek", "Jenis objek (untuk judul)", "Kendaraan Bermotor", false), ta("objek", "Uraian objek (satu per baris)", "1 (satu) unit mobil merek ..., tahun ..., nomor polisi ..., nomor rangka ..., nomor mesin ..., BPKB Nomor ..."), t("buktiMilik", "Bukti kepemilikan", "BPKB dan faktur atas nama Penjual"), rp("harga", "Harga (Rp)"), sel("bayar", "Pembayaran", ["Lunas pada saat akta ini ditandatangani", "Bertahap sesuai jadwal"]), ta("jadwal", "Jadwal pembayaran (bila bertahap; satu per baris)"), t("penyerahan", "Penyerahan objek", "pada hari ini di tempat objek berada")] }],
    pasal: [
      ["Penjual dengan ini menjual dan menyerahkan kepada Pembeli, yang dengan ini membeli dan menerima penyerahan dari Penjual:", { baris: "objek" }, "(selanjutnya disebut \"Objek\")<<, yang kepemilikannya ternyata dari {buktiMilik}>>."],
      { jika: "bayar=Lunas", isi: ["Jual beli ini dilakukan dengan harga sebesar {harga:rp}, yang telah dibayar lunas oleh Pembeli kepada Penjual, dan untuk penerimaannya akta ini berlaku pula sebagai kwitansi yang sah."] },
      { jika: "bayar=Bertahap", isi: ["Jual beli ini dilakukan dengan harga sebesar {harga:rp}, yang dibayar oleh Pembeli kepada Penjual secara bertahap sebagai berikut:", { baris: "jadwal" }, `Apabila Pembeli tidak membayar pada waktunya, ${LALAI}.`] },
      ["Objek diserahkan oleh Penjual kepada Pembeli {penyerahan}, berikut seluruh surat dan dokumen yang berkaitan. Sejak penyerahan, segala keuntungan, kerugian, dan risiko atas Objek beralih kepada Pembeli."],
      ["Penjual menjamin bahwa Objek benar miliknya, tidak dijaminkan, tidak dalam sitaan, tidak tersangkut perkara, dan belum dijual kepada pihak lain, serta menjamin Pembeli terhadap cacat tersembunyi dan tuntutan pihak mana pun mengenai Objek."],
      ["Penjual memberi kuasa kepada Pembeli untuk mengurus balik nama dan pendaftaran Objek pada instansi yang berwenang sepanjang diperlukan."],
      [biaya("Pembeli")]
    ],
    subject: "Jual beli {jenisObjek}",
    notes: ["Hanya untuk benda selain tanah. Untuk tanah dan satuan rumah susun gunakan Akta Jual Beli PPAT; untuk saham gunakan Akta Peralihan Saham; untuk piutang gunakan Akta Pengalihan Piutang (Cessie).", "Bangunan yang dijual terpisah dari tanahnya: pastikan pemilik tanah mengetahui/menyetujui."],
    checklist: ["KTP & KK Penjual dan Pembeli", "KTP Pasangan Penjual (persetujuan)", "Bukti Kepemilikan Objek (BPKB, faktur, invoice, sertifikat)", "?NPWP Para Pihak", "?Akta Pendirian & SK (bila pihak badan usaha)"]
  },
  {
    key: "hibah_umum",
    title: "Akta Hibah (Bukan Tanah)",
    judul: "HIBAH",
    category: "Keluarga",
    description: "Hibah benda bergerak, uang, atau hak selain tanah (Pasal 1666 dan 1682 KUHPerdata).",
    pihak: [{ key: "pemberi", sebut: "Pemberi Hibah", label: "Pemberi Hibah", pasangan: true }, { key: "penerima", sebut: "Penerima Hibah", label: "Penerima Hibah", klien: true }],
    sections: [{ title: "Hibah", fields: [t("hubungan", "Hubungan penerima dengan pemberi (opsional)", "anak kandung"), ta("objek", "Benda yang dihibahkan (satu per baris)", "uang tunai sebesar Rp..."), rp("nilai", "Nilai hibah (Rp)"), ta("syarat", "Syarat / beban hibah (opsional; satu per baris)")] }],
    pasal: [
      ["Pemberi Hibah dengan ini menghibahkan dengan cuma-cuma dan tidak dapat ditarik kembali kepada Penerima Hibah<<, yaitu {hubungan} Pemberi Hibah>>, yang dengan ini menerima hibah tersebut:", { baris: "objek" }, "<<yang seluruhnya bernilai {nilai:rp}.>>"],
      ["Benda yang dihibahkan diserahkan kepada Penerima Hibah pada hari ini, dan sejak hari ini menjadi milik serta tanggungan Penerima Hibah."],
      ["Pemberi Hibah menjamin bahwa benda yang dihibahkan benar miliknya, tidak dijaminkan, tidak dalam sengketa, dan hibah ini tidak melanggar hak pihak lain."],
      { jika: "syarat", isi: ["Hibah ini diberikan dengan syarat sebagai berikut:", { baris: "syarat" }] },
      [biaya("Penerima Hibah")]
    ],
    subject: "Hibah kepada penerima hibah",
    notes: ["Hibah wajib dengan akta Notaris kecuali pemberian benda bergerak bertubuh dari tangan ke tangan (Pasal 1682, 1687 KUHPerdata). Hibah tanah memakai akta PPAT.", "Hibah tidak boleh melanggar bagian mutlak ahli waris; hibah antara suami-istri selama perkawinan dilarang (Pasal 1678 KUHPerdata). Untuk yang beragama Islam batas 1/3 harta [VERIFIKASI: KHI Pasal 210]."],
    checklist: ["KTP & KK Pemberi dan Penerima Hibah", "KTP Pasangan Pemberi Hibah (persetujuan)", "Bukti Kepemilikan Benda yang Dihibahkan", "?Bukti Hubungan Keluarga", "?Persetujuan Ahli Waris Lain"]
  },
  {
    key: "perdamaian",
    title: "Akta Perdamaian",
    judul: "PERDAMAIAN",
    category: "Perjanjian",
    description: "Perjanjian perdamaian (dading) untuk mengakhiri atau mencegah sengketa (Pasal 1851 KUHPerdata).",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama", klien: true }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua" }],
    sections: [{ title: "Sengketa & Kesepakatan", fields: [ta("sengketa", "Uraian sengketa", "sengketa mengenai kepemilikan ... / pembayaran ..."), t("perkara", "Nomor perkara (bila sudah di pengadilan)", "perkara Nomor .../Pdt.G/.../PN ..."), ta("kesepakatan", "Isi kesepakatan (satu per baris)"), t("sanksi", "Akibat bila ingkar (opsional)", "denda sebesar Rp... untuk setiap hari keterlambatan")] }],
    premis: ["bahwa di antara para pihak terdapat {sengketa}<<, yang terdaftar sebagai {perkara}>>;", "bahwa para pihak sepakat mengakhiri sengketa tersebut secara damai."],
    pasal: [
      ["Para pihak sepakat menyelesaikan sengketa tersebut dengan ketentuan sebagai berikut:", { baris: "kesepakatan" }],
      ["Dengan dilaksanakannya kesepakatan tersebut, para pihak saling memberikan pembebasan dan pelunasan sepenuhnya (acquit et de charge) dan tidak akan saling mengajukan tuntutan apa pun lagi, baik perdata maupun pidana, mengenai hal yang didamaikan."],
      { jika: "perkara", isi: ["Para pihak akan mencabut {perkara} dan/atau memohon agar perdamaian ini dikuatkan dalam putusan perdamaian, dalam waktu selambat-lambatnya 14 (empat belas) hari sejak akta ini ditandatangani."] },
      { jika: "sanksi", isi: [`Pihak yang tidak memenuhi kesepakatan ini dikenakan {sanksi}; ${LALAI}.`] },
      ["Perdamaian ini mempunyai kekuatan seperti putusan Hakim tingkat akhir bagi para pihak dan tidak dapat dibantah dengan alasan kekhilafan mengenai hukum atau karena salah satu pihak dirugikan.", AHLI_WARIS],
      [biaya("para pihak masing-masing untuk setengah bagian")]
    ],
    subject: "Perdamaian para pihak",
    notes: ["Perdamaian harus tertulis (Pasal 1851 KUHPerdata) dan hanya mengenai hal yang dapat dikuasai bebas oleh para pihak; tidak menghapus penuntutan pidana yang bukan delik aduan.", "Untuk kekuatan eksekutorial, mintakan putusan perdamaian (akta van dading) ke pengadilan."],
    checklist: ["KTP Para Pihak", "Dokumen Sengketa (gugatan, somasi, perjanjian asal)", "?Surat Kuasa bila Diwakili", "?Akta Pendirian & SK (bila pihak badan usaha)"]
  },
  {
    key: "sewa_beli",
    title: "Akta Perjanjian Sewa Beli",
    judul: "PERJANJIAN SEWA BELI",
    category: "Perjanjian",
    description: "Jual beli dengan angsuran di mana hak milik baru beralih setelah seluruh harga lunas.",
    pihak: [{ key: "penjual", sebut: "Pihak Pertama", label: "Pihak Pertama (pemilik/penjual)", pasangan: true }, { key: "pembeli", sebut: "Pihak Kedua", label: "Pihak Kedua (penyewa beli)", klien: true }],
    sections: [{ title: "Objek & Angsuran", fields: [ta("objek", "Objek (satu per baris)"), rp("harga", "Harga seluruhnya (Rp)"), rp("uangMuka", "Uang muka (Rp)"), num("kali", "Jumlah angsuran (kali)"), rp("angsuran", "Besar tiap angsuran (Rp)"), t("jatuhTempo", "Jatuh tempo angsuran", "setiap tanggal 5 (lima) tiap bulan, mulai bulan ..."), t("denda", "Denda keterlambatan", "1‰ (satu permil) per hari dari angsuran yang tertunggak")] }],
    pasal: [
      ["Pihak Pertama menyerahkan secara sewa beli kepada Pihak Kedua, yang menerimanya:", { baris: "objek" }, "(selanjutnya disebut \"Objek\")."],
      ["Harga sewa beli seluruhnya sebesar {harga:rp}<<, dengan uang muka sebesar {uangMuka:rp} yang telah dibayar pada hari ini>>, dan sisanya dibayar dalam {kali:angka} kali angsuran masing-masing sebesar {angsuran:rp}, {jatuhTempo}."],
      ["Objek diserahkan untuk dipakai oleh Pihak Kedua pada hari ini, tetapi hak milik atas Objek tetap berada pada Pihak Pertama dan baru beralih kepada Pihak Kedua setelah seluruh harga dibayar lunas. Selama itu Pihak Kedua dilarang menjual, menjaminkan, atau mengalihkan Objek."],
      ["Pihak Kedua wajib memelihara Objek dengan baik dan menanggung segala risiko, pajak, dan biaya atas Objek sejak diserahkan."],
      [`Atas setiap keterlambatan Pihak Kedua dikenakan denda sebesar {denda}. Apabila Pihak Kedua menunggak 3 (tiga) kali angsuran berturut-turut, ${LALAI}, dan Pihak Pertama berhak mengakhiri perjanjian serta mengambil kembali Objek; pembayaran yang telah diterima diperhitungkan sebagai sewa dan ganti rugi secara patut.`, LEPAS_1266],
      ["Setelah seluruh harga lunas, Pihak Pertama wajib menyerahkan surat-surat kepemilikan Objek dan membantu balik nama kepada Pihak Kedua.", AHLI_WARIS],
      [biaya("Pihak Kedua")]
    ],
    subject: "Sewa beli {harga:rp}",
    notes: ["Sewa beli tanah/rumah berisiko bagi pembeli (hak belum beralih); pertimbangkan PPJB dengan angsuran.", "Klausul penarikan barang dan hangusnya angsuran harus patut; perhatikan UU Perlindungan Konsumen bila penjual pelaku usaha."],
    checklist: ["KTP & KK Para Pihak", "KTP Pasangan Pemilik (persetujuan)", "Bukti Kepemilikan Objek", "?NPWP Para Pihak"]
  },
  {
    key: "pinjam_pakai",
    title: "Akta Perjanjian Pinjam Pakai",
    judul: "PERJANJIAN PINJAM PAKAI",
    category: "Perjanjian",
    description: "Peminjaman barang/tanah/bangunan untuk dipakai dengan cuma-cuma (Pasal 1740 KUHPerdata).",
    pihak: [{ key: "pemilik", sebut: "Pihak Pertama", label: "Pihak Pertama (pemilik)", pasangan: true }, { key: "pemakai", sebut: "Pihak Kedua", label: "Pihak Kedua (pemakai)", klien: true }],
    sections: [{ title: "Objek", fields: [t("objek", "Objek pinjam pakai", "sebidang tanah dan bangunan di ..."), t("peruntukan", "Peruntukan", "tempat tinggal / kantor ..."), t("jangka", "Jangka waktu", "5 (lima) tahun", false), tgl("mulai", "Mulai"), tgl("akhir", "Berakhir")] }],
    pasal: [
      ["Pihak Pertama meminjamkan untuk dipakai dengan cuma-cuma kepada Pihak Kedua, yang menerima pinjam pakai, {objek} (selanjutnya disebut \"Objek\"), hanya untuk {peruntukan}."],
      ["Pinjam pakai ini berlaku selama {jangka}<<, terhitung sejak tanggal {mulai:tgl} sampai dengan tanggal {akhir:tgl}>>, dan dapat diperpanjang atas kesepakatan tertulis para pihak."],
      ["Objek tetap milik Pihak Pertama. Pihak Kedua wajib memelihara Objek sebagai pemilik yang baik, menanggung biaya pemakaian dan pemeliharaan sehari-hari, serta dilarang mengalihkan, menyewakan, meminjamkan kepada pihak lain, atau mengubah Objek tanpa persetujuan tertulis Pihak Pertama."],
      ["Pada saat pinjam pakai berakhir, Pihak Kedua wajib mengembalikan Objek dalam keadaan baik dan kosong tanpa menuntut ganti rugi apa pun. Pihak Pertama berhak meminta kembali Objek lebih awal apabila ia memerlukannya karena alasan mendesak yang tidak terduga."],
      [AHLI_WARIS],
      [biaya("Pihak Kedua")]
    ],
    subject: "Pinjam pakai {objek}",
    notes: ["Pinjam pakai bersifat cuma-cuma; bila ada imbalan menjadi sewa-menyewa.", "Untuk aset pemerintah/BUMN berlaku aturan pinjam pakai barang milik negara/daerah."],
    checklist: ["KTP Para Pihak", "KTP Pasangan Pemilik (persetujuan)", "Bukti Kepemilikan Objek", "?Akta Pendirian & SK (bila pihak badan usaha)"]
  },
  {
    key: "pemborongan",
    title: "Akta Perjanjian Pemborongan Pekerjaan",
    judul: "PERJANJIAN PEMBORONGAN PEKERJAAN",
    category: "Perjanjian",
    description: "Perjanjian pemborongan/konstruksi antara pemberi tugas dan pemborong (kontraktor).",
    pihak: [{ key: "pemberi", sebut: "Pihak Pertama", label: "Pihak Pertama (pemberi tugas)", klien: true }, { key: "pemborong", sebut: "Pihak Kedua", label: "Pihak Kedua (pemborong)" }],
    sections: [{ title: "Pekerjaan", fields: [t("pekerjaan", "Pekerjaan", "pembangunan rumah tinggal 2 (dua) lantai"), t("lokasi", "Lokasi"), t("dokumen", "Gambar & spesifikasi", "gambar rencana dan Rencana Anggaran Biaya tanggal ..."), rp("nilai", "Nilai borongan (Rp)"), ta("termin", "Termin pembayaran (satu per baris)", "30% (tiga puluh persen) setelah pekerjaan fondasi selesai"), num("lama", "Waktu pelaksanaan (hari kalender)"), tgl("mulai", "Tanggal mulai"), t("denda", "Denda keterlambatan", "1‰ (satu permil) dari nilai borongan per hari, paling banyak 5% (lima persen)"), num("pemeliharaan", "Masa pemeliharaan (hari)")] }],
    pasal: [
      [{ j: "LINGKUP PEKERJAAN" }, "Pihak Pertama memberikan tugas kepada Pihak Kedua, yang menerima tugas, untuk melaksanakan {pekerjaan} di {lokasi} (selanjutnya disebut \"Pekerjaan\"), sesuai {dokumen} yang merupakan bagian tidak terpisahkan dari perjanjian ini."],
      [{ j: "NILAI DAN PEMBAYARAN" }, "Nilai borongan Pekerjaan sebesar {nilai:rp}, bersifat tetap (lump sum) dan sudah termasuk bahan, upah, peralatan, serta pajak, dibayar dengan termin sebagai berikut:", { baris: "termin" }],
      [{ j: "WAKTU PELAKSANAAN" }, "Pekerjaan wajib diselesaikan dalam waktu {lama:angka} hari kalender<< terhitung sejak tanggal {mulai:tgl}>>. Atas keterlambatan Pihak Kedua dikenakan denda sebesar {denda}, kecuali keterlambatan karena keadaan memaksa atau perubahan pekerjaan atas perintah Pihak Pertama."],
      [{ j: "PEKERJAAN TAMBAH KURANG" }, "Perubahan, penambahan, atau pengurangan pekerjaan hanya sah bila diperintahkan secara tertulis oleh Pihak Pertama dan disepakati nilainya."],
      [{ j: "SERAH TERIMA DAN PEMELIHARAAN" }, "Setelah Pekerjaan selesai dilakukan serah terima pertama dengan berita acara. Pihak Kedua menjamin dan wajib memperbaiki atas biayanya sendiri setiap cacat selama masa pemeliharaan {pemeliharaan:angka} hari sejak serah terima pertama, serta bertanggung jawab atas kegagalan bangunan sesuai peraturan perundang-undangan."],
      [{ j: "TANGGUNG JAWAB" }, "Pihak Kedua bertanggung jawab atas keselamatan kerja, tenaga kerja, dan kerugian pihak ketiga yang timbul dari pelaksanaan Pekerjaan, serta tidak boleh mengalihkan Pekerjaan kepada pihak lain tanpa persetujuan tertulis Pihak Pertama."],
      [{ j: "PENGAKHIRAN DAN PERSELISIHAN" }, `Apabila Pihak Kedua lalai dan tidak memperbaikinya dalam 14 (empat belas) hari setelah ditegur secara tertulis, Pihak Pertama berhak mengakhiri perjanjian dan menunjuk pihak lain atas beban Pihak Kedua; ${LALAI}.`, LEPAS_1266, MUSYAWARAH],
      [biaya("Pihak Pertama")]
    ],
    subject: "Pemborongan {pekerjaan}",
    notes: ["Kontrak kerja konstruksi sekurang-kurangnya memuat hal dalam Pasal 47 UU 2/2017 tentang Jasa Konstruksi; pemborong harus memiliki perizinan usaha jasa konstruksi [VERIFIKASI].", "Lekatkan gambar, spesifikasi, dan RAB pada minuta."],
    checklist: ["KTP Para Pihak", "Akta Pendirian, SK & NIB Pemborong", "Gambar Rencana, Spesifikasi & RAB", "?Persetujuan Bangunan Gedung (PBG)", "?Jaminan Pelaksanaan"]
  },
  {
    key: "waralaba",
    title: "Akta Perjanjian Waralaba",
    judul: "PERJANJIAN WARALABA",
    category: "Perjanjian",
    description: "Perjanjian waralaba (franchise) antara pemberi dan penerima waralaba.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Waralaba", label: "Pemberi Waralaba", klien: true }, { key: "penerima", sebut: "Penerima Waralaba", label: "Penerima Waralaba" }],
    sections: [{ title: "Waralaba", fields: [t("merek", "Merek / nama usaha", "\"...\""), t("hki", "Pendaftaran HKI", "Sertifikat Merek Nomor IDM... kelas ..."), t("usaha", "Jenis usaha", "restoran cepat saji"), t("wilayah", "Wilayah / lokasi gerai"), t("jangka", "Jangka waktu", "5 (lima) tahun", false), rp("feeAwal", "Biaya waralaba awal (Rp)"), t("royalti", "Royalti", "5% (lima persen) dari omzet kotor per bulan"), ta("dukungan", "Dukungan pemberi waralaba (satu per baris)", "pelatihan awal bagi karyawan"), t("stpw", "Prospektus / STPW (opsional)", "Surat Tanda Pendaftaran Waralaba Nomor ...")] }],
    premis: ["bahwa Pemberi Waralaba adalah pemilik sistem usaha {usaha} dengan merek {merek}<<, terdaftar dengan {hki}>><<, serta telah memiliki {stpw}>>;", "bahwa Penerima Waralaba telah menerima dan mempelajari prospektus penawaran waralaba dan bermaksud menjalankan usaha tersebut."],
    pasal: [
      ["Pemberi Waralaba memberikan kepada Penerima Waralaba hak untuk menjalankan usaha {usaha} dengan memakai merek {merek} dan sistem usaha milik Pemberi Waralaba, di {wilayah}, selama {jangka}."],
      ["Penerima Waralaba membayar biaya waralaba awal sebesar {feeAwal:rp} pada saat akta ini ditandatangani, dan royalti sebesar {royalti}."],
      ["Pemberi Waralaba wajib memberikan pembinaan dan dukungan secara berkesinambungan berupa:", { baris: "dukungan" }],
      ["Penerima Waralaba wajib menjalankan usaha sesuai standar dan pedoman operasional, menjaga rahasia dagang, menggunakan bahan dan perlengkapan sesuai ketentuan, dan tidak menjalankan usaha sejenis yang bersaing selama perjanjian berlangsung."],
      ["Hak kekayaan intelektual tetap milik Pemberi Waralaba. Penerima Waralaba tidak boleh mengalihkan hak waralaba atau menunjuk penerima waralaba lanjutan tanpa persetujuan tertulis Pemberi Waralaba."],
      [`Perjanjian berakhir karena jangka waktunya habis atau diakhiri karena pelanggaran yang tidak diperbaiki dalam 30 (tiga puluh) hari setelah teguran tertulis; ${LALAI}. Setelah berakhir Penerima Waralaba wajib menghentikan pemakaian merek dan sistem usaha.`, LEPAS_1266],
      ["Perjanjian ini tunduk pada hukum Indonesia.", MUSYAWARAH],
      [biaya("Penerima Waralaba")]
    ],
    subject: "Waralaba {merek}",
    notes: ["Perjanjian waralaba wajib tertulis, berbahasa Indonesia, memuat klausul minimum, dan didahului prospektus; pemberi dan penerima waralaba wajib memiliki STPW [VERIFIKASI: PP 35/2024 tentang Waralaba].", "Lisensi merek dalam waralaba sebaiknya dicatatkan pada DJKI."],
    checklist: ["KTP Para Pihak", "Akta Pendirian, SK & NIB Para Pihak", "Prospektus Penawaran Waralaba", "Sertifikat / Bukti Pendaftaran Merek", "?STPW Pemberi Waralaba"],
    duty: [{ title: "Ingatkan pendaftaran perjanjian waralaba (STPW) oleh penerima waralaba", days: 30, basis: "PP Waralaba: kewajiban pendaftaran STPW [VERIFIKASI tenggat]" }]
  },
  {
    key: "lisensi",
    title: "Akta Perjanjian Lisensi",
    judul: "PERJANJIAN LISENSI",
    sub: "{jenisHki:up}",
    category: "Perjanjian",
    description: "Pemberian lisensi atas merek, hak cipta, paten, atau kekayaan intelektual lain.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Lisensi", label: "Pemberi Lisensi", klien: true }, { key: "penerima", sebut: "Penerima Lisensi", label: "Penerima Lisensi" }],
    sections: [{ title: "Lisensi", fields: [sel("jenisHki", "Jenis kekayaan intelektual", ["Merek", "Hak Cipta", "Paten", "Desain Industri", "Rahasia Dagang"]), t("objek", "Objek lisensi", "merek \"...\" kelas ..., Sertifikat Nomor IDM..."), sel("sifat", "Sifat lisensi", ["non-eksklusif", "eksklusif"]), t("wilayah", "Wilayah", "seluruh wilayah Republik Indonesia"), t("jangka", "Jangka waktu", "3 (tiga) tahun", false), t("royalti", "Royalti / imbalan", "Rp... per tahun / ...% dari penjualan bersih"), t("lingkup", "Lingkup pemakaian", "produksi dan penjualan produk ...")] }],
    pasal: [
      ["Pemberi Lisensi memberikan kepada Penerima Lisensi lisensi yang bersifat {sifat} untuk menggunakan {objek} (selanjutnya disebut \"Objek Lisensi\") untuk {lingkup}, di {wilayah}, selama {jangka}."],
      ["Atas lisensi ini Penerima Lisensi membayar royalti sebesar {royalti}, dan wajib menyampaikan laporan pemakaian yang dapat diperiksa oleh Pemberi Lisensi."],
      ["Pemberi Lisensi menjamin bahwa ia adalah pemegang hak yang sah atas Objek Lisensi dan berhak memberikan lisensi ini. Hak atas Objek Lisensi tetap milik Pemberi Lisensi; Penerima Lisensi tidak boleh memberikan sublisensi atau mengalihkan lisensi tanpa persetujuan tertulis."],
      ["Penerima Lisensi wajib menjaga mutu barang/jasa yang memakai Objek Lisensi dan segera memberitahukan setiap pelanggaran oleh pihak ketiga yang diketahuinya."],
      [`Perjanjian dapat diakhiri apabila salah satu pihak melanggar dan tidak memperbaikinya dalam 30 (tiga puluh) hari setelah teguran tertulis; ${LALAI}.`, LEPAS_1266, MUSYAWARAH],
      [biaya("Penerima Lisensi")]
    ],
    subject: "Lisensi {jenisHki}",
    notes: ["Perjanjian lisensi wajib dicatatkan pada DJKI agar berakibat hukum terhadap pihak ketiga (PP 36/2018) [VERIFIKASI].", "Lisensi tidak boleh memuat ketentuan yang merugikan perekonomian Indonesia atau menghambat penguasaan teknologi."],
    checklist: ["KTP Para Pihak", "Sertifikat / Bukti Pendaftaran HKI", "Akta Pendirian & SK (bila pihak badan usaha)", "?NPWP Para Pihak"],
    duty: [{ title: "Ingatkan pencatatan perjanjian lisensi ke DJKI", days: 30, basis: "PP 36/2018: lisensi yang tidak dicatat tidak berakibat hukum terhadap pihak ketiga [VERIFIKASI tenggat]" }]
  },
  {
    key: "distribusi",
    title: "Akta Perjanjian Distribusi / Keagenan",
    judul: "PERJANJIAN {bentuk:up}",
    category: "Perjanjian",
    description: "Penunjukan distributor atau agen untuk memasarkan barang/jasa prinsipal.",
    pihak: [{ key: "prinsipal", sebut: "Prinsipal", label: "Prinsipal", klien: true }, { key: "mitra", sebut: "Mitra", label: "Distributor / Agen" }],
    sections: [{ title: "Penunjukan", fields: [sel("bentuk", "Bentuk", ["Distribusi", "Keagenan"]), t("produk", "Produk", "produk ... merek ..."), sel("sifat", "Sifat penunjukan", ["non-eksklusif", "eksklusif (tunggal)"]), t("wilayah", "Wilayah pemasaran", "Provinsi Jawa Barat"), t("jangka", "Jangka waktu", "2 (dua) tahun", false), t("target", "Target penjualan (opsional)", "Rp... per tahun"), t("imbalan", "Harga / komisi", "harga distributor menurut daftar harga terlampir / komisi 5% (lima persen)"), t("bayar", "Syarat pembayaran", "30 (tiga puluh) hari sejak tanggal faktur")] }],
    pasal: [
      ["Prinsipal menunjuk Mitra, yang menerima penunjukan, sebagai pelaksana {bentuk} yang bersifat {sifat} untuk memasarkan {produk} (selanjutnya disebut \"Produk\") di wilayah {wilayah}, selama {jangka}."],
      { jika: "bentuk=Distribusi", isi: ["Mitra membeli Produk dari Prinsipal untuk dan atas namanya sendiri dan menjualnya kembali atas risikonya sendiri, dengan {imbalan} dan syarat pembayaran {bayar}."] },
      { jika: "bentuk=Keagenan", isi: ["Mitra bertindak untuk dan atas nama Prinsipal tanpa memperoleh hak milik atas Produk, dan atas penjualan yang berhasil memperoleh {imbalan}. Hasil penjualan disetorkan kepada Prinsipal dengan syarat {bayar}."] },
      ["Mitra wajib memasarkan Produk dengan sungguh-sungguh<<, memenuhi target penjualan sebesar {target}>>, menjaga nama baik Produk, dan tidak memasarkan produk pesaing tanpa persetujuan Prinsipal. Prinsipal wajib menyediakan Produk, informasi, dan dukungan pemasaran yang layak."],
      ["Hak atas merek dan kekayaan intelektual Produk tetap milik Prinsipal; Mitra hanya berhak memakainya untuk keperluan perjanjian ini."],
      [`Perjanjian dapat diakhiri sebelum waktunya apabila salah satu pihak melanggar dan tidak memperbaikinya dalam 30 (tiga puluh) hari setelah teguran tertulis; ${LALAI}. Pada saat berakhir, para pihak menyelesaikan seluruh kewajiban yang masih terutang.`, LEPAS_1266, MUSYAWARAH],
      [biaya("para pihak sesuai kesepakatan mereka")]
    ],
    subject: "{bentuk} {produk}",
    notes: ["Distributor/agen barang wajib memiliki perizinan berusaha dan perjanjiannya didaftarkan (STP) pada Kementerian Perdagangan; pemutusan sepihak sebelum berakhir tunduk pada ketentuan khusus [VERIFIKASI: Permendag 24/2021].", "Agen bertindak atas nama prinsipal; distributor atas nama sendiri. Pastikan pilihan bentuk sesuai praktik sebenarnya."],
    checklist: ["KTP Para Pihak", "Akta Pendirian, SK & NIB Para Pihak", "Daftar Produk & Harga", "?Bukti Pendaftaran Merek", "?Surat Penunjukan dari Prinsipal Luar Negeri (dilegalisasi)"]
  }
];
