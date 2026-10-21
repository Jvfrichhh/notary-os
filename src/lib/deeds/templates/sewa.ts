import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { ayat, daftarPenghadap, denganPasangan, dikenal, domisili, judul, pasal, pembuka, penutup, person, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, rupiah, tanggalHuruf } from "../words";

export const sewa: DeedTemplate = {
  key: "sewa",
  title: "Akta Perjanjian Sewa",
  description: "Sewa-menyewa tanah/bangunan atau benda lain untuk jangka waktu tertentu.",
  sections: [
    {
      title: "Pihak Pertama (yang menyewakan)",
      fields: [
        partyList("pihak1", "Yang menyewakan", "Yang menyewakan"),
        { kind: "person", key: "pasangan1", label: "Suami/istri yang menyewakan (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    { title: "Pihak Kedua (penyewa)", fields: [partyList("pihak2", "Penyewa", "Penyewa")] },
    {
      title: "Objek & Ketentuan Sewa",
      fields: [
        { kind: "textarea", key: "objek", label: "Uraian objek sewa", wide: true, placeholder: "sebidang tanah Hak Milik Nomor 123/Babakan seluas ... berikut bangunan ruko 2 lantai, terletak di ..." },
        { kind: "text", key: "peruntukan", label: "Peruntukan", default: "tempat tinggal", placeholder: "tempat usaha/kantor/tempat tinggal" },
        { kind: "date", key: "mulai", label: "Sewa mulai" },
        { kind: "date", key: "berakhir", label: "Sewa berakhir" },
        { kind: "number", key: "lamaTahun", label: "Lama sewa (tahun)" },
        { kind: "money", key: "harga", label: "Harga sewa seluruhnya (Rp)" },
        { kind: "select", key: "caraBayar", label: "Pembayaran", options: ["dibayar lunas pada saat penandatanganan akta ini", "dibayar setiap tahun di muka"], default: "dibayar lunas pada saat penandatanganan akta ini" },
        { kind: "money", key: "jaminan", label: "Uang jaminan (bila ada)" }
      ]
    }
  ],
  signers: (d) => {
    const s = parties(d.pihak1).map((x) => x.p);
    if (str(person(d.pasangan1).nama)) s.push(person(d.pasangan1));
    return [...s, ...parties(d.pihak2).map((x) => x.p)];
  },
  prefill: (ctx) => ({ pihak2: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => ["Bila objek tanah bersertipikat, sebutkan nomor sertipikat, NIB, luas, letak, dan NOP pada uraian objek."],
  build(d, variant) {
    const p1 = parties(d.pihak1);
    const p2 = parties(d.pihak2);
    const pasangan = person(d.pasangan1);
    const ada = !!str(pasangan.nama);
    const pen = [
      ...denganPasangan(p1.map((x) => x.p), pasangan, ""),
      ...p2.map((x) => ({ p: x.p, peran: peranDari(x) }))
    ].map((x, i) => (i < p1.length ? { ...x, peran: peranDari(p1[i]) } : x));
    const n1 = p1.length + (ada ? 1 : 0);
    const jaminan = Number(str(d.jaminan).replace(/\D/g, ""));
    const harga = Number(str(d.harga).replace(/\D/g, ""));
    const tahun = Number(str(d.lamaTahun).replace(",", "."));
    const tahunan = str(d.caraBayar) === "dibayar setiap tahun di muka";
    const perTahun = harga > 0 && Number.isInteger(tahun) && tahun > 0 && harga % tahun === 0 ? harga / tahun : 0;
    const blocks: Block[] = [
      judul("PERJANJIAN SEWA-MENYEWA", d),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, p1.length)}${ada ? " (dengan persetujuan pasangannya)" : ""} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(n1 + 1, p2.length)} untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "Para penghadap dengan bertindak sebagaimana tersebut di atas menerangkan bahwa Pihak Pertama menyewakan kepada Pihak Kedua, dan Pihak Kedua menyewa dari Pihak Pertama, dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:" },
      ...pasal(1, "Objek Sewa"),
      { t: "p", text: `Yang disewakan dalam perjanjian ini adalah ${str(d.objek).replace(/[\s.;,]+$/, "") || "[...]"}, untuk selanjutnya disebut **OBJEK SEWA**. Objek Sewa akan dipergunakan oleh Pihak Kedua sebagai ${str(d.peruntukan).replace(/[\s.;,]+$/, "") || "[...]"}.` },
      ...pasal(2, "Jangka Waktu"),
      { t: "p", text: `Sewa-menyewa ini berlangsung untuk jangka waktu ${str(d.lamaTahun) ? angka(str(d.lamaTahun)) : "[...]"} tahun, terhitung mulai tanggal ${tanggalHuruf(str(d.mulai))} dan berakhir pada tanggal ${tanggalHuruf(str(d.berakhir))}.` },
      ...pasal(3, "Harga Sewa"),
      ...ayat([
        `Harga sewa untuk seluruh jangka waktu sewa disepakati sebesar ${rupiah(harga)}, yang ${tahunan ? "dibayar setiap tahun di muka" : "dibayar lunas pada saat penandatanganan akta ini"}.`,
        ...(tahunan
          ? [
              `Harga sewa untuk setiap tahun sebesar ${perTahun ? rupiah(perTahun) : "Rp[...] ([...] Rupiah)"}, dibayar oleh Pihak Kedua kepada Pihak Pertama selambat-lambatnya pada tanggal dimulainya setiap tahun masa sewa; pembayaran tahun pertama dilakukan pada saat penandatanganan akta ini, dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi).`
            ]
          : ["Untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi)."]),
        ...(jaminan ? [`Pihak Kedua menyerahkan uang jaminan sebesar ${rupiah(jaminan)} yang akan dikembalikan pada saat sewa berakhir setelah diperhitungkan dengan kewajiban Pihak Kedua yang belum dipenuhi.`] : [])
      ]),
      ...pasal(4, "Penyerahan"),
      { t: "p", text: "Objek Sewa diserahkan oleh Pihak Pertama kepada Pihak Kedua pada tanggal sewa dimulai dalam keadaan baik dan kosong, dan diterima oleh Pihak Kedua dalam keadaan demikian." },
      ...pasal(5, "Pemeliharaan dan Biaya"),
      ...ayat([
        "Pihak Kedua wajib memelihara Objek Sewa dengan baik atas biaya sendiri, termasuk perbaikan kecil akibat pemakaian sehari-hari.",
        "Perbaikan besar yang tidak disebabkan oleh kesalahan Pihak Kedua menjadi tanggungan Pihak Pertama.",
        "Biaya pemakaian listrik, air, telepon, internet, iuran lingkungan dan biaya sejenis selama masa sewa menjadi tanggungan Pihak Kedua; Pajak Bumi dan Bangunan tetap menjadi tanggungan Pihak Pertama."
      ]),
      ...pasal(6, "Larangan"),
      { t: "p", text: "Tanpa persetujuan tertulis Pihak Pertama, Pihak Kedua dilarang menyewakan kembali, mengalihkan hak sewa, mengubah peruntukan, atau mengubah bentuk Objek Sewa." },
      ...pasal(7, "Berakhirnya Sewa"),
      ...ayat([
        "Pada saat sewa berakhir, Pihak Kedua wajib menyerahkan kembali Objek Sewa kepada Pihak Pertama dalam keadaan kosong dan baik, selambat-lambatnya tujuh (7) hari setelah tanggal berakhirnya sewa.",
        "Apabila Pihak Kedua hendak memperpanjang sewa, Pihak Kedua wajib memberitahukan secara tertulis kepada Pihak Pertama paling lambat tiga (3) bulan sebelum sewa berakhir, dan perpanjangan dilakukan dengan syarat yang disepakati kemudian.",
        "Sewa-menyewa ini tidak berakhir karena dijualnya Objek Sewa (Pasal 1576 Kitab Undang-Undang Hukum Perdata) maupun karena meninggalnya salah satu pihak; para ahli waris atau penerima hak wajib melanjutkannya."
      ]),
      ...pasal(8, "Wanprestasi"),
      ...ayat([
        "Apabila Pihak Kedua lalai membayar harga sewa pada waktunya atau melanggar ketentuan Pasal 6 akta ini, Pihak Pertama memberikan teguran tertulis kepada Pihak Kedua untuk memenuhi kewajibannya dalam jangka waktu paling lambat empat belas (14) hari sejak tanggal teguran.",
        "Apabila setelah lewatnya jangka waktu teguran tersebut Pihak Kedua tetap lalai, Pihak Pertama berhak mengakhiri sewa-menyewa ini dengan pemberitahuan tertulis, dan Pihak Kedua wajib menyerahkan kembali Objek Sewa sesuai ketentuan Pasal 7 ayat (1) akta ini, tanpa mengurangi hak Pihak Pertama atas harga sewa yang telah jatuh tempo.",
        "Untuk pengakhiran sebagaimana dimaksud dalam ayat (2), para pihak sepakat mengesampingkan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata sepanjang mengenai diperlukannya putusan pengadilan."
      ]),
      ...pasal(9, "Domisili"),
      domisili(d),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
