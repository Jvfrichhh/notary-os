import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, denganPasangan, dikenal, domisili, judul, list, pasal, pembuka, penutup, person, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, orBlank, rupiah, tanggalHuruf } from "../words";

type Tanah = {
  jenisHak?: string;
  nomorSertipikat?: string;
  luas?: string;
  suratUkur?: string;
  tanggalSuratUkur?: string;
  atasNama?: string;
  letakProvinsi?: string;
  letakKota?: string;
  letakKecamatan?: string;
  letakKelurahan?: string;
  bangunan?: string;
};

/** "sebidang tanah Hak Milik Nomor ..., terletak di ..., seluas ..., Surat Ukur ..., tercatat atas nama ...". */
function uraianJaminan(t: Tanah): string {
  const luas = Number(str(t.luas));
  const bangunan = str(t.bangunan);
  return [
    `sebidang tanah ${str(t.jenisHak) || "Hak Milik"} Nomor ${orBlank(str(t.nomorSertipikat))}`,
    `terletak di Provinsi ${orBlank(str(t.letakProvinsi))}, ${orBlank(str(t.letakKota))}, Kecamatan ${orBlank(str(t.letakKecamatan))}, ${orBlank(str(t.letakKelurahan))}`,
    `seluas ${Number.isFinite(luas) && luas > 0 ? angka(luas) : "[...]"} meter persegi`,
    `sebagaimana diuraikan dalam Surat Ukur tanggal ${tanggalHuruf(str(t.tanggalSuratUkur))} Nomor ${orBlank(str(t.suratUkur))}`,
    `kepunyaan dan tercatat atas nama **${orBlank(str(t.atasNama)).toUpperCase()}**`,
    bangunan ? `berikut ${bangunan} yang berdiri di atasnya` : ""
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Perjanjian Pinjam Meminjam Uang dan Pengakuan Hutang -- disusun dari akta
 * yang dipakai kantor (Nomor 03 tanggal 04-04-2024): pengakuan hutang, jangka
 * waktu, imbalan jasa, tempat pembayaran, jaminan, penetapan jumlah tagihan,
 * biaya, dan domisili.
 */
export const pengakuanHutang: DeedTemplate = {
  key: "pengakuan_hutang",
  title: "Akta Perjanjian Pinjam Meminjam Uang dan Pengakuan Hutang",
  description: "Pinjam meminjam uang antara orang/badan dengan pengakuan hutang, jangka waktu pengembalian, dan jaminan (bila ada).",
  sections: [
    {
      title: "Pihak Pertama (Yang Berhutang)",
      fields: [
        partyList("debitur", "Pihak Pertama", "Pihak Pertama", 1, 4),
        { kind: "person", key: "pasangan", label: "Suami/istri Pihak Pertama (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    {
      title: "Pihak Kedua (Yang Memberi Pinjaman)",
      fields: [partyList("kreditur", "Pihak Kedua", "Pihak Kedua", 1, 4)]
    },
    {
      title: "Pinjaman",
      fields: [
        { kind: "money", key: "jumlahHutang", label: "Jumlah pinjaman (Rp)" },
        {
          kind: "select",
          key: "penerimaan",
          label: "Penyerahan uang",
          options: ["Sudah diterima seluruhnya (akta ini sebagai kwitansi)", "Sudah diterima sebelum akta ini, dengan tanda terima tersendiri"],
          default: "Sudah diterima seluruhnya (akta ini sebagai kwitansi)",
          wide: true
        },
        { kind: "text", key: "jangkaWaktu", label: "Jangka waktu", placeholder: "21 (dua puluh satu) hari" },
        { kind: "date", key: "tanggalMulai", label: "Terhitung sejak tanggal" },
        { kind: "date", key: "tanggalJatuhTempo", label: "Berakhir (jatuh tempo) tanggal" },
        {
          kind: "textarea",
          key: "imbalan",
          label: "Imbalan jasa / keuntungan",
          placeholder: "mis. sebesar 2% (dua persen) per bulan dari pokok hutang, dibayar setiap tanggal 5",
          help: "Kosongkan bila imbalan diatur dalam perjanjian tambahan di luar akta ini."
        },
        { kind: "text", key: "tempatBayar", label: "Tempat pembayaran", wide: true, default: "di tempat kediaman/kantor Pihak Kedua" }
      ]
    },
    {
      title: "Jaminan",
      description: "Kosongkan seluruh bagian ini bila pinjaman tanpa jaminan.",
      fields: [
        {
          kind: "list",
          key: "jaminanTanah",
          label: "Tanah yang dijaminkan",
          itemLabel: "Bidang tanah",
          min: 0,
          max: 10,
          fields: [
            { kind: "select", key: "jenisHak", label: "Jenis hak", options: ["Hak Milik", "Hak Guna Bangunan", "Hak Pakai", "Hak Milik Atas Satuan Rumah Susun"], default: "Hak Milik" },
            { kind: "text", key: "nomorSertipikat", label: "Nomor sertipikat", placeholder: "10926" },
            { kind: "number", key: "luas", label: "Luas tanah (m²)" },
            { kind: "text", key: "suratUkur", label: "Surat Ukur nomor", placeholder: "75649" },
            { kind: "date", key: "tanggalSuratUkur", label: "Tanggal surat ukur" },
            { kind: "text", key: "atasNama", label: "Tercatat atas nama" },
            { kind: "text", key: "letakProvinsi", label: "Provinsi", default: "Jawa Barat" },
            { kind: "text", key: "letakKota", label: "Kota/Kabupaten (lengkap)", placeholder: "Kabupaten Bogor" },
            { kind: "text", key: "letakKecamatan", label: "Kecamatan" },
            { kind: "text", key: "letakKelurahan", label: "Kelurahan/Desa (lengkap)", placeholder: "Kelurahan Pakansari" },
            { kind: "text", key: "bangunan", label: "Bangunan di atasnya (bila ada)", placeholder: "rumah tinggal permanen", wide: true }
          ]
        },
        { kind: "text", key: "kantorPertanahan", label: "Kantor Pertanahan penerbit sertipikat", placeholder: "Kabupaten Bogor" },
        {
          kind: "textarea",
          key: "catatanJaminan",
          label: "Keterangan atas jaminan tanah",
          placeholder: "mis. kesemua sertipikat tersebut di atas belum dibaliknamakan kepada Pihak Pertama"
        },
        {
          kind: "textarea",
          key: "jaminanLain",
          label: "Jaminan lain (selain tanah)",
          placeholder: "mis. 1 (satu) unit mobil merek ..., BPKB Nomor ..., atas nama ..."
        }
      ]
    }
  ],
  signers: (d) => {
    const s = parties(d.debitur).map((x) => x.p);
    if (str(person(d.pasangan).nama)) s.push(person(d.pasangan));
    return [...s, ...parties(d.kreditur).map((x) => x.p)];
  },
  signerLabels: (d) => {
    const n1 = parties(d.debitur).length + (str(person(d.pasangan).nama) ? 1 : 0);
    return [...Array.from({ length: n1 }, () => "Pihak Pertama,"), ...parties(d.kreditur).map(() => "Pihak Kedua,")];
  },
  subject: (d) => `Pengakuan hutang ${rupiah(str(d.jumlahHutang))}`,
  prefill: (ctx) => ({ debitur: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: (d) => {
    const n = [
      "Pastikan jumlah hutang, jangka waktu, dan tanggal jatuh tempo sesuai kesepakatan para pihak; jumlah hutang harus pasti (tertentu).",
      "Grosse akta pengakuan hutang (berirah-irah) hanya dikeluarkan bila akta memuat pengakuan hutang dengan jumlah yang pasti."
    ];
    if (list(d.jaminanTanah).length)
      n.push(
        "Jaminan tanah dalam akta ini BELUM membebankan Hak Tanggungan. Agar kreditor berkedudukan preferen, buat SKMHT/APHT tersendiri dan daftarkan ke Kantor Pertanahan.",
        "Bila sertipikat masih atas nama pihak lain, pastikan dasar penguasaan Pihak Pertama (AJB/PPJB lunas/kuasa) dan minta persetujuan pemilik yang tercatat."
      );
    return n;
  },
  build(d, variant) {
    const debitur = parties(d.debitur);
    const kreditur = parties(d.kreditur);
    const pasangan = person(d.pasangan);
    const ada = !!str(pasangan.nama);
    const pen = [
      ...denganPasangan(debitur.map((x) => x.p), pasangan, "").map((x, i) => (i < debitur.length ? { ...x, peran: peranDari(debitur[i]) } : x)),
      ...kreditur.map((x) => ({ p: x.p, peran: peranDari(x) }))
    ];
    const n1 = debitur.length + (ada ? 1 : 0);
    const jumlah = rupiah(str(d.jumlahHutang));
    const kwitansi = !str(d.penerimaan) || str(d.penerimaan).startsWith("Sudah diterima seluruhnya");
    const imbalan = str(d.imbalan).replace(/[\s.;]+$/, "");
    const tanah = list<Tanah>(d.jaminanTanah);
    const jaminanLain = str(d.jaminanLain).replace(/[\s.;]+$/, "");
    const catatan = str(d.catatanJaminan).replace(/[\s.;]+$/, "");
    const adaJaminan = tanah.length > 0 || !!jaminanLain;

    let no = 0;
    const blocks: Block[] = [
      judul("PERJANJIAN PINJAM MEMINJAM UANG DAN", d, "PENGAKUAN HUTANG"),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, debitur.length)}${ada ? `, dengan persetujuan penghadap ${nomorPenghadap(debitur.length + 1, 1)},` : ""} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(n1 + 1, kreditur.length)} untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: kwitansi
          ? `bahwa Pihak Pertama telah mendapat pinjaman uang dari Pihak Kedua sebesar ${jumlah}, seluruh jumlah uang tersebut telah diterima oleh Pihak Pertama dari Pihak Kedua, dan untuk penerimaan sejumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaannya atau kwitansinya yang sah;`
          : `bahwa Pihak Pertama telah mendapat pinjaman uang dari Pihak Kedua sebesar ${jumlah}, seluruh jumlah uang tersebut telah diterima oleh Pihak Pertama dari Pihak Kedua sebelum penandatanganan akta ini dengan tanda penerimaan tersendiri;`
      },
      {
        t: "item",
        marker: "-",
        text: "bahwa sehubungan dengan hal tersebut di atas, Pihak Pertama dengan ini mengakui dengan sebenar-benarnya dan secara sah berhutang kepada Pihak Kedua sejumlah uang tersebut di atas, yang untuk selanjutnya disebut **HUTANG**;"
      },
      { t: "item", marker: "-", text: "bahwa Pihak Kedua menerangkan dengan ini menerima pengakuan hutang dari Pihak Pertama tersebut di atas." },
      {
        t: "p",
        text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan bahwa pengakuan hutang ini dilakukan dan diterima dengan perjanjian-perjanjian dan ketentuan-ketentuan sebagai berikut:"
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Hutang sejumlah ${jumlah} yang diberikan oleh Pihak Kedua kepada Pihak Pertama harus dibayar kembali seluruhnya oleh Pihak Pertama kepada Pihak Kedua dalam jangka waktu ${orBlank(str(d.jangkaWaktu))} lamanya, terhitung sejak tanggal ${tanggalHuruf(str(d.tanggalMulai))} sampai dengan dan berakhir pada tanggal ${tanggalHuruf(str(d.tanggalJatuhTempo))}, dengan ketentuan bahwa jangka waktu tersebut atas persetujuan para pihak dapat diperpanjang.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: imbalan
          ? `Atas Hutang tersebut Pihak Pertama wajib memberikan imbalan jasa/keuntungan kepada Pihak Kedua ${imbalan}.`
          : "Atas Hutang tersebut Pihak Pertama wajib memberikan imbalan jasa/keuntungan kepada Pihak Kedua, yang akan diatur dalam perjanjian tambahan atas kesepakatan kedua belah pihak, di luar akta ini."
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Semua pembayaran Hutang dan imbalan jasa/keuntungan tersebut harus dilakukan oleh Pihak Pertama kepada Pihak Kedua ${str(d.tempatBayar) || "di tempat kediaman/kantor Pihak Kedua"}, dengan mendapat kwitansi dari Pihak Kedua.`
      }
    ];

    if (adaJaminan) {
      blocks.push(...pasal(++no), {
        t: "p",
        text: "Untuk lebih menjamin pembayaran kembali Hutang sebagaimana mestinya dan segala sesuatu yang berdasarkan akta ini atau karena apa pun juga harus dibayar oleh Pihak Pertama kepada Pihak Kedua, baik pokok Hutang maupun imbalan jasa/keuntungan, Pihak Pertama memberikan jaminan kepada Pihak Kedua, yang menerima jaminan tersebut, atas:"
      });
      const items = [...tanah.map(uraianJaminan), ...(jaminanLain ? [jaminanLain] : [])];
      items.forEach((text, i) => blocks.push({ t: "item", marker: "-", text: `${text}${i === items.length - 1 ? "." : ";"}` }));
      if (tanah.length)
        blocks.push({
          t: "p",
          text: `Demikian menurut Sertipikat (Tanda Bukti Hak) dari Kantor Pertanahan ${orBlank(str(d.kantorPertanahan))}, berikut segala sesuatu yang berada di atas tanah tersebut, setempat dikenal sebagai tanah dan bangunan serta segala sesuatu yang berada di atasnya${catatan ? `; ${catatan}` : ""}.`
        });
    }

    blocks.push(
      ...pasal(++no),
      {
        t: "p",
        text: "Dalam hal Pihak Kedua menjalankan hak-hak dan hak-hak istimewanya berdasarkan pengakuan hutang ini, maka baik tentang adanya maupun tentang jumlah Hutang Pihak Pertama kepada Pihak Kedua tidak perlu terlebih dahulu ditetapkan oleh atau terbukti bagi para pihak, akan tetapi Pihak Kedua berhak menetapkan sendiri jumlah penagihan, yaitu pokok Hutang, imbalan jasa/keuntungan, biaya penagihan, dan biaya-biaya lainnya; demikian dengan tidak mengurangi hak Pihak Pertama, setelah membayar seluruh Hutang dan tagihan tersebut kepada Pihak Kedua, untuk menuntut pembayaran kembali dari Pihak Kedua atas jumlah yang ternyata telah dibayar berlebih oleh Pihak Pertama kepada Pihak Kedua; atas pembayaran kelebihan tersebut Pihak Pertama tidak berhak meminta ganti kerugian apa pun dari Pihak Kedua."
      },
      ...pasal(++no),
      { t: "p", text: "Biaya pembuatan akta ini dan biaya lainnya berkenaan dengan dibuatnya akta ini menjadi tanggungan dan harus dibayar oleh Pihak Pertama." },
      ...pasal(++no),
      domisili(d),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
