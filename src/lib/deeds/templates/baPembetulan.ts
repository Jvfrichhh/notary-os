import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, dikenal, judul, list, pembuka, penutup, str } from "../common";
import { KAPASITAS_FIELD, parties, peranDari } from "../parties";
import { orBlank, tanggalHuruf } from "../words";

type Betul = { letak?: string; semula?: string; seharusnya?: string };

/**
 * Akta Berita Acara Pembetulan (Pasal 51 UUJN): pembetulan kesalahan
 * tulis/ketik pada minuta akta yang sudah ditandatangani, dilakukan di
 * hadapan penghadap, saksi, dan Notaris. Setelah disahkan, pembetulan
 * otomatis tercatat pada akta asalnya di Lemari Arsip (bila nomornya cocok).
 */
export const baPembetulan: DeedTemplate = {
  key: "ba_pembetulan",
  title: "Akta Berita Acara Pembetulan",
  description: "Pembetulan kesalahan tulis/ketik pada minuta akta yang telah ditandatangani (Pasal 51 UUJN).",
  sections: [
    {
      title: "Akta yang Dibetulkan",
      fields: [
        { kind: "text", key: "aktaJudul", label: "Judul akta", wide: true, placeholder: "Perjanjian Pengikatan Jual Beli" },
        { kind: "text", key: "aktaNomor", label: "Nomor akta", placeholder: "12", help: "Angka nomor akta saja; dipakai untuk menautkan ke akta di Lemari Arsip." },
        { kind: "date", key: "aktaTanggal", label: "Tanggal akta" }
      ]
    },
    {
      title: "Penghadap",
      description: "Pembetulan dilakukan di hadapan penghadap akta asal (atau kuasanya), saksi, dan Notaris.",
      fields: [{ kind: "list", key: "penghadap", label: "Penghadap", itemLabel: "Penghadap", min: 1, max: 8, fields: [{ kind: "person", key: "orang", label: "Identitas" }, KAPASITAS_FIELD] }]
    },
    {
      title: "Pembetulan",
      fields: [
        {
          kind: "list",
          key: "pembetulan",
          label: "Yang dibetulkan",
          itemLabel: "Pembetulan",
          min: 1,
          max: 20,
          fields: [
            { kind: "text", key: "letak", label: "Letak", placeholder: "halaman 2 baris ke-7 / komparisi penghadap angka 1", wide: true },
            { kind: "textarea", key: "semula", label: "Semula tertulis" },
            { kind: "textarea", key: "seharusnya", label: "Seharusnya" }
          ]
        }
      ]
    }
  ],
  signers: (d) => parties(d.penghadap).map((x) => x.p),
  subject: (d) => `Pembetulan akta Nomor ${str(d.aktaNomor) || "[...]"}`,
  prefill: (ctx) => ({ penghadap: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Pembetulan menurut Pasal 51 UUJN hanya untuk kesalahan tulis dan/atau kesalahan ketik; perubahan isi/substansi akta memerlukan akta perubahan (addendum) oleh para pihak.",
    "Setelah akta ini ditandatangani: beri catatan pada minuta akta asli dengan menyebut tanggal dan nomor akta berita acara ini, dan sampaikan salinan berita acara kepada para pihak.",
    "Saat disahkan, pembetulan otomatis tercatat pada akta asal di Lemari Arsip bila nomor dan tanggal akta asal cocok; bila tidak, catat manual di halaman akta tersebut."
  ],
  build(d, variant) {
    const pen = parties(d.penghadap);
    const isi = list<Betul>(d.pembetulan);
    const rows: Betul[] = isi.length ? isi : [{}];
    const akta = `akta ${str(d.aktaJudul) || "[...]"} Nomor ${orBlank(str(d.aktaNomor))} tanggal ${tanggalHuruf(str(d.aktaTanggal))}, yang dibuat di hadapan saya, Notaris`;
    const blocks: Block[] = [
      judul("BERITA ACARA PEMBETULAN", d),
      ...pembuka(d),
      ...daftarPenghadap(pen.map((x) => ({ p: x.p, peran: peranDari(x) }))),
      dikenal(pen.length),
      { t: "p", text: `{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:` },
      { t: "item", marker: "-", text: `bahwa {PENGHADAP} adalah pihak dalam ${akta}, yang minutanya telah ditandatangani dengan sempurna;` },
      { t: "item", marker: "-", text: "bahwa setelah minuta akta tersebut ditandatangani, ternyata di dalamnya terdapat kesalahan tulis dan/atau kesalahan ketik;" },
      { t: "item", marker: "-", text: "bahwa kesalahan tersebut tidak mengubah maksud dan isi perbuatan hukum yang dikehendaki para pihak dalam akta tersebut." },
      {
        t: "p",
        text: "Sehubungan dengan hal tersebut, berdasarkan Pasal 51 Undang-Undang Nomor 30 Tahun 2004 tentang Jabatan Notaris sebagaimana telah diubah dengan Undang-Undang Nomor 2 Tahun 2014, saya, Notaris, di hadapan {PENGHADAP} dan saksi-saksi, dengan ini membetulkan kesalahan tulis dan/atau kesalahan ketik pada minuta akta tersebut sebagai berikut:"
      },
      ...rows.flatMap((r, i) => [
        { t: "item" as const, marker: `${i + 1}.`, text: `Pada ${str(r.letak).replace(/[\s.;]+$/, "") || "[...]"}:` },
        { t: "item" as const, marker: "-", level: 1, text: `semula tertulis: "${str(r.semula) || "[...]"}";` },
        { t: "item" as const, marker: "-", level: 1, text: `seharusnya: "${str(r.seharusnya) || "[...]"}"${i === rows.length - 1 ? "." : ";"}` }
      ]),
      { t: "p", text: "Dengan pembetulan tersebut, bagian-bagian akta yang dibetulkan harus dibaca sebagaimana diuraikan di atas, sedangkan ketentuan lain dalam akta tersebut tetap berlaku dan tidak berubah." },
      { t: "p", text: "Tentang pembetulan ini saya, Notaris, memberikan catatan pada minuta akta asli dengan menyebutkan tanggal dan nomor akta berita acara pembetulan ini, dan salinan akta berita acara ini disampaikan kepada para pihak." },
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
