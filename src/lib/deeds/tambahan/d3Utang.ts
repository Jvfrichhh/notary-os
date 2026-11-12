import type { Cfg } from "./types";
import { AHLI_WARIS, LALAI, biaya, num, rp, sel, t, ta, tgl } from "./klausa";

const POKOK = [t("perjanjianPokok", "Perjanjian utang yang dijamin/dialihkan", "Perjanjian Kredit Nomor ... tanggal ..."), t("debitur", "Debitor", "PT ... / Tuan ..."), rp("nilaiUtang", "Jumlah utang pokok (Rp)")];
const SYARIAH_NOTE = "Akad syariah harus sesuai fatwa DSN-MUI yang berlaku dan ketentuan internal bank/lembaga; mintakan konfirmasi Dewan Pengawas Syariah lembaga bila ragu [VERIFIKASI].";
const SYARIAH_CEK = ["KTP & KK Nasabah", "KTP Pasangan Nasabah (persetujuan)", "NPWP Nasabah", "Surat Persetujuan Pembiayaan (SP3 / Offering Letter)", "Surat Kuasa / Anggaran Dasar Lembaga Pembiayaan", "?Dokumen Objek Pembiayaan & Jaminan"];
const CIDERA = `Nasabah dinyatakan cidera janji apabila tidak memenuhi kewajiban pembayaran pada waktunya atau melanggar ketentuan akad ini; ${LALAI}. Dalam hal demikian seluruh kewajiban Nasabah menjadi jatuh tempo dan dapat ditagih seketika dan sekaligus, dan Bank berhak mengeksekusi jaminan sesuai peraturan perundang-undangan.`;
const SENGKETA_SY = "Perselisihan yang timbul dari akad ini diselesaikan secara musyawarah; apabila tidak tercapai, diselesaikan melalui Pengadilan Agama di tempat kedudukan hukum yang dipilih atau Badan Arbitrase Syariah Nasional sesuai kesepakatan para pihak.";

export const D3_UTANG: Cfg[] = [
  {
    key: "perjanjian_kredit",
    title: "Akta Perjanjian Kredit",
    judul: "PERJANJIAN KREDIT",
    category: "Perjanjian",
    description: "Perjanjian kredit antara kreditor (bank/koperasi/lembaga) dan debitor.",
    pihak: [{ key: "kreditur", sebut: "Kreditor", label: "Kreditor (wakil bank/lembaga)", klien: true }, { key: "debitur", sebut: "Debitor", label: "Debitor", pasangan: true }],
    sections: [{ title: "Fasilitas Kredit", fields: [t("jenisKredit", "Jenis fasilitas", "Kredit Modal Kerja"), rp("plafon", "Plafon kredit (Rp)"), t("tujuan", "Tujuan penggunaan", "tambahan modal usaha perdagangan"), t("jangka", "Jangka waktu", "36 (tiga puluh enam) bulan", false), tgl("jatuhTempo", "Tanggal jatuh tempo"), t("bunga", "Bunga", "12% (dua belas persen) per tahun efektif, dapat ditinjau kembali"), t("angsuran", "Cara pembayaran / angsuran", "angsuran bulanan setiap tanggal 5 sebesar Rp..."), t("provisi", "Provisi & biaya administrasi", "1% (satu persen) dari plafon"), t("denda", "Denda keterlambatan", "2% (dua persen) per bulan dari jumlah yang tertunggak"), ta("jaminan", "Jaminan (satu per baris)", "sebidang tanah Hak Milik Nomor ... yang akan dibebani Hak Tanggungan peringkat pertama"), t("sp3", "Surat persetujuan kredit", "Surat Persetujuan Pemberian Kredit Nomor ... tanggal ...")] }],
    premis: ["bahwa Debitor telah mengajukan permohonan kredit kepada Kreditor dan Kreditor telah menyetujuinya<< sebagaimana ternyata dari {sp3}>>;"],
    pengantar: "Sehubungan dengan hal tersebut, para pihak sepakat mengadakan perjanjian kredit dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:",
    pasal: [
      [{ j: "FASILITAS KREDIT" }, "Kreditor memberikan kepada Debitor fasilitas {jenisKredit} dengan plafon sebesar {plafon:rp}, yang hanya boleh digunakan untuk {tujuan}."],
      [{ j: "JANGKA WAKTU" }, "Kredit diberikan untuk jangka waktu {jangka}<< dan wajib dilunasi selambat-lambatnya pada tanggal {jatuhTempo:tgl}>>."],
      [{ j: "BUNGA, PROVISI, DAN BIAYA" }, "Atas kredit yang terutang Debitor wajib membayar bunga sebesar {bunga}<<, serta provisi dan biaya administrasi sebesar {provisi}>>."],
      [{ j: "PEMBAYARAN" }, "Debitor wajib membayar kembali kredit berikut bunganya dengan {angsuran}. Atas setiap keterlambatan Debitor dikenakan denda sebesar {denda}."],
      [{ j: "JAMINAN" }, "Untuk menjamin pembayaran kembali seluruh kewajiban Debitor, Debitor dan/atau pemilik jaminan menyerahkan jaminan berupa:", { baris: "jaminan" }, "Pengikatan jaminan tersebut dibuat dengan akta tersendiri yang merupakan satu kesatuan dengan perjanjian ini."],
      [{ j: "KEWAJIBAN DEBITOR" }, "Selama kredit belum lunas Debitor wajib menggunakan kredit sesuai tujuannya, menyampaikan keterangan dan laporan yang diminta Kreditor, mengasuransikan barang jaminan, dan tidak mengalihkan atau menjaminkan kembali barang jaminan tanpa persetujuan tertulis Kreditor."],
      [{ j: "KELALAIAN" }, `Apabila Debitor tidak membayar kewajibannya pada waktunya, memberikan keterangan yang tidak benar, dinyatakan pailit, atau melanggar ketentuan perjanjian ini, maka ${LALAI}, dan Kreditor berhak menyatakan seluruh utang jatuh tempo serta menagihnya seketika dan sekaligus dan mengeksekusi jaminan.`],
      [{ j: "LAIN-LAIN" }, "Pembukuan dan catatan Kreditor merupakan bukti yang mengikat mengenai jumlah utang Debitor, kecuali dibuktikan sebaliknya. Kreditor berhak mengalihkan piutangnya kepada pihak lain dengan pemberitahuan kepada Debitor.", AHLI_WARIS],
      [biaya("Debitor")]
    ],
    subject: "Perjanjian Kredit {plafon:rp}",
    notes: ["Sesuaikan dengan Surat Persetujuan Kredit dan standar perjanjian lembaga kreditor; klausul baku tunduk pada UU Perlindungan Konsumen dan ketentuan OJK [VERIFIKASI].", "Pengikatan jaminan (APHT/SKMHT, fidusia, gadai) dibuat dengan akta tersendiri; perhatikan tenggat pendaftarannya."],
    checklist: ["KTP & KK Debitor", "KTP Pasangan Debitor (persetujuan)", "NPWP Debitor", "Surat Persetujuan Kredit (SP3K / Offering Letter)", "Surat Kuasa & Anggaran Dasar Kreditor", "Dokumen Jaminan (sertipikat, BPKB)", "?Akta Pendirian & SK Debitor (badan usaha)"]
  },
  {
    key: "addendum",
    title: "Akta Addendum / Perubahan Perjanjian",
    judul: "ADDENDUM",
    sub: "{perjanjian:up}",
    category: "Perjanjian",
    description: "Perubahan atau tambahan atas perjanjian yang sudah ada (perjanjian kredit, sewa, kerja sama, dan lain-lain).",
    pihak: [{ key: "pihak1", sebut: "Pihak Pertama", label: "Pihak Pertama", klien: true }, { key: "pihak2", sebut: "Pihak Kedua", label: "Pihak Kedua" }],
    sections: [{ title: "Perjanjian & Perubahan", fields: [t("perjanjian", "Judul perjanjian yang diubah", "Perjanjian Kredit"), t("akta", "Nomor, tanggal, dan pembuat", "akta Nomor ... tanggal ..., dibuat di hadapan ..."), t("urutan", "Addendum ke-", "Pertama", false), ta("alasan", "Latar belakang perubahan (opsional)"), ta("perubahan", "Perubahan (satu per baris)", "Pasal 2 diubah sehingga berbunyi: \"...\"")] }],
    premis: ["bahwa antara para pihak telah dibuat {perjanjian} sebagaimana dimuat dalam {akta} (selanjutnya disebut \"Perjanjian\");", "<<bahwa {alasan};>>", "bahwa para pihak sepakat mengubah Perjanjian tersebut dengan Addendum {urutan} ini."],
    pasal: [
      ["Para pihak sepakat mengubah dan/atau menambah ketentuan Perjanjian sebagai berikut:", { baris: "perubahan" }],
      ["Addendum ini merupakan bagian yang tidak terpisahkan dari Perjanjian. Ketentuan Perjanjian selebihnya yang tidak diubah dengan Addendum ini tetap berlaku dan mengikat para pihak; jaminan yang telah diberikan tetap berlaku untuk menjamin kewajiban berdasarkan Perjanjian sebagaimana diubah."],
      [biaya("para pihak sesuai kesepakatan mereka")]
    ],
    subject: "Addendum {urutan} {perjanjian}",
    notes: ["Bila perubahan menambah jumlah utang atau memperpanjang jangka waktu, periksa apakah pengikatan jaminan (Hak Tanggungan/fidusia) perlu diperbarui atau ditambah.", "Semua pihak dalam perjanjian asal (termasuk penjamin) harus menyetujui addendum."],
    checklist: ["KTP Para Pihak", "Salinan Perjanjian Asal & Addendum Sebelumnya", "?Surat Persetujuan Perubahan (bank/lembaga)", "?Persetujuan Pasangan / Penjamin"]
  },
  {
    key: "jaminan_perorangan",
    title: "Akta Jaminan Perorangan / Perusahaan",
    judul: "PENJAMINAN",
    sub: "{bentuk:up}",
    category: "Jaminan",
    description: "Penanggungan utang (borgtocht) oleh perorangan atau perusahaan untuk kepentingan kreditor.",
    pihak: [{ key: "penjamin", sebut: "Penjamin", label: "Penjamin", pasangan: true }, { key: "kreditur", sebut: "Kreditor", label: "Kreditor", klien: true }],
    sections: [{ title: "Utang yang Dijamin", fields: [sel("bentuk", "Bentuk", ["Jaminan Perorangan (Personal Guarantee)", "Jaminan Perusahaan (Corporate Guarantee)"]), ...POKOK, rp("batas", "Batas penjaminan (Rp; kosongkan = seluruh utang)")] }],
    premis: ["bahwa berdasarkan {perjanjianPokok}, {debitur} (selanjutnya disebut \"Debitor\") mempunyai utang kepada Kreditor dengan jumlah pokok sebesar {nilaiUtang:rp};", "bahwa Kreditor mensyaratkan adanya penjaminan dan Penjamin bersedia mengikatkan diri sebagai penjamin."],
    pasal: [
      ["Penjamin dengan ini mengikatkan diri sebagai penjamin untuk kepentingan Kreditor guna menjamin pembayaran lunas dan tertib seluruh utang Debitor berdasarkan perjanjian tersebut, meliputi pokok, bunga, denda, dan biaya<<, sampai jumlah setinggi-tingginya {batas:rp}>>."],
      ["Penjamin melepaskan segala hak istimewa yang diberikan undang-undang kepada penjamin, antara lain hak untuk meminta agar harta Debitor disita dan dijual lebih dahulu serta hak pemecahan utang, sebagaimana dimaksud dalam Pasal 1831, 1833, 1837, 1843, dan 1847 sampai dengan 1850 Kitab Undang-Undang Hukum Perdata."],
      [`Penjamin wajib membayar kepada Kreditor atas permintaan pertama secara tertulis yang menyatakan Debitor lalai, tanpa Kreditor perlu membuktikan kelalaian itu lebih lanjut; ${LALAI}.`],
      ["Penjaminan ini bersifat terus-menerus, tidak dapat dicabut tanpa persetujuan tertulis Kreditor, dan tetap berlaku walaupun perjanjian utang diubah, diperpanjang, atau diperbarui, sampai seluruh utang Debitor dinyatakan lunas oleh Kreditor."],
      ["Selama utang belum lunas Penjamin tidak akan menjalankan hak subrogasi atau hak tagih terhadap Debitor yang timbul karena pembayaran berdasarkan penjaminan ini."],
      [AHLI_WARIS, biaya("Debitor atau Penjamin")]
    ],
    subject: "Penjaminan utang {debitur}",
    notes: ["Jaminan perusahaan: periksa anggaran dasar penjamin (kewenangan Direksi, persetujuan Dewan Komisaris/RUPS bila menjaminkan lebih dari 50% kekayaan bersih, Pasal 102 UUPT).", "Pelepasan hak istimewa menjadikan penjamin dapat ditagih langsung; pastikan penjamin memahami akibatnya. Penjamin perorangan yang kawin memerlukan persetujuan pasangan."],
    checklist: ["KTP & KK Penjamin", "KTP Pasangan Penjamin (persetujuan)", "NPWP Penjamin", "Perjanjian Kredit / Utang yang Dijamin", "?Akta Pendirian, SK & Persetujuan Organ (jaminan perusahaan)"]
  },
  {
    key: "gadai",
    title: "Akta Gadai",
    judul: "GADAI",
    category: "Jaminan",
    description: "Pemberian jaminan gadai atas benda bergerak, deposito, atau piutang.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Gadai", label: "Pemberi Gadai", pasangan: true }, { key: "penerima", sebut: "Penerima Gadai", label: "Penerima Gadai (kreditor)", klien: true }],
    sections: [{ title: "Utang & Benda Gadai", fields: [...POKOK, ta("benda", "Benda yang digadaikan (satu per baris)", "Bilyet Deposito Nomor ... pada Bank ... sebesar Rp... atas nama ..."), rp("nilaiBenda", "Nilai benda gadai (Rp)")] }],
    premis: ["bahwa berdasarkan {perjanjianPokok}, {debitur} mempunyai utang kepada Penerima Gadai dengan jumlah pokok sebesar {nilaiUtang:rp} (selanjutnya disebut \"Utang\");"],
    pasal: [
      ["Untuk menjamin pelunasan Utang, Pemberi Gadai dengan ini menggadaikan kepada Penerima Gadai, yang dengan ini menerima gadai, benda sebagai berikut:", { baris: "benda" }, "(selanjutnya disebut \"Benda Gadai\")<<, yang nilainya menurut para pihak sebesar {nilaiBenda:rp}>>."],
      ["Benda Gadai berikut surat buktinya diserahkan ke dalam kekuasaan Penerima Gadai pada hari ini. Untuk gadai atas piutang atau deposito, Pemberi Gadai memberi kuasa kepada Penerima Gadai untuk memberitahukan gadai ini kepada pihak yang berutang atau bank penerbit."],
      ["Pemberi Gadai menjamin Benda Gadai benar miliknya, tidak dijaminkan kepada pihak lain, tidak dalam sitaan, dan tidak dalam sengketa."],
      ["Apabila debitor lalai, Penerima Gadai berhak menjual Benda Gadai di muka umum menurut kebiasaan setempat, atau mencairkannya bila berupa deposito atau piutang, dan mengambil pelunasan piutangnya dari hasilnya; kelebihannya dikembalikan kepada Pemberi Gadai."],
      ["Gadai ini berakhir setelah Utang dibayar lunas, dan Penerima Gadai wajib mengembalikan Benda Gadai kepada Pemberi Gadai."],
      [biaya("Pemberi Gadai")]
    ],
    subject: "Gadai untuk utang {debitur}",
    notes: ["Gadai mensyaratkan benda dilepaskan dari kekuasaan pemberi gadai (Pasal 1152 KUHPerdata); bila benda tetap dikuasai pemberi jaminan, gunakan fidusia.", "Gadai atas piutang atas nama wajib diberitahukan kepada debitor piutang (Pasal 1153 KUHPerdata)."],
    checklist: ["KTP Pemberi dan Penerima Gadai", "KTP Pasangan Pemberi Gadai (persetujuan)", "Perjanjian Utang yang Dijamin", "Bukti Kepemilikan Benda Gadai (bilyet deposito, faktur, surat piutang)"]
  },
  {
    key: "cessie",
    title: "Akta Pengalihan Piutang (Cessie)",
    judul: "PENGALIHAN PIUTANG",
    sub: "(CESSIE)",
    category: "Perjanjian",
    description: "Pengalihan atau jual beli piutang atas nama, baik sebagai penjualan piutang maupun sebagai jaminan.",
    pihak: [{ key: "cedent", sebut: "Pihak Pertama", label: "Pihak Pertama (pemilik piutang lama / cedent)" }, { key: "cessionaris", sebut: "Pihak Kedua", label: "Pihak Kedua (penerima piutang / cessionaris)", klien: true }],
    sections: [{ title: "Piutang", fields: [sel("tujuan", "Tujuan pengalihan", ["Jual beli piutang", "Jaminan pelunasan utang"]), t("debitur", "Debitor piutang (cessus)", "PT ... / Tuan ..."), t("dasarPiutang", "Dasar piutang", "Perjanjian Kredit Nomor ... tanggal ... / faktur Nomor ..."), rp("nilaiPiutang", "Jumlah piutang (Rp)"), rp("harga", "Harga pengalihan (Rp; untuk jual beli)"), t("utangDijamin", "Utang yang dijamin (untuk cessie jaminan)", "Perjanjian Kredit Nomor ... tanggal ..."), t("jaminanIkut", "Jaminan yang ikut beralih (opsional)", "Hak Tanggungan peringkat pertama atas ...")] }],
    premis: ["bahwa Pihak Pertama mempunyai piutang terhadap {debitur} (selanjutnya disebut \"Debitor\") sebesar {nilaiPiutang:rp} berdasarkan {dasarPiutang} (selanjutnya disebut \"Piutang\");"],
    pasal: [
      ["Pihak Pertama dengan ini mengalihkan dan menyerahkan (cessie) kepada Pihak Kedua, yang dengan ini menerima pengalihan dan penyerahan, Piutang tersebut berikut segala hak yang melekat padanya<<, termasuk {jaminanIkut}>>."],
      { jika: "tujuan=Jual", isi: ["Pengalihan ini dilakukan dengan harga sebesar {harga:rp}, yang telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama, dan untuk penerimaannya akta ini berlaku pula sebagai kwitansi yang sah."] },
      { jika: "tujuan=Jaminan", isi: ["Pengalihan ini dilakukan sebagai jaminan pelunasan utang Pihak Pertama kepada Pihak Kedua berdasarkan {utangDijamin}. Setelah utang tersebut lunas, Pihak Kedua wajib mengalihkan kembali Piutang kepada Pihak Pertama."] },
      ["Pihak Pertama menjamin bahwa Piutang benar ada, belum dibayar, belum dialihkan atau dijaminkan kepada pihak lain, dan tidak dalam sengketa. Pihak Pertama tidak menjamin kemampuan membayar Debitor, kecuali diperjanjikan lain secara tertulis."],
      ["Pihak Pertama memberi kuasa kepada Pihak Kedua untuk memberitahukan pengalihan ini kepada Debitor atau meminta pengakuan tertulisnya, dan sejak pemberitahuan itu Debitor hanya dapat membayar dengan sah kepada Pihak Kedua. Surat-surat bukti Piutang diserahkan kepada Pihak Kedua pada hari ini."],
      [biaya("Pihak Kedua")]
    ],
    subject: "Cessie piutang terhadap {debitur}",
    notes: ["Cessie baru mengikat debitor setelah diberitahukan kepadanya atau disetujui/diakui secara tertulis (Pasal 613 KUHPerdata).", "Bila piutang dijamin Hak Tanggungan atau fidusia, peralihan jaminannya didaftarkan ke Kantor Pertanahan / Kantor Pendaftaran Fidusia (Pasal 16 UUHT; Pasal 19 UU Fidusia)."],
    checklist: ["KTP Para Pihak", "Dokumen Dasar Piutang (perjanjian, faktur, surat pengakuan utang)", "Rincian Saldo Piutang", "?Dokumen Jaminan yang Ikut Beralih", "?Persetujuan Debitor (bila disyaratkan perjanjian asal)"]
  },
  {
    key: "subrogasi",
    title: "Akta Subrogasi",
    judul: "SUBROGASI",
    category: "Perjanjian",
    description: "Penggantian kedudukan kreditor oleh pihak ketiga yang membayar utang debitor.",
    pihak: [{ key: "kreditur", sebut: "Kreditor Lama", label: "Kreditor Lama (yang menerima pembayaran)" }, { key: "pembayar", sebut: "Kreditor Baru", label: "Kreditor Baru (pihak ketiga yang membayar)", klien: true }, { key: "debitur", sebut: "Debitor", label: "Debitor (bila ikut menghadap)", min: 0 }],
    sections: [{ title: "Utang", fields: [t("dasarUtang", "Dasar utang", "Perjanjian Kredit Nomor ... tanggal ..."), t("namaDebitur", "Nama debitor", "Tuan ..."), rp("jumlah", "Jumlah yang dibayar (Rp)"), t("jaminanIkut", "Jaminan yang ikut beralih (opsional)")] }],
    premis: ["bahwa berdasarkan {dasarUtang}, {namaDebitur} mempunyai utang kepada Kreditor Lama;", "bahwa Kreditor Baru bersedia membayar utang tersebut kepada Kreditor Lama dengan menggantikan kedudukan Kreditor Lama."],
    pasal: [
      ["Kreditor Baru dengan ini membayar kepada Kreditor Lama uang sebesar {jumlah:rp} untuk pelunasan utang tersebut, dan Kreditor Lama mengakui telah menerimanya; akta ini berlaku pula sebagai kwitansi yang sah."],
      ["Bersamaan dengan penerimaan pembayaran tersebut, Kreditor Lama dengan tegas menyatakan Kreditor Baru menggantikan kedudukannya (subrogasi) dalam segala hak, tuntutan, hak istimewa<<, dan jaminan berupa {jaminanIkut}>> terhadap debitor."],
      ["Kreditor Lama menyerahkan kepada Kreditor Baru seluruh surat bukti utang dan dokumen jaminan, serta menjamin bahwa utang tersebut benar ada dan belum dialihkan kepada pihak lain."],
      { jika: "debitur", isi: ["Debitor yang turut menghadap menyatakan mengetahui dan menyetujui subrogasi ini dan untuk selanjutnya akan memenuhi kewajibannya kepada Kreditor Baru."] },
      [biaya("Kreditor Baru")]
    ],
    subject: "Subrogasi utang {namaDebitur}",
    notes: ["Subrogasi karena perjanjian harus dinyatakan dengan tegas dan dilakukan tepat pada waktu pembayaran (Pasal 1401 KUHPerdata).", "Peralihan Hak Tanggungan/fidusia karena subrogasi wajib didaftarkan."],
    checklist: ["KTP Para Pihak", "Perjanjian Utang & Rincian Saldo", "Dokumen Jaminan", "Bukti Pembayaran oleh Pihak Ketiga"]
  },
  {
    key: "novasi",
    title: "Akta Pembaruan Utang (Novasi)",
    judul: "PEMBARUAN UTANG",
    sub: "(NOVASI)",
    category: "Perjanjian",
    description: "Pembaruan utang: penggantian debitor, kreditor, atau perikatan lama dengan perikatan baru.",
    pihak: [{ key: "kreditur", sebut: "Kreditor", label: "Kreditor", klien: true }, { key: "lama", sebut: "Debitor Lama", label: "Debitor Lama" }, { key: "baru", sebut: "Debitor Baru", label: "Debitor Baru (bila ada penggantian debitor)", min: 0, pasangan: true }],
    sections: [{ title: "Utang Lama & Baru", fields: [sel("bentuk", "Bentuk novasi", ["Penggantian debitor (novasi subjektif pasif)", "Penggantian perikatan (novasi objektif)"]), t("dasarUtang", "Dasar utang lama", "Perjanjian Kredit Nomor ... tanggal ..."), rp("sisa", "Sisa utang yang diperbarui (Rp)"), ta("syaratBaru", "Syarat utang baru (satu per baris)", "Jangka waktu 24 (dua puluh empat) bulan"), sel("jaminan", "Jaminan lama", ["dipertahankan dengan tegas untuk menjamin utang baru", "hapus dan akan diikat ulang dengan akta tersendiri"])] }],
    premis: ["bahwa berdasarkan {dasarUtang}, Debitor Lama mempunyai utang kepada Kreditor dengan sisa sebesar {sisa:rp} (selanjutnya disebut \"Utang Lama\");", "bahwa para pihak sepakat memperbarui utang tersebut."],
    pasal: [
      { jika: "bentuk=Penggantian debitor", isi: ["Para pihak sepakat bahwa Debitor Baru menggantikan Debitor Lama sebagai pihak yang berutang kepada Kreditor atas jumlah sebesar {sisa:rp}, dan Kreditor dengan tegas membebaskan Debitor Lama dari Utang Lama."] },
      { jika: "bentuk=Penggantian perikatan", isi: ["Para pihak sepakat menghapuskan Utang Lama dan menggantinya dengan perikatan utang baru sebesar {sisa:rp} antara pihak-pihak yang sama."] },
      ["Utang baru tersebut tunduk pada syarat-syarat sebagai berikut:", { baris: "syaratBaru" }],
      ["Dengan pembaruan ini Utang Lama hapus. Jaminan yang melekat pada Utang Lama {jaminan}."],
      [AHLI_WARIS, biaya("pihak yang berutang")]
    ],
    subject: "Novasi utang {sisa:rp}",
    notes: ["Novasi tidak dipersangkakan; kehendak mengadakannya harus tegas (Pasal 1415 KUHPerdata). Hak istimewa dan jaminan utang lama tidak berpindah ke utang baru kecuali dipertahankan dengan tegas (Pasal 1421), dan untuk Hak Tanggungan/fidusia umumnya perlu pengikatan baru [VERIFIKASI].", "Penanggung utang lama bebas kecuali ia menyetujui untuk tetap terikat."],
    checklist: ["KTP Para Pihak", "KTP Pasangan Debitor Baru (persetujuan)", "Perjanjian Utang Lama & Rincian Saldo", "Dokumen Jaminan", "?Persetujuan Penjamin Lama"]
  },
  {
    key: "akad_murabahah",
    title: "Akta Akad Pembiayaan Murabahah",
    judul: "AKAD PEMBIAYAAN MURABAHAH",
    category: "Perjanjian",
    description: "Pembiayaan jual beli dengan penegasan harga pokok dan margin (bank/lembaga keuangan syariah).",
    pihak: [{ key: "bank", sebut: "Bank", label: "Bank / Lembaga Keuangan Syariah", klien: true }, { key: "nasabah", sebut: "Nasabah", label: "Nasabah", pasangan: true }],
    sections: [{ title: "Pembiayaan", fields: [t("barang", "Barang yang dibiayai", "1 (satu) unit rumah di ..."), t("pemasok", "Pemasok / penjual barang", "PT ..."), rp("hargaPokok", "Harga pokok (Rp)"), rp("margin", "Margin keuntungan (Rp)"), rp("uangMuka", "Uang muka (Rp)"), rp("hargaJual", "Harga jual / kewajiban Nasabah (Rp)"), t("jangka", "Jangka waktu", "120 (seratus dua puluh) bulan", false), t("angsuran", "Angsuran", "Rp... setiap bulan pada tanggal ..."), ta("jaminan", "Jaminan (satu per baris)")] }],
    premis: ["bahwa Nasabah telah mengajukan permohonan pembiayaan kepada Bank untuk membeli {barang}, dan Bank menyetujuinya berdasarkan prinsip Murabahah."],
    pasal: [
      ["Bank menjual kepada Nasabah, yang membeli dari Bank, {barang} yang diperoleh Bank dari {pemasok} (selanjutnya disebut \"Barang\"), dengan harga pokok sebesar {hargaPokok:rp} ditambah margin keuntungan sebesar {margin:rp}, sehingga harga jual seluruhnya sebesar {hargaJual:rp}. Harga jual tersebut tetap dan tidak berubah selama akad berlangsung."],
      ["<<Nasabah telah membayar uang muka sebesar {uangMuka:rp}. >>Sisa harga jual wajib dibayar Nasabah secara angsuran selama {jangka}, yaitu {angsuran}."],
      ["Bank dapat mewakilkan pembelian Barang kepada Nasabah dengan akad wakalah; akad Murabahah ini berlaku setelah Barang secara prinsip menjadi milik Bank."],
      ["Untuk menjamin pembayaran kewajibannya Nasabah menyerahkan jaminan berupa:", { baris: "jaminan" }, "yang pengikatannya dibuat dengan akta tersendiri."],
      ["Nasabah yang mampu tetapi menunda pembayaran dapat dikenakan ganti rugi (ta'widh) atas kerugian riil dan/atau sanksi (ta'zir) yang dananya disalurkan untuk dana sosial, sesuai ketentuan Bank. Bank dapat memberikan potongan atas pelunasan dipercepat menurut kebijakannya."],
      [CIDERA],
      [SENGKETA_SY, biaya("Nasabah")]
    ],
    subject: "Murabahah {barang}",
    notes: [SYARIAH_NOTE, "Harga jual tidak boleh berubah selama masa akad; denda keterlambatan bukan pendapatan bank."],
    checklist: SYARIAH_CEK
  },
  {
    key: "akad_musyarakah",
    title: "Akta Akad Pembiayaan Musyarakah",
    judul: "AKAD PEMBIAYAAN MUSYARAKAH",
    category: "Perjanjian",
    description: "Pembiayaan kerja sama modal dengan bagi hasil; termasuk Musyarakah Mutanaqisah.",
    pihak: [{ key: "bank", sebut: "Bank", label: "Bank / Lembaga Keuangan Syariah", klien: true }, { key: "nasabah", sebut: "Nasabah", label: "Nasabah", pasangan: true }],
    sections: [{ title: "Pembiayaan", fields: [t("usaha", "Usaha / objek yang dibiayai", "pembangunan ruko di ..."), rp("modalBank", "Porsi modal Bank (Rp)"), rp("modalNasabah", "Porsi modal Nasabah (Rp)"), t("nisbah", "Nisbah bagi hasil", "60% (enam puluh persen) untuk Nasabah dan 40% (empat puluh persen) untuk Bank"), t("jangka", "Jangka waktu", "36 (tiga puluh enam) bulan", false), t("pengembalian", "Pengembalian porsi modal Bank", "secara bertahap setiap bulan sesuai jadwal terlampir"), ta("jaminan", "Jaminan (satu per baris)")] }],
    premis: ["bahwa Bank dan Nasabah sepakat bekerja sama membiayai {usaha} berdasarkan prinsip Musyarakah."],
    pasal: [
      ["Para pihak menyertakan modal untuk {usaha} (selanjutnya disebut \"Usaha\"), yaitu Bank sebesar {modalBank:rp} dan Nasabah sebesar {modalNasabah:rp}."],
      ["Usaha dikelola oleh Nasabah dengan amanah dan sesuai prinsip syariah; Bank berhak melakukan pengawasan dan memperoleh laporan berkala."],
      ["Keuntungan Usaha dibagi menurut nisbah {nisbah}. Kerugian ditanggung para pihak sebanding dengan porsi modal masing-masing, kecuali kerugian yang timbul karena kelalaian, kesengajaan, atau pelanggaran akad oleh Nasabah."],
      ["Akad ini berlaku selama {jangka}. Nasabah wajib mengembalikan porsi modal Bank {pengembalian}."],
      ["Untuk menjamin pelaksanaan kewajibannya, khususnya terhadap kelalaian atau pelanggaran akad, Nasabah menyerahkan jaminan berupa:", { baris: "jaminan" }],
      [CIDERA],
      [SENGKETA_SY, biaya("Nasabah")]
    ],
    subject: "Musyarakah {usaha}",
    notes: [SYARIAH_NOTE, "Bagi hasil dihitung dari hasil usaha yang nyata, bukan persentase tetap dari modal."],
    checklist: SYARIAH_CEK
  },
  {
    key: "akad_mudharabah",
    title: "Akta Akad Pembiayaan Mudharabah",
    judul: "AKAD PEMBIAYAAN MUDHARABAH",
    category: "Perjanjian",
    description: "Pembiayaan dengan seluruh modal dari bank (shahibul maal) dan nasabah sebagai pengelola (mudharib).",
    pihak: [{ key: "bank", sebut: "Bank", label: "Bank / Lembaga Keuangan Syariah (shahibul maal)", klien: true }, { key: "nasabah", sebut: "Nasabah", label: "Nasabah (mudharib)", pasangan: true }],
    sections: [{ title: "Pembiayaan", fields: [t("usaha", "Usaha yang dibiayai"), rp("modal", "Modal dari Bank (Rp)"), t("nisbah", "Nisbah bagi hasil", "70% (tujuh puluh persen) untuk Nasabah dan 30% (tiga puluh persen) untuk Bank"), t("jangka", "Jangka waktu", "24 (dua puluh empat) bulan", false), t("pengembalian", "Pengembalian modal", "sekaligus pada akhir jangka waktu"), ta("jaminan", "Jaminan (satu per baris)")] }],
    premis: ["bahwa Nasabah memerlukan modal untuk menjalankan {usaha} dan Bank bersedia menyediakannya berdasarkan prinsip Mudharabah."],
    pasal: [
      ["Bank selaku pemilik dana menyediakan modal sebesar {modal:rp} kepada Nasabah selaku pengelola untuk menjalankan {usaha} (selanjutnya disebut \"Usaha\")."],
      ["Nasabah mengelola Usaha sepenuhnya dengan amanah dan sesuai prinsip syariah; Bank tidak ikut mengelola tetapi berhak mengawasi dan menerima laporan berkala."],
      ["Keuntungan Usaha dibagi menurut nisbah {nisbah}. Kerugian finansial ditanggung Bank selaku pemilik modal, kecuali kerugian yang timbul karena kelalaian, kesengajaan, atau pelanggaran akad oleh Nasabah."],
      ["Akad ini berlaku selama {jangka}, dan Nasabah wajib mengembalikan modal kepada Bank {pengembalian}."],
      ["Untuk menjamin terhadap kelalaian atau pelanggaran akad, Nasabah menyerahkan jaminan berupa:", { baris: "jaminan" }],
      [CIDERA],
      [SENGKETA_SY, biaya("Nasabah")]
    ],
    subject: "Mudharabah {usaha}",
    notes: [SYARIAH_NOTE, "Pada mudharabah pengelola tidak menanggung kerugian usaha kecuali karena kelalaian atau pelanggarannya."],
    checklist: SYARIAH_CEK
  },
  {
    key: "akad_ijarah",
    title: "Akta Akad Ijarah",
    judul: "AKAD IJARAH",
    sub: "{bentuk:up}",
    category: "Perjanjian",
    description: "Sewa-menyewa berdasarkan prinsip syariah, termasuk Ijarah Muntahiya Bittamlik (IMBT).",
    pihak: [{ key: "bank", sebut: "Bank", label: "Bank / Lembaga Keuangan Syariah (pemberi sewa)", klien: true }, { key: "nasabah", sebut: "Nasabah", label: "Nasabah (penyewa)", pasangan: true }],
    sections: [{ title: "Sewa", fields: [sel("bentuk", "Bentuk", ["Ijarah", "Ijarah Muntahiya Bittamlik"]), t("objek", "Objek sewa", "1 (satu) unit ..."), t("ujrah", "Ujrah (uang sewa)", "Rp... setiap bulan"), t("jangka", "Masa sewa", "60 (enam puluh) bulan", false), ta("jaminan", "Jaminan (satu per baris; opsional)")] }],
    premis: ["bahwa Nasabah memerlukan manfaat atas {objek} dan Bank bersedia menyewakannya berdasarkan prinsip Ijarah."],
    pasal: [
      ["Bank menyewakan kepada Nasabah, yang menyewa dari Bank, {objek} (selanjutnya disebut \"Objek Sewa\") untuk masa sewa {jangka}."],
      ["Nasabah wajib membayar ujrah sebesar {ujrah}. Besarnya ujrah dapat ditinjau kembali untuk periode berikutnya atas kesepakatan para pihak."],
      ["Objek Sewa tetap milik Bank selama masa sewa. Nasabah wajib memelihara Objek Sewa dan menggunakannya sesuai peruntukan serta prinsip syariah; perbaikan yang bersifat pokok menjadi tanggungan Bank kecuali kerusakan karena kelalaian Nasabah."],
      { jika: "bentuk=Ijarah Muntahiya", isi: ["Bank berjanji (wa'd) untuk mengalihkan kepemilikan Objek Sewa kepada Nasabah setelah seluruh ujrah dibayar lunas, dengan cara hibah atau jual beli yang dibuat dengan akad tersendiri setelah masa sewa berakhir."] },
      { jika: "jaminan", isi: ["Untuk menjamin kewajibannya Nasabah menyerahkan jaminan berupa:", { baris: "jaminan" }] },
      [CIDERA],
      [SENGKETA_SY, biaya("Nasabah")]
    ],
    subject: "{bentuk} {objek}",
    notes: [SYARIAH_NOTE, "Pada IMBT pemindahan kepemilikan dibuat dengan akad terpisah setelah ijarah selesai; untuk tanah/bangunan memerlukan akta PPAT."],
    checklist: SYARIAH_CEK
  },
  {
    key: "wad",
    title: "Akta Wa'd (Janji)",
    judul: "WA'D",
    category: "Perjanjian",
    description: "Janji sepihak dalam transaksi syariah, mis. janji membeli atau janji menghibahkan.",
    pihak: [{ key: "pemberiJanji", sebut: "Pemberi Janji", label: "Pemberi Janji (wa'id)", klien: true }, { key: "penerimaJanji", sebut: "Penerima Janji", label: "Penerima Janji (mau'ud)" }],
    sections: [{ title: "Janji", fields: [t("isiJanji", "Isi janji", "membeli 1 (satu) unit rumah di ... dari Penerima Janji"), t("akadTerkait", "Akad yang terkait", "Akad Murabahah yang akan ditandatangani"), tgl("batas", "Janji dilaksanakan paling lambat"), t("syarat", "Syarat berlakunya janji (opsional)", "setelah Penerima Janji memperoleh barang dari pemasok")] }],
    pasal: [
      ["Pemberi Janji dengan ini berjanji kepada Penerima Janji untuk {isiJanji}<<, sehubungan dengan {akadTerkait}>>."],
      ["Janji ini wajib dilaksanakan selambat-lambatnya pada tanggal {batas:tgl}<<, dengan syarat {syarat}>>."],
      ["Janji ini mengikat Pemberi Janji. Apabila Pemberi Janji tidak memenuhinya tanpa alasan yang dibenarkan syariah, Pemberi Janji wajib mengganti kerugian riil yang dialami Penerima Janji karena tidak dipenuhinya janji tersebut."],
      [SENGKETA_SY]
    ],
    subject: "Wa'd {isiJanji}",
    notes: [SYARIAH_NOTE, "Wa'd adalah janji sepihak, bukan akad; akad pokoknya dibuat tersendiri pada waktunya."],
    checklist: ["KTP Para Pihak", "Surat Persetujuan Pembiayaan / Dokumen Akad Terkait", "?Surat Kuasa Lembaga Keuangan"]
  },
  {
    key: "kuasa_fidusia",
    title: "Akta Kuasa Membebankan Jaminan Fidusia",
    judul: "KUASA MEMBEBANKAN JAMINAN FIDUSIA",
    category: "Kuasa",
    description: "Kuasa dari pemilik benda kepada kreditor untuk menandatangani Akta Jaminan Fidusia.",
    pihak: [{ key: "pemberi", sebut: "Pemberi Kuasa", label: "Pemberi Kuasa (pemilik benda)", pasangan: true }, { key: "penerima", sebut: "Penerima Kuasa", label: "Penerima Kuasa (kreditor)", klien: true }],
    sections: [{ title: "Utang & Objek", fields: [...POKOK, ta("objek", "Objek yang akan dibebani fidusia (satu per baris)", "1 (satu) unit mobil merek ..., nomor rangka ..., nomor mesin ..., BPKB Nomor ..."), rp("nilaiPenjaminan", "Nilai penjaminan (Rp)")] }],
    pasal: [
      ["Pemberi Kuasa dengan ini memberi kuasa kepada Penerima Kuasa, dengan hak substitusi, khusus untuk dan atas nama Pemberi Kuasa membebankan Jaminan Fidusia guna menjamin pelunasan utang {debitur} kepada Penerima Kuasa berdasarkan {perjanjianPokok} dengan jumlah pokok sebesar {nilaiUtang:rp}, atas benda sebagai berikut:", { baris: "objek" }, "<<dengan nilai penjaminan sebesar {nilaiPenjaminan:rp}.>>"],
      ["Untuk itu Penerima Kuasa berhak menghadap Notaris, membuat dan menandatangani Akta Jaminan Fidusia dengan syarat dan ketentuan yang lazim, memberikan keterangan, mendaftarkan Jaminan Fidusia pada Kantor Pendaftaran Fidusia, menerima sertifikatnya, dan melakukan segala tindakan lain yang diperlukan."],
      ["Kuasa ini merupakan bagian yang tidak terpisahkan dari perjanjian utang tersebut, tidak dapat dicabut, dan tidak berakhir karena sebab-sebab yang termaktub dalam Pasal 1813, 1814, dan 1816 Kitab Undang-Undang Hukum Perdata selama utang belum lunas."]
    ],
    subject: "Kuasa membebankan fidusia",
    notes: ["Akta Jaminan Fidusia wajib didaftarkan paling lambat 30 hari sejak tanggal aktanya (PP 21/2015); kuasa ini tidak menggantikan pembebanan dan pendaftaran.", "Praktik pembebanan fidusia hanya dengan kuasa di bawah tangan dilarang bagi perusahaan pembiayaan [VERIFIKASI: POJK tentang perusahaan pembiayaan]."],
    checklist: ["KTP & KK Pemberi Kuasa", "KTP Pasangan Pemberi Kuasa (persetujuan)", "Perjanjian Kredit / Pembiayaan", "Bukti Kepemilikan Objek (BPKB, faktur, daftar persediaan)", "Surat Kuasa / Anggaran Dasar Kreditor"]
  }
];
