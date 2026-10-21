import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, denganPasangan, dikenal, domisili, judul, list, pasal, pembuka, penutup, person, str } from "../common";
import { LAND_FIELDS, uraianTanah } from "../land";
import { nomorPenghadap } from "../parties";
import { angka, rupiah, tanggalHuruf } from "../words";

const orang = (v: unknown) => list<{ orang?: Person }>(v).map((x) => person(x.orang));
const LUNAS = "Lunas sebelum penandatanganan akta ini";

export const ppjb: DeedTemplate = {
  key: "ppjb",
  title: "Akta Perjanjian Pengikatan Jual Beli",
  description: "PPJB tanah/bangunan, lunas atau bertahap, dengan kuasa menjual bila lunas.",
  sections: [
    {
      title: "Pihak Pertama (Penjual)",
      fields: [
        { kind: "list", key: "penjual", label: "Penjual", itemLabel: "Penjual", min: 1, max: 4, fields: [{ kind: "person", key: "orang", label: "Identitas" }] },
        { kind: "person", key: "pasanganPenjual", label: "Suami/istri penjual (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    {
      title: "Pihak Kedua (Pembeli)",
      fields: [{ kind: "list", key: "pembeli", label: "Pembeli", itemLabel: "Pembeli", min: 1, max: 4, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    { title: "Objek Jual Beli", fields: LAND_FIELDS },
    {
      title: "Harga & Pembayaran",
      fields: [
        { kind: "money", key: "harga", label: "Harga jual beli (Rp)" },
        { kind: "select", key: "caraBayar", label: "Cara pembayaran", options: [LUNAS, "Bertahap"], default: LUNAS },
        { kind: "money", key: "uangMuka", label: "Uang muka yang sudah dibayar (bila bertahap)" },
        { kind: "date", key: "tanggalPelunasan", label: "Batas pelunasan sisa harga (bila bertahap)" },
        { kind: "number", key: "potonganBatal", label: "Potongan bila batal karena pembeli lalai (% dari harga, bila bertahap)", default: "10" },
        { kind: "date", key: "batasAjb", label: "Batas penandatanganan AJB" },
        {
          kind: "text",
          key: "alasanPpjb",
          label: "Alasan AJB belum dapat dibuat",
          wide: true,
          default: "persyaratan untuk penandatanganan Akta Jual Beli di hadapan Pejabat Pembuat Akta Tanah yang berwenang belum terpenuhi"
        },
        {
          kind: "select",
          key: "penyerahan",
          label: "Penyerahan fisik objek",
          options: ["pada saat penandatanganan akta ini", "pada saat harga dibayar lunas", "pada saat penandatanganan Akta Jual Beli"],
          default: "pada saat penandatanganan Akta Jual Beli"
        },
        {
          kind: "select",
          key: "biaya",
          label: "Biaya akta & balik nama",
          options: ["ditanggung dan dibayar oleh Pihak Kedua", "ditanggung oleh Pihak Pertama dan Pihak Kedua dengan bagian yang sama"],
          default: "ditanggung dan dibayar oleh Pihak Kedua"
        }
      ]
    }
  ],
  signers: (d) => {
    const s = [...orang(d.penjual)];
    if (str(person(d.pasanganPenjual).nama)) s.push(person(d.pasanganPenjual));
    return [...s, ...orang(d.pembeli)];
  },
  prefill: (ctx) => ({ pembeli: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => {
    const n = [
      "Pastikan pengecekan sertipikat ke Kantor Pertanahan sudah dilakukan sebelum penandatanganan.",
      "Kuasa dalam Pasal 9 hanya dimuat bila harga lunas (kuasa mutlak di luar PPJB lunas dilarang, Instruksi Mendagri No. 14 Tahun 1982)."
    ];
    if (str(d.caraBayar) === "Bertahap" && !str(d.tanggalPelunasan)) n.push("Cara bayar bertahap tetapi batas pelunasan belum diisi.");
    return n;
  },
  build(d, variant) {
    const penjual = orang(d.penjual);
    const pembeli = orang(d.pembeli);
    const lunas = str(d.caraBayar) !== "Bertahap";
    const harga = Number(str(d.harga).replace(/\D/g, ""));
    const uangMuka = Number(str(d.uangMuka).replace(/\D/g, ""));
    const sisa = harga > 0 && uangMuka > 0 ? harga - uangMuka : 0;
    const penghadap = [
      ...denganPasangan(penjual, person(d.pasanganPenjual), "menurut keterangannya dalam hal ini bertindak untuk diri sendiri"),
      ...pembeli.map((p) => ({ p, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))
    ];
    const adaPasangan = !!str(person(d.pasanganPenjual).nama);
    const potongan = Number(str(d.potonganBatal).replace(",", ".")) || 0;

    const blocks: Block[] = [
      judul("PERJANJIAN PENGIKATAN JUAL BELI", d),
      ...pembuka(d),
      ...daftarPenghadap(penghadap),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, penjual.length)} tersebut di atas${adaPasangan ? `, dengan persetujuan penghadap ${nomorPenghadap(penjual.length + 1, 1)},` : ""} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(penjual.length + (adaPasangan ? 1 : 0) + 1, pembeli.length)} tersebut di atas untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(penghadap.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      { t: "item", marker: "a.", text: `bahwa Pihak Pertama adalah pemilik yang sah atas ${uraianTanah(d)}; untuk selanjutnya disebut **OBJEK JUAL BELI**;` },
      { t: "item", marker: "b.", text: "bahwa Pihak Pertama bermaksud menjual Objek Jual Beli kepada Pihak Kedua dan Pihak Kedua bermaksud membeli Objek Jual Beli tersebut dari Pihak Pertama;" },
      { t: "item", marker: "c.", text: `bahwa oleh karena ${str(d.alasanPpjb) || "[...]"}, maka para pihak sepakat untuk terlebih dahulu membuat perjanjian pengikatan jual beli dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:` },

      ...pasal(1, "Objek dan Harga"),
      { t: "p", text: `Pihak Pertama berjanji dan mengikatkan diri untuk menjual dan menyerahkan kepada Pihak Kedua, dan Pihak Kedua berjanji dan mengikatkan diri untuk membeli dan menerima penyerahan dari Pihak Pertama, Objek Jual Beli tersebut dengan harga yang disepakati sebesar ${rupiah(harga)}.` },

      ...pasal(2, "Cara Pembayaran"),
      ...(lunas
        ? ayat([`Harga tersebut telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama sebelum penandatanganan akta ini, dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi).`])
        : ayat([
            `Pihak Kedua telah membayar uang muka sebesar ${rupiah(uangMuka)} kepada Pihak Pertama sebelum penandatanganan akta ini, dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaan yang sah (kuitansi).`,
            `Sisa harga sebesar ${rupiah(sisa)} akan dibayar oleh Pihak Kedua kepada Pihak Pertama selambat-lambatnya pada tanggal ${tanggalHuruf(str(d.tanggalPelunasan))}.`,
            "Setiap pembayaran sisa harga dibuktikan dengan kuitansi yang ditandatangani Pihak Pertama, yang merupakan satu kesatuan dengan akta ini."
          ])),

      ...pasal(3, "Penyerahan"),
      { t: "p", text: `Objek Jual Beli diserahkan oleh Pihak Pertama kepada Pihak Kedua dalam keadaan kosong dan baik ${str(d.penyerahan) || "pada saat penandatanganan Akta Jual Beli"}, dan sejak saat itu segala keuntungan dan kerugian atas Objek Jual Beli menjadi hak dan tanggungan Pihak Kedua.` },

      ...pasal(4, "Jaminan Pihak Pertama"),
      { t: "p", text: "Pihak Pertama menjamin Pihak Kedua bahwa:" },
      { t: "item", marker: "a.", text: "Objek Jual Beli benar milik Pihak Pertama dan hanya Pihak Pertama yang berhak menjualnya;" },
      { t: "item", marker: "b.", text: "Objek Jual Beli tidak tersangkut dalam suatu perkara atau sengketa, tidak dikenakan sita, dan tidak dijadikan jaminan suatu utang;" },
      { t: "item", marker: "c.", text: "Objek Jual Beli tidak akan dijual, dijaminkan, atau dialihkan dengan cara apa pun kepada pihak lain selama perjanjian ini berlaku;" },
      { t: "item", marker: "d.", text: "Pihak Kedua tidak akan mendapat tuntutan dari pihak lain yang menyatakan mempunyai hak atas Objek Jual Beli, dan apabila ada, Pihak Pertama akan menyelesaikannya atas tanggungan dan biaya sendiri." },

      ...pasal(5, "Pajak dan Biaya"),
      ...ayat([
        "Pajak Penghasilan atas pengalihan hak atas tanah dan/atau bangunan menjadi tanggungan dan dibayar oleh Pihak Pertama.",
        "Bea Perolehan Hak atas Tanah dan Bangunan menjadi tanggungan dan dibayar oleh Pihak Kedua.",
        `Biaya pembuatan akta ini, Akta Jual Beli dan pendaftaran peralihan haknya ${str(d.biaya) || "ditanggung dan dibayar oleh Pihak Kedua"}.`,
        "Pajak Bumi dan Bangunan sampai dengan tahun penandatanganan akta ini menjadi tanggungan Pihak Pertama."
      ]),

      ...pasal(6, "Akta Jual Beli"),
      { t: "p", text: `Para pihak berjanji dan mengikatkan diri untuk menandatangani Akta Jual Beli atas Objek Jual Beli di hadapan Pejabat Pembuat Akta Tanah yang berwenang segera setelah persyaratannya terpenuhi, selambat-lambatnya pada tanggal ${tanggalHuruf(str(d.batasAjb))}.` },

      ...pasal(7, "Wanprestasi"),
      ...ayat(
        lunas
          ? ["Apabila Pihak Pertama tidak memenuhi kewajibannya menurut akta ini, Pihak Kedua berhak menuntut pemenuhan perjanjian ini disertai penggantian biaya, kerugian dan bunga."]
          : [
              "Apabila Pihak Kedua tidak melunasi sisa harga pada waktu yang ditentukan, Pihak Pertama memberikan teguran tertulis kepada Pihak Kedua untuk melunasinya dalam jangka waktu paling lambat empat belas (14) hari sejak tanggal teguran.",
              `Apabila setelah lewatnya jangka waktu teguran tersebut Pihak Kedua tetap lalai, Pihak Pertama berhak membatalkan perjanjian ini dengan pemberitahuan tertulis, dengan kewajiban mengembalikan seluruh pembayaran yang telah diterima${potongan > 0 ? ` setelah dikurangi ${angka(potongan)} persen dari harga sebagai ganti kerugian` : ""}, tanpa bunga, paling lambat tiga puluh (30) hari sejak pembatalan.`,
              "Apabila Pihak Pertama tidak memenuhi kewajibannya menurut akta ini, Pihak Kedua berhak menuntut pemenuhan perjanjian ini atau pembatalannya, disertai penggantian biaya, kerugian dan bunga.",
              "Untuk pembatalan sebagaimana dimaksud dalam ayat (2), para pihak sepakat mengesampingkan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata sepanjang mengenai diperlukannya putusan pengadilan."
            ]
      ),

      ...pasal(8, "Tidak Berakhir karena Meninggal Dunia"),
      { t: "p", text: "Perjanjian ini tidak berakhir karena meninggalnya salah satu pihak, melainkan turun-temurun dan wajib ditaati oleh para ahli waris atau penerima hak masing-masing pihak." }
    ];

    let nomor = 9;
    if (lunas) {
      blocks.push(
        ...pasal(nomor++, "Kuasa"),
        { t: "p", text: "Oleh karena harga telah dibayar lunas, Pihak Pertama dengan ini memberi kuasa kepada Pihak Kedua untuk dan atas nama Pihak Pertama:" },
        { t: "item", marker: "a.", text: "menjual Objek Jual Beli kepada Pihak Kedua sendiri, menghadap Pejabat Pembuat Akta Tanah yang berwenang serta menandatangani Akta Jual Beli dan segala surat yang diperlukan;" },
        { t: "item", marker: "b.", text: "mengurus pendaftaran peralihan hak dan balik nama Objek Jual Beli ke atas nama Pihak Kedua pada Kantor Pertanahan, membayar pajak dan biaya, serta menerima sertipikatnya." },
        { t: "p", text: "Kuasa tersebut merupakan bagian yang tidak terpisahkan dari perjanjian ini, karenanya tidak dapat ditarik kembali dan tidak berakhir karena sebab-sebab sebagaimana dimaksud dalam Pasal 1813 Kitab Undang-Undang Hukum Perdata." }
      );
    }
    blocks.push(...pasal(nomor, "Domisili"), domisili(d), ...penutup(d, variant));
    return blocks;
  }
};
