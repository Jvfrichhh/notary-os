import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { daftarPenghadap, dikenal, domisili, judul, komparisi, list, pembuka, penutup, person, str } from "../common";

const lines = (v: unknown) =>
  str(v)
    .split(/\n+/)
    .map((s) => s.trim().replace(/^(?:[-•]\s*|\d{1,2}[.)]\s+|[a-z][.)]\s+)/i, ""))
    .filter(Boolean);

export const kuasa: DeedTemplate = {
  key: "kuasa",
  title: "Akta Kuasa",
  description: "Pemberian kuasa khusus dari satu atau lebih pemberi kuasa.",
  sections: [
    {
      title: "Pemberi Kuasa (penghadap)",
      fields: [{ kind: "list", key: "pemberi", label: "Pemberi kuasa", itemLabel: "Pemberi kuasa", min: 1, max: 6, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    {
      title: "Penerima Kuasa",
      fields: [{ kind: "list", key: "penerima", label: "Penerima kuasa", itemLabel: "Penerima kuasa", min: 1, max: 4, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    {
      title: "Isi Kuasa",
      fields: [
        { kind: "textarea", key: "keperluan", label: "Untuk keperluan", wide: true, placeholder: "mis. mengurus pengambilan sertifikat Hak Milik Nomor 123/Kelurahan Babakan di Kantor Pertanahan Kota Bogor" },
        { kind: "textarea", key: "wewenang", label: "Wewenang penerima kuasa (satu per baris)", wide: true, help: "Setiap baris menjadi butir a, b, c, dst." },
        { kind: "select", key: "substitusi", label: "Hak substitusi", options: ["dengan hak substitusi", "tanpa hak substitusi"], default: "dengan hak substitusi" }
      ]
    }
  ],
  signers: (d) => list<{ orang?: Person }>(d.pemberi).map((x) => person(x.orang)),
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client) }], keperluan: ctx.job.description ?? "" }),
  notes: (d) => (lines(d.wewenang).length === 0 ? ["Wewenang penerima kuasa belum diisi; akta memakai rumusan umum saja."] : []),
  build(d, variant) {
    const pemberi = list<{ orang?: Person }>(d.pemberi).map((x) => person(x.orang));
    const penerima = list<{ orang?: Person }>(d.penerima).map((x) => person(x.orang));
    const banyak = pemberi.length > 1;
    const wewenang = lines(d.wewenang);
    const blocks: Block[] = [
      judul("KUASA", d),
      ...pembuka(d),
      ...daftarPenghadap(pemberi.map((p) => ({ p, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))),
      dikenal(pemberi.length),
      {
        t: "p",
        text: `${banyak ? "Para penghadap" : "Penghadap"}, untuk selanjutnya disebut **PEMBERI KUASA**, menerangkan dengan ini memberi kuasa kepada:`
      },
      ...penerima.map((p, i) => ({ t: "item" as const, marker: penerima.length > 1 ? `${i + 1}.` : "", text: komparisi(p, i === penerima.length - 1 ? "." : ";") })),
      { t: "p", text: `${penerima.length > 1 ? "Baik bersama-sama maupun sendiri-sendiri, untuk" : "Untuk"} selanjutnya disebut **PENERIMA KUASA**.` },
      { t: "center", text: "KHUSUS", bold: true },
      { t: "p", text: `Untuk dan atas nama Pemberi Kuasa ${str(d.keperluan) || "[...]"}.` }
    ];
    if (wewenang.length) {
      blocks.push({ t: "p", text: "Untuk keperluan tersebut, Penerima Kuasa dikuasakan untuk:" });
      wewenang.forEach((w, i) =>
        blocks.push({ t: "item", marker: `${String.fromCharCode(97 + (i % 26))}.`, text: `${w}${i === wewenang.length - 1 ? "." : ";"}` })
      );
    }
    blocks.push(
      {
        t: "p",
        text: "Selanjutnya Penerima Kuasa dikuasakan untuk menghadap pejabat dan instansi yang berwenang, memberikan keterangan, membuat atau menyuruh membuat serta menandatangani surat-surat dan dokumen yang diperlukan, dan melakukan segala tindakan yang dianggap baik dan perlu untuk tercapainya maksud pemberian kuasa ini, tidak ada satu tindakan pun yang dikecualikan."
      },
      { t: "p", text: `Kuasa ini diberikan ${str(d.substitusi) || "dengan hak substitusi"}.` },
      domisili(d, "Pemberi Kuasa"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
