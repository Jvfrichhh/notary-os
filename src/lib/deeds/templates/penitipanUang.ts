import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, dikenal, domisili, judul, pasal, pembuka, penutup, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { rupiah, tanggalHuruf } from "../words";

const SEWAKTU = "Sewaktu-waktu diminta oleh Pihak Kedua";

/**
 * Akta Pengakuan Penitipan Uang (Pasal 1694 dst. KUHPerdata): Pihak Pertama
 * mengakui menerima dan menyimpan uang titipan milik Pihak Kedua, dengan
 * kewajiban mengembalikannya dalam jumlah yang sama.
 */
export const penitipanUang: DeedTemplate = {
  key: "penitipan_uang",
  title: "Akta Pengakuan Penitipan Uang",
  description: "Pengakuan menerima uang titipan dan kewajiban mengembalikannya kepada penitip (Pasal 1694 KUHPerdata).",
  sections: [
    {
      title: "Pihak Pertama (Penerima Titipan)",
      fields: [partyList("penerima", "Pihak Pertama", "Pihak Pertama", 1, 4)]
    },
    {
      title: "Pihak Kedua (Penitip)",
      fields: [partyList("penitip", "Pihak Kedua", "Pihak Kedua", 1, 4)]
    },
    {
      title: "Uang Titipan",
      fields: [
        { kind: "money", key: "jumlah", label: "Jumlah uang titipan (Rp)" },
        {
          kind: "select",
          key: "penerimaan",
          label: "Penyerahan uang",
          options: ["Sudah diterima seluruhnya (akta ini sebagai kwitansi)", "Sudah diterima sebelum akta ini, dengan tanda terima tersendiri"],
          default: "Sudah diterima seluruhnya (akta ini sebagai kwitansi)",
          wide: true
        },
        {
          kind: "textarea",
          key: "keperluan",
          label: "Maksud / keperluan penitipan",
          placeholder: "mis. untuk pembayaran pelunasan harga tanah Hak Milik Nomor ... setelah sertipikat selesai dibalik nama",
          help: "Kosongkan bila uang hanya dititipkan untuk disimpan."
        },
        {
          kind: "select",
          key: "pengembalian",
          label: "Waktu pengembalian",
          options: [SEWAKTU, "Paling lambat pada tanggal tertentu"],
          default: SEWAKTU,
          wide: true
        },
        { kind: "date", key: "tanggalKembali", label: "Tanggal pengembalian paling lambat", help: "Diisi bila memilih tanggal tertentu." },
        {
          kind: "text",
          key: "caraKembali",
          label: "Cara pengembalian",
          wide: true,
          default: "secara tunai dan sekaligus",
          placeholder: "mis. dengan pemindahbukuan ke rekening Bank ... Nomor ... atas nama ..."
        },
        {
          kind: "textarea",
          key: "denda",
          label: "Akibat bila terlambat mengembalikan (opsional)",
          placeholder: "mis. denda sebesar 1‰ (satu permil) per hari dari jumlah Uang Titipan yang belum dikembalikan"
        }
      ]
    }
  ],
  signers: (d) => [...parties(d.penerima).map((x) => x.p), ...parties(d.penitip).map((x) => x.p)],
  signerLabels: (d) => [...parties(d.penerima).map(() => "Pihak Pertama,"), ...parties(d.penitip).map(() => "Pihak Kedua,")],
  subject: (d) => `Pengakuan penitipan uang ${rupiah(str(d.jumlah))}`,
  prefill: (ctx) => ({ penitip: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Penitipan berbeda dengan pinjam meminjam: uang titipan tetap milik penitip dan tidak boleh dipakai penerima titipan (Pasal 1712 KUHPerdata). Bila uang memang boleh dipakai dan dikembalikan dengan imbalan, gunakan Akta Pengakuan Hutang.",
    "Pastikan jumlah uang dan cara penyerahannya (tunai/transfer) sesuai bukti; lekatkan salinan bukti penyerahan pada minuta bila ada.",
    "Penitipan dalam jumlah besar termasuk transaksi yang perlu dicermati dalam PMPJ: catat sumber dana dan tujuan penitipan di data klien."
  ],
  build(d, variant) {
    const penerima = parties(d.penerima);
    const penitip = parties(d.penitip);
    const pen = [...penerima, ...penitip].map((x) => ({ p: x.p, peran: peranDari(x) }));
    const jumlah = rupiah(str(d.jumlah));
    const kwitansi = !str(d.penerimaan) || str(d.penerimaan).startsWith("Sudah diterima seluruhnya");
    const keperluan = str(d.keperluan).replace(/[\s.;]+$/, "");
    const sewaktu = !str(d.pengembalian) || str(d.pengembalian) === SEWAKTU;
    const cara = str(d.caraKembali).replace(/[\s.;]+$/, "") || "secara tunai dan sekaligus";
    const denda = str(d.denda).replace(/[\s.;]+$/, "");

    let no = 0;
    const blocks: Block[] = [
      judul("PENGAKUAN PENITIPAN UANG", d),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, penerima.length)} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(penerima.length + 1, penitip.length)} untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: kwitansi
          ? `bahwa Pihak Kedua telah menitipkan kepada Pihak Pertama uang sebesar ${jumlah}, seluruh jumlah uang tersebut telah diterima oleh Pihak Pertama dari Pihak Kedua, dan untuk penerimaan sejumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaannya atau kwitansinya yang sah;`
          : `bahwa Pihak Kedua telah menitipkan kepada Pihak Pertama uang sebesar ${jumlah}, seluruh jumlah uang tersebut telah diterima oleh Pihak Pertama dari Pihak Kedua sebelum penandatanganan akta ini dengan tanda penerimaan tersendiri;`
      },
      ...(keperluan ? [{ t: "item" as const, marker: "-", text: `bahwa uang tersebut dititipkan ${keperluan};` }] : []),
      {
        t: "item",
        marker: "-",
        text: "bahwa sehubungan dengan hal tersebut di atas, Pihak Pertama dengan ini mengakui dengan sebenar-benarnya dan secara sah telah menerima serta menyimpan uang titipan milik Pihak Kedua sejumlah tersebut di atas, yang untuk selanjutnya disebut **UANG TITIPAN**;"
      },
      { t: "item", marker: "-", text: "bahwa Pihak Kedua menerangkan dengan ini menerima pengakuan penitipan uang dari Pihak Pertama tersebut di atas." },
      {
        t: "p",
        text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan bahwa pengakuan penitipan uang ini dilakukan dan diterima dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:"
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Uang Titipan adalah dan tetap merupakan milik Pihak Kedua. Pihak Pertama wajib menyimpan dan memelihara Uang Titipan dengan sebaik-baiknya, serta tidak berhak memakai, meminjamkan, menjaminkan, atau mengalihkan Uang Titipan dengan cara apa pun untuk kepentingan Pihak Pertama sendiri maupun pihak lain, tanpa persetujuan tertulis terlebih dahulu dari Pihak Kedua."
      },
      ...pasal(++no),
      {
        t: "p",
        text: sewaktu
          ? `Pihak Pertama wajib mengembalikan Uang Titipan seluruhnya, dalam jumlah yang sama dengan yang diterimanya, kepada Pihak Kedua sewaktu-waktu diminta oleh Pihak Kedua, ${cara}, dengan mendapat tanda penerimaan dari Pihak Kedua.`
          : `Pihak Pertama wajib mengembalikan Uang Titipan seluruhnya, dalam jumlah yang sama dengan yang diterimanya, kepada Pihak Kedua selambat-lambatnya pada tanggal ${tanggalHuruf(str(d.tanggalKembali))}, atau lebih awal bila diminta oleh Pihak Kedua, ${cara}, dengan mendapat tanda penerimaan dari Pihak Kedua.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Atas penitipan ini Pihak Kedua tidak wajib membayar upah, bunga, atau imbalan apa pun kepada Pihak Pertama, dan Pihak Pertama tidak berhak memperhitungkan (mengkompensasikan) Uang Titipan dengan tagihan apa pun yang dimilikinya terhadap Pihak Kedua.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: denda
          ? `Apabila Pihak Pertama tidak atau terlambat mengembalikan Uang Titipan sebagaimana ditentukan dalam akta ini, maka lewatnya waktu saja telah menjadi bukti yang sah dan cukup bahwa Pihak Pertama telah lalai, sehingga tidak diperlukan lagi teguran dengan surat juru sita atau surat lain semacam itu, dan Pihak Pertama dikenakan ${denda}.`
          : "Apabila Pihak Pertama tidak atau terlambat mengembalikan Uang Titipan sebagaimana ditentukan dalam akta ini, maka lewatnya waktu saja telah menjadi bukti yang sah dan cukup bahwa Pihak Pertama telah lalai, sehingga tidak diperlukan lagi teguran dengan surat juru sita atau surat lain semacam itu, dan Pihak Kedua berhak menagih Uang Titipan seketika dan sekaligus berikut penggantian biaya, rugi, dan bunga menurut hukum."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pengakuan penitipan uang ini tidak berakhir karena salah satu pihak meninggal dunia, tetapi berlaku turun-temurun dan harus dipenuhi oleh para ahli waris atau penerima hak dari pihak yang meninggal dunia."
      },
      ...pasal(++no),
      { t: "p", text: "Biaya pembuatan akta ini dan biaya lainnya berkenaan dengan dibuatnya akta ini menjadi tanggungan dan harus dibayar oleh Pihak Pertama." },
      ...pasal(++no),
      domisili(d),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
