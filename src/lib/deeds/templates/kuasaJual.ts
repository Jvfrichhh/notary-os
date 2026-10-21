import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { daftarPenghadap, denganPasangan, dikenal, domisili, judul, komparisi, list, pembuka, penutup, person, str } from "../common";
import { LAND_FIELDS, uraianTanah } from "../land";
import { nomorPenghadap } from "../parties";

const orang = (v: unknown) => list<{ orang?: Person }>(v).map((x) => person(x.orang));

export const kuasaJual: DeedTemplate = {
  key: "kuasa_jual",
  title: "Akta Kuasa Jual",
  description: "Kuasa untuk menjual tanah/bangunan beserta pengurusan AJB dan balik nama.",
  sections: [
    {
      title: "Pemberi Kuasa (pemilik)",
      fields: [
        { kind: "list", key: "pemberi", label: "Pemberi kuasa", itemLabel: "Pemberi kuasa", min: 1, max: 4, fields: [{ kind: "person", key: "orang", label: "Identitas" }] },
        { kind: "person", key: "pasangan", label: "Suami/istri pemberi kuasa (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    {
      title: "Penerima Kuasa",
      fields: [{ kind: "list", key: "penerima", label: "Penerima kuasa", itemLabel: "Penerima kuasa", min: 1, max: 3, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    { title: "Objek yang Dikuasakan untuk Dijual", fields: LAND_FIELDS },
    {
      title: "Ketentuan Kuasa",
      fields: [
        { kind: "select", key: "substitusi", label: "Hak substitusi", options: ["dengan hak substitusi", "tanpa hak substitusi"], default: "dengan hak substitusi" }
      ]
    }
  ],
  signers: (d) => {
    const s = orang(d.pemberi);
    if (str(person(d.pasangan).nama)) s.push(person(d.pasangan));
    return s;
  },
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client) }] }),
  notes: () => [
    "Kuasa jual ini TIDAK dibuat sebagai kuasa mutlak (dapat dicabut). Kuasa mutlak untuk pemindahan hak atas tanah dilarang (Instruksi Mendagri No. 14 Tahun 1982), kecuali sebagai bagian PPJB lunas."
  ],
  build(d, variant) {
    const pemberi = orang(d.pemberi);
    const penerima = orang(d.penerima);
    const penghadap = denganPasangan(pemberi, person(d.pasangan), "menurut keterangannya dalam hal ini bertindak untuk diri sendiri");
    const ada = !!str(person(d.pasangan).nama);
    const blocks: Block[] = [
      judul("KUASA UNTUK MENJUAL", d),
      ...pembuka(d),
      ...daftarPenghadap(penghadap),
      dikenal(penghadap.length),
      {
        t: "p",
        text: ada
          ? `Penghadap ${nomorPenghadap(1, pemberi.length)}${pemberi.length > 1 ? " selaku para pemilik" : " selaku pemilik"}, dengan persetujuan penghadap ${nomorPenghadap(pemberi.length + 1, 1)}, untuk selanjutnya disebut **PEMBERI KUASA**, menerangkan dengan ini memberi kuasa kepada:`
          : `{Penghadap}${pemberi.length > 1 ? " selaku para pemilik" : " selaku pemilik"}, untuk selanjutnya disebut **PEMBERI KUASA**, menerangkan dengan ini memberi kuasa kepada:`
      },
      ...penerima.map((p, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: komparisi(p, i === penerima.length - 1 ? "." : ";") })),
      { t: "p", text: `${penerima.length > 1 ? "Baik bersama-sama maupun sendiri-sendiri, untuk" : "Untuk"} selanjutnya disebut **PENERIMA KUASA**.` },
      { t: "center", text: "KHUSUS", bold: true },
      { t: "p", text: `Untuk dan atas nama Pemberi Kuasa menjual ${uraianTanah(d)}; untuk selanjutnya disebut **OBJEK**.` },
      { t: "p", text: "Untuk keperluan tersebut Penerima Kuasa dikuasakan untuk:" },
      {
        t: "item",
        marker: "a.",
        text: "menjual Objek kepada pihak lain, dengan harga dan syarat-syarat yang dianggap baik oleh Penerima Kuasa;"
      },
      { t: "item", marker: "b.", text: "menghadap Pejabat Pembuat Akta Tanah yang berwenang, menandatangani Akta Jual Beli serta surat-surat lain yang diperlukan;" },
      { t: "item", marker: "c.", text: "menerima uang harga penjualan dan memberikan tanda penerimaannya (kuitansi);" },
      { t: "item", marker: "d.", text: "menyerahkan Objek kepada pembeli, membayar pajak-pajak dan biaya yang berkaitan dengan penjualan Objek;" },
      { t: "item", marker: "e.", text: "menghadap Kantor Pertanahan dan instansi lain yang berwenang guna mengurus peralihan hak, memberikan keterangan, serta menandatangani permohonan yang diperlukan." },
      {
        t: "p",
        text: "Selanjutnya Penerima Kuasa dikuasakan untuk melakukan segala tindakan yang dianggap baik dan perlu untuk tercapainya maksud pemberian kuasa ini, tidak ada satu tindakan pun yang dikecualikan."
      },
      { t: "p", text: `Kuasa ini diberikan ${str(d.substitusi) || "dengan hak substitusi"}, dan tidak termasuk kewenangan untuk menjual Objek kepada Penerima Kuasa sendiri.` },
      domisili(d, "Pemberi Kuasa"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
