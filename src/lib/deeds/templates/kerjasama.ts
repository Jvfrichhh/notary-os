import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { ayat, daftarPenghadap, dikenal, domisili, judul, pasal, pembuka, penutup, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, rupiah, tanggalHuruf } from "../words";

const pct = (v: unknown) => {
  const n = Number(str(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? `${angka(n)} persen` : "[...] persen";
};

/** Batas pembayaran bagi hasil sesuai periodenya. */
function jatuhTempo(periode: string): string {
  if (periode === "setiap tahun") return "paling lambat tiga puluh (30) hari setelah laporan keuangan tahunan Usaha selesai disusun";
  if (periode.startsWith("setiap tiga")) return "paling lambat tanggal sepuluh (10) bulan pertama setelah berakhirnya setiap periode tiga (3) bulan";
  return "paling lambat tanggal sepuluh (10) bulan berikutnya";
}

function pembukaDuaPihak(d: Record<string, unknown>, label1: string, label2: string): Block[] {
  const p1 = parties(d.pihak1);
  const p2 = parties(d.pihak2);
  return [
    ...pembuka(d),
    ...daftarPenghadap([...p1, ...p2].map((x) => ({ p: x.p, peran: peranDari(x) }))),
    {
      t: "p",
      text: `Penghadap ${nomorPenghadap(1, p1.length)} untuk selanjutnya disebut **${label1}**; dan penghadap ${nomorPenghadap(p1.length + 1, p2.length)} untuk selanjutnya disebut **${label2}**; ${label1} dan ${label2} bersama-sama disebut **PARA PIHAK**.`
    },
    dikenal(p1.length + p2.length)
  ];
}

function penutupPerjanjian(d: Record<string, unknown>, start: number): Block[] {
  return [
    ...pasal(start, "Keadaan Memaksa"),
    { t: "p", text: "Tidak dipenuhinya kewajiban oleh salah satu pihak karena keadaan memaksa (force majeure), antara lain bencana alam, kebakaran, huru-hara, wabah, atau kebijakan pemerintah yang secara langsung menghalangi pelaksanaan perjanjian, tidak dianggap sebagai wanprestasi, dengan ketentuan pihak yang mengalaminya memberitahukan secara tertulis kepada pihak lain paling lambat empat belas (14) hari sejak terjadinya." },
    ...pasal(start + 1, "Penyelesaian Perselisihan"),
    { t: "p", text: "Setiap perselisihan yang timbul dari perjanjian ini akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat; apabila dalam waktu tiga puluh (30) hari tidak tercapai mufakat, perselisihan diselesaikan melalui Pengadilan Negeri sebagaimana tersebut di bawah ini." },
    ...pasal(start + 2, "Domisili"),
    domisili(d, "Para Pihak")
  ];
}

export const kerjasamaUsaha: DeedTemplate = {
  key: "kerjasama_usaha",
  title: "Akta Perjanjian Kerja Sama Usaha",
  description: "Kerja sama usaha dua pihak: kontribusi, pengelolaan, bagi hasil, jangka waktu.",
  sections: [
    { title: "Pihak Pertama", fields: [partyList("pihak1", "Pihak Pertama", "Pihak Pertama")] },
    { title: "Pihak Kedua", fields: [partyList("pihak2", "Pihak Kedua", "Pihak Kedua")] },
    {
      title: "Isi Kerja Sama",
      fields: [
        { kind: "text", key: "bidang", label: "Bidang/nama usaha yang dikerjasamakan", wide: true },
        { kind: "text", key: "lokasi", label: "Lokasi usaha", wide: true },
        { kind: "textarea", key: "kontribusi1", label: "Kontribusi Pihak Pertama", wide: true, placeholder: "modal Rp..., tempat usaha, izin..." },
        { kind: "textarea", key: "kontribusi2", label: "Kontribusi Pihak Kedua", wide: true, placeholder: "tenaga, keahlian, pengelolaan operasional..." },
        { kind: "select", key: "pengelola", label: "Pengelola sehari-hari", options: ["Pihak Pertama", "Pihak Kedua", "Para Pihak bersama-sama"], default: "Pihak Kedua" },
        { kind: "number", key: "bagian1", label: "Bagi hasil Pihak Pertama (%)" },
        { kind: "number", key: "bagian2", label: "Bagi hasil Pihak Kedua (%)" },
        { kind: "select", key: "periode", label: "Pembagian keuntungan", options: ["setiap bulan", "setiap tiga (3) bulan", "setiap tahun"], default: "setiap bulan" },
        { kind: "date", key: "mulai", label: "Berlaku mulai" },
        { kind: "number", key: "lamaTahun", label: "Jangka waktu (tahun)" }
      ]
    }
  ],
  signers: (d) => [...parties(d.pihak1), ...parties(d.pihak2)].map((x) => x.p),
  prefill: (ctx) => ({ pihak1: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: (d) => {
    const a = Number(str(d.bagian1));
    const b = Number(str(d.bagian2));
    return a && b && a + b !== 100 ? [`Bagi hasil ${a}% + ${b}% tidak sama dengan 100%.`] : [];
  },
  build(d, variant) {
    return [
      judul("PERJANJIAN KERJA SAMA USAHA", d),
      ...pembukaDuaPihak(d, "PIHAK PERTAMA", "PIHAK KEDUA"),
      { t: "p", text: "Para Pihak dengan bertindak sebagaimana tersebut di atas menerangkan telah sepakat untuk mengadakan kerja sama usaha dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:" },
      ...pasal(1, "Maksud dan Ruang Lingkup"),
      { t: "p", text: `Para Pihak sepakat bekerja sama menjalankan usaha ${str(d.bidang) || "[...]"}, yang berlokasi di ${str(d.lokasi) || "[...]"}; untuk selanjutnya disebut **USAHA**.` },
      ...pasal(2, "Kontribusi Para Pihak"),
      ...ayat([`Pihak Pertama memberikan kontribusi berupa ${str(d.kontribusi1) || "[...]"}.`, `Pihak Kedua memberikan kontribusi berupa ${str(d.kontribusi2) || "[...]"}.`]),
      ...pasal(3, "Pengelolaan"),
      ...ayat([
        `Pengelolaan Usaha sehari-hari dilakukan oleh ${str(d.pengelola) || "[...]"}, untuk selanjutnya disebut **PENGELOLA**, dengan kewajiban mengelola secara jujur, hati-hati dan bertanggung jawab.`,
        "Pengelola wajib menyelenggarakan pembukuan yang tertib dan memberikan laporan keuangan kepada pihak lainnya setiap bulan, serta memberikan kesempatan kepada pihak lainnya untuk memeriksa pembukuan sewaktu-waktu.",
        "Keputusan mengenai penambahan modal, pinjaman, pengalihan aset Usaha, dan perubahan bidang usaha harus mendapat persetujuan tertulis Para Pihak."
      ]),
      ...pasal(4, "Pembagian Keuntungan dan Kerugian"),
      ...ayat([
        `Keuntungan bersih Usaha dibagi ${str(d.periode) || "setiap bulan"} dengan perbandingan Pihak Pertama sebesar ${pct(d.bagian1)} dan Pihak Kedua sebesar ${pct(d.bagian2)}.`,
        "Kerugian Usaha yang bukan disebabkan oleh kesalahan atau kelalaian salah satu pihak ditanggung Para Pihak sesuai perbandingan pembagian keuntungan sebagaimana dimaksud dalam ayat (1); kerugian akibat kesalahan atau kelalaian salah satu pihak menjadi tanggungan pihak tersebut."
      ]),
      ...pasal(5, "Jangka Waktu"),
      { t: "p", text: `Perjanjian ini berlaku untuk jangka waktu ${str(d.lamaTahun) ? angka(str(d.lamaTahun)) : "[...]"} tahun terhitung sejak tanggal ${tanggalHuruf(str(d.mulai))}, dan dapat diperpanjang atas kesepakatan tertulis Para Pihak.` },
      ...pasal(6, "Pengakhiran"),
      ...ayat([
        "Perjanjian ini dapat diakhiri sebelum jangka waktunya atas kesepakatan Para Pihak, atau oleh salah satu pihak apabila pihak lainnya melakukan wanprestasi dan tidak memperbaikinya dalam waktu tiga puluh (30) hari setelah ditegur secara tertulis.",
        "Pada saat perjanjian berakhir, Para Pihak melakukan perhitungan akhir atas aset, kewajiban, keuntungan dan kerugian Usaha, dan masing-masing pihak menerima kembali kontribusinya setelah diperhitungkan.",
        "Para Pihak melepaskan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata sepanjang mengenai diperlukannya putusan pengadilan untuk pengakhiran perjanjian."
      ]),
      ...pasal(7, "Kerahasiaan"),
      { t: "p", text: "Para Pihak wajib menjaga kerahasiaan seluruh informasi usaha yang diperoleh dari kerja sama ini, baik selama maupun setelah berakhirnya perjanjian ini." },
      ...penutupPerjanjian(d, 8),
      ...penutup(d, variant)
    ];
  }
};

export const kerjasamaInvestasi: DeedTemplate = {
  key: "kerjasama_investasi",
  title: "Akta Perjanjian Kerja Sama Investasi",
  description: "Penanaman dana investor kepada pengelola dengan bagi hasil dan pengembalian modal.",
  sections: [
    { title: "Pihak Pertama (Investor)", fields: [partyList("pihak1", "Investor", "Investor")] },
    { title: "Pihak Kedua (Pengelola)", fields: [partyList("pihak2", "Pengelola", "Pengelola")] },
    {
      title: "Isi Investasi",
      fields: [
        { kind: "text", key: "usaha", label: "Usaha/proyek yang dibiayai", wide: true },
        { kind: "money", key: "nilai", label: "Nilai investasi (Rp)" },
        { kind: "select", key: "penyerahanDana", label: "Penyerahan dana", options: ["telah diterima Pihak Kedua sebelum penandatanganan akta ini", "akan ditransfer ke rekening Pihak Kedua paling lambat tujuh (7) hari setelah akta ini ditandatangani"], default: "akan ditransfer ke rekening Pihak Kedua paling lambat tujuh (7) hari setelah akta ini ditandatangani" },
        { kind: "text", key: "rekening", label: "Rekening Pengelola (bank, nomor, atas nama)", wide: true },
        { kind: "number", key: "bagianInvestor", label: "Bagi hasil untuk Investor (% dari keuntungan bersih)" },
        { kind: "select", key: "periode", label: "Pembayaran bagi hasil", options: ["setiap bulan", "setiap tiga (3) bulan", "setiap tahun"], default: "setiap bulan" },
        { kind: "date", key: "mulai", label: "Berlaku mulai" },
        { kind: "number", key: "lamaBulan", label: "Jangka waktu (bulan)" },
        { kind: "textarea", key: "jaminan", label: "Jaminan dari Pengelola (bila ada)", wide: true }
      ]
    }
  ],
  signers: (d) => [...parties(d.pihak1), ...parties(d.pihak2)].map((x) => x.p),
  prefill: (ctx) => ({ pihak1: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => ["Bila investasi ditawarkan kepada publik atau banyak investor, periksa ketentuan OJK; akta ini untuk kerja sama privat."],
  build(d, variant) {
    const inv = Number(str(d.bagianInvestor).replace(",", "."));
    const bagianPengelola = Number.isFinite(inv) && inv > 0 && inv < 100 ? pct(Math.round((100 - inv) * 100) / 100) : "[...] persen";
    const blocks: Block[] = [
      judul("PERJANJIAN KERJA SAMA INVESTASI", d),
      ...pembukaDuaPihak(d, "INVESTOR", "PENGELOLA"),
      { t: "p", text: "Para Pihak dengan bertindak sebagaimana tersebut di atas menerangkan telah sepakat untuk mengadakan perjanjian kerja sama investasi dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:" },
      ...pasal(1, "Objek Investasi"),
      { t: "p", text: `Investor menempatkan dana investasi sebesar ${rupiah(str(d.nilai))} kepada Pengelola untuk dipergunakan semata-mata bagi ${str(d.usaha) || "[...]"}; untuk selanjutnya disebut **USAHA**.` },
      ...pasal(2, "Penyerahan Dana"),
      { t: "p", text: `Dana investasi ${str(d.penyerahanDana).replace(/Pihak Kedua/g, "Pengelola")}${str(d.rekening) ? `, yaitu rekening ${str(d.rekening)}` : ""}${str(d.penyerahanDana).startsWith("telah diterima") ? ", dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi)" : ""}.` },
      ...pasal(3, "Kewajiban Pengelola"),
      ...ayat([
        "Pengelola wajib mempergunakan dana investasi hanya untuk Usaha, mengelolanya secara jujur, hati-hati dan bertanggung jawab.",
        "Pengelola wajib menyelenggarakan pembukuan terpisah untuk Usaha dan menyampaikan laporan perkembangan serta laporan keuangan kepada Investor setiap bulan.",
        "Investor berhak memeriksa pembukuan dan lokasi Usaha sewaktu-waktu dengan pemberitahuan terlebih dahulu."
      ]),
      ...pasal(4, "Bagi Hasil"),
      { t: "p", text: `Keuntungan bersih Usaha dibagi dengan perbandingan Investor sebesar ${pct(d.bagianInvestor)} dan Pengelola sebesar ${bagianPengelola}; bagian Investor dibayarkan oleh Pengelola ${str(d.periode) || "setiap bulan"} ${jatuhTempo(str(d.periode))}.` },
      ...pasal(5, "Jangka Waktu dan Pengembalian Modal"),
      ...ayat([
        `Perjanjian ini berlaku untuk jangka waktu ${str(d.lamaBulan) ? angka(str(d.lamaBulan)) : "[...]"} bulan terhitung sejak tanggal ${tanggalHuruf(str(d.mulai))}.`,
        "Pada saat perjanjian berakhir, Pengelola wajib mengembalikan dana investasi kepada Investor setelah diperhitungkan dengan keuntungan dan kerugian Usaha sesuai laporan keuangan akhir, kecuali Para Pihak sepakat memperpanjangnya."
      ]),
      ...pasal(6, "Risiko"),
      { t: "p", text: "Kerugian Usaha yang terjadi bukan karena kesalahan, kelalaian atau penyalahgunaan dana oleh Pengelola ditanggung Para Pihak sesuai perbandingan bagi hasil sebagaimana dimaksud dalam Pasal 4, dengan ketentuan tanggungan Investor tidak melebihi jumlah dana investasinya; kerugian akibat kesalahan, kelalaian atau penyalahgunaan dana oleh Pengelola menjadi tanggungan Pengelola sepenuhnya." }
    ];
    let n = 7;
    if (str(d.jaminan)) blocks.push(...pasal(n++, "Jaminan"), { t: "p", text: `Untuk menjamin pelaksanaan kewajibannya, Pengelola memberikan jaminan berupa ${str(d.jaminan)}.` });
    blocks.push(
      ...pasal(n++, "Wanprestasi"),
      ...ayat([
        "Apabila Pengelola tidak memenuhi kewajibannya dan setelah ditegur secara tertulis dalam waktu empat belas (14) hari tetap lalai, Investor berhak mengakhiri perjanjian ini dan menuntut pengembalian dana investasi berikut bagi hasil yang belum dibayar serta ganti rugi.",
        "Para Pihak melepaskan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata sepanjang mengenai diperlukannya putusan pengadilan untuk pengakhiran perjanjian."
      ]),
      ...penutupPerjanjian(d, n),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
