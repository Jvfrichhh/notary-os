import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person, SectionDef } from "../schema";
import { almarhum, daftarPenghadap, dikenal, domisili, identitas, judul, komparisi, list, namaTebal, pembuka, penutup, person, str } from "../common";
import { pecahan, tanggalHuruf } from "../words";

type AhliWaris = { orang?: Person; hubungan?: string; bagian?: string };

const PEWARIS_SECTIONS: SectionDef[] = [
  {
    title: "Pewaris (almarhum/almarhumah)",
    fields: [
      { kind: "person", key: "pewaris", label: "Identitas pewaris (sesuai KTP terakhir)" },
      { kind: "date", key: "tanggalMeninggal", label: "Tanggal meninggal" },
      { kind: "text", key: "tempatMeninggal", label: "Tempat meninggal" },
      { kind: "text", key: "aktaKematian", label: "Akta/Surat Kematian", wide: true, placeholder: "Kutipan Akta Kematian Nomor 3271-KM-01012026-0001 dari Dinas Kependudukan dan Pencatatan Sipil Kota Bogor" },
      { kind: "text", key: "perkawinan", label: "Perkawinan pewaris", wide: true, placeholder: "kawin dengan Nyonya SITI AMINAH berdasarkan Kutipan Akta Nikah Nomor ..." },
      { kind: "text", key: "keteranganWasiat", label: "Keterangan Daftar Pusat Wasiat", wide: true, placeholder: "Surat Direktur Perdata Nomor AHU.2-AH.04.01-1234 tanggal ... yang menerangkan tidak terdaftar wasiat" }
    ]
  }
];

export const waris: DeedTemplate = {
  key: "waris",
  title: "Akta Keterangan Hak Waris",
  description: "Keterangan para ahli waris dan bagiannya atas harta peninggalan pewaris.",
  sections: [
    ...PEWARIS_SECTIONS,
    {
      title: "Ahli Waris (penghadap)",
      fields: [
        { kind: "select", key: "hukum", label: "Hukum waris yang berlaku", options: ["Kitab Undang-Undang Hukum Perdata", "Hukum Islam (Kompilasi Hukum Islam)"], default: "Kitab Undang-Undang Hukum Perdata" },
        {
          kind: "list",
          key: "ahliWaris",
          label: "Ahli waris",
          itemLabel: "Ahli waris",
          min: 1,
          max: 15,
          fields: [
            { kind: "person", key: "orang", label: "Identitas" },
            { kind: "text", key: "hubungan", label: "Hubungan dengan pewaris", placeholder: "istri / anak kandung" },
            { kind: "text", key: "bagian", label: "Bagian (mis. 1/4)", placeholder: "1/4" }
          ]
        }
      ]
    }
  ],
  signers: (d) => list<AhliWaris>(d.ahliWaris).map((a) => person(a.orang)),
  prefill: (ctx) => ({ ahliWaris: [{ orang: personFromClient(ctx.client) }] }),
  notes: (d) => [
    "Pastikan surat keterangan dari Daftar Pusat Wasiat (Ditjen AHU) sudah ada sebelum akta ditandatangani.",
    "Periksa kembali perhitungan bagian waris; jumlah seluruh bagian harus satu (1).",
    ...(list(d.ahliWaris).some((a) => !str((a as AhliWaris).bagian)) ? ["Ada ahli waris yang bagiannya belum diisi."] : [])
  ],
  build(d, variant) {
    const pw = person(d.pewaris);
    const ahli = list<AhliWaris>(d.ahliWaris);
    const blocks: Block[] = [
      judul("KETERANGAN HAK WARIS", d),
      ...pembuka(d),
      ...daftarPenghadap(ahli.map((a) => ({ p: person(a.orang), peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))),
      dikenal(ahli.length),
      { t: "p", text: "{Penghadap} menerangkan dengan ini dan menjamin kebenarannya:" },
      {
        t: "item",
        marker: "a.",
        text: `bahwa ${almarhum(pw)} ${namaTebal(pw)}, ${identitas(pw, { almarhum: true })}, telah meninggal dunia di ${str(d.tempatMeninggal) || "[...]"} pada tanggal ${tanggalHuruf(str(d.tanggalMeninggal))}, sebagaimana ternyata dari ${str(d.aktaKematian) || "[...]"}; untuk selanjutnya disebut **PEWARIS**;`
      },
      { t: "item", marker: "b.", text: `bahwa semasa hidupnya Pewaris ${str(d.perkawinan) || "[...]"}, dan perkawinan tersebut merupakan satu-satunya perkawinan Pewaris;` },
      { t: "item", marker: "c.", text: `bahwa Pewaris tidak meninggalkan surat wasiat, sebagaimana ternyata dari ${str(d.keteranganWasiat) || "[...]"};` },
      { t: "item", marker: "d.", text: `bahwa menurut ${str(d.hukum) || "Kitab Undang-Undang Hukum Perdata"}, yang berhak atas harta peninggalan Pewaris adalah ${ahli.length > 1 ? "para ahli waris berikut dengan bagian masing-masing" : "ahli waris berikut"}:` },
      ...ahli.map((a, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        level: 1,
        text: `${namaTebal(person(a.orang))}, selaku ${str(a.hubungan) || "[...]"} Pewaris, berhak atas ${pecahan(str(a.bagian)) || "[...]"} bagian${i === ahli.length - 1 ? "." : ";"}`
      })),
      {
        t: "p",
        text:
          ahli.length > 1
            ? "Para ahli waris tersebut di atas merupakan satu-satunya ahli waris Pewaris, dan selain mereka tidak ada lagi orang lain yang berhak atas harta peninggalan Pewaris."
            : "Ahli waris tersebut di atas merupakan satu-satunya ahli waris Pewaris, dan selain dia tidak ada lagi orang lain yang berhak atas harta peninggalan Pewaris."
      },
      {
        t: "p",
        text: "{Penghadap} bertanggung jawab sepenuhnya atas kebenaran keterangan yang diberikan dalam akta ini, dan membebaskan Notaris dari segala tuntutan apabila di kemudian hari ternyata keterangan tersebut tidak benar."
      },
      domisili(d, "{PENGHADAP}"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};

export const kuasaWaris: DeedTemplate = {
  key: "kuasa_waris",
  title: "Akta Kuasa Ahli Waris",
  description: "Kuasa dari para ahli waris kepada salah seorang ahli waris atau pihak lain.",
  sections: [
    ...PEWARIS_SECTIONS.map((s) => ({ ...s, fields: s.fields.filter((f) => ["pewaris", "tanggalMeninggal", "aktaKematian"].includes(f.key)) })),
    {
      title: "Dasar Hak Waris",
      fields: [{ kind: "text", key: "buktiWaris", label: "Akta/Surat Keterangan Waris", wide: true, placeholder: "Akta Keterangan Hak Waris Nomor 7 tanggal ... dibuat di hadapan ..." }]
    },
    {
      title: "Pemberi Kuasa (ahli waris)",
      fields: [{ kind: "list", key: "pemberi", label: "Ahli waris pemberi kuasa", itemLabel: "Ahli waris", min: 1, max: 15, fields: [{ kind: "person", key: "orang", label: "Identitas" }] }]
    },
    { title: "Penerima Kuasa", fields: [{ kind: "person", key: "penerima", label: "Identitas penerima kuasa" }] },
    {
      title: "Isi Kuasa",
      fields: [
        { kind: "textarea", key: "keperluan", label: "Untuk keperluan", wide: true, placeholder: "mengurus balik nama sertipikat Hak Milik Nomor 123/Babakan atas nama Pewaris ke atas nama para ahli waris" },
        { kind: "textarea", key: "wewenang", label: "Wewenang (satu per baris, opsional)", wide: true }
      ]
    }
  ],
  signers: (d) => list<{ orang?: Person }>(d.pemberi).map((x) => person(x.orang)),
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client) }] }),
  build(d, variant) {
    const pemberi = list<{ orang?: Person }>(d.pemberi).map((x) => person(x.orang));
    const pw = person(d.pewaris);
    const wewenang = str(d.wewenang)
      .split(/\n+/)
      .map((s) => s.trim().replace(/^(?:[-•]\s*|\d{1,2}[.)]\s+|[a-z][.)]\s+)/i, ""))
      .filter(Boolean);
    const blocks: Block[] = [
      judul("KUASA", d),
      ...pembuka(d),
      ...daftarPenghadap(pemberi.map((p) => ({ p, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }))),
      dikenal(pemberi.length),
      {
        t: "p",
        text: `{Penghadap} menerangkan bahwa ${pemberi.length > 1 ? "mereka adalah para" : "penghadap adalah"} ahli waris dari ${almarhum(pw)} ${namaTebal(pw)}, yang telah meninggal dunia pada tanggal ${tanggalHuruf(str(d.tanggalMeninggal))} sebagaimana ternyata dari ${str(d.aktaKematian) || "[...]"}, untuk selanjutnya disebut **PEWARIS**, berdasarkan ${str(d.buktiWaris) || "[...]"}.`
      },
      { t: "p", text: "{Penghadap}, untuk selanjutnya disebut **PEMBERI KUASA**, menerangkan dengan ini memberi kuasa kepada:" },
      { t: "item", marker: "", text: komparisi(person(d.penerima), ".") },
      { t: "p", text: "Untuk selanjutnya disebut **PENERIMA KUASA**." },
      { t: "center", text: "KHUSUS", bold: true },
      { t: "p", text: `Untuk dan atas nama Pemberi Kuasa selaku ahli waris Pewaris, ${str(d.keperluan) || "[...]"}.` }
    ];
    if (wewenang.length) {
      blocks.push({ t: "p", text: "Untuk keperluan tersebut, Penerima Kuasa dikuasakan untuk:" });
      wewenang.forEach((w, i) => blocks.push({ t: "item", marker: `${String.fromCharCode(97 + (i % 26))}.`, text: `${w}${i === wewenang.length - 1 ? "." : ";"}` }));
    }
    blocks.push(
      { t: "p", text: "Selanjutnya Penerima Kuasa dikuasakan untuk menghadap pejabat dan instansi yang berwenang, memberikan keterangan, menandatangani surat-surat yang diperlukan, dan melakukan segala tindakan yang dianggap baik dan perlu, tidak ada satu tindakan pun yang dikecualikan." },
      { t: "p", text: "Kuasa ini diberikan dengan hak substitusi." },
      domisili(d, "Pemberi Kuasa"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};

type Wasiat = { penerima?: string; isi?: string };

/** "Nyonya RINA SANTOSO, anak kandung" -> "Nyonya **RINA SANTOSO**, anak kandung". */
function penerimaTebal(v: string): string {
  if (!v) return "[...]";
  const [nama, ...rest] = v.split(",");
  const m = nama.trim().match(/^((?:Tuan|Nyonya|Nona)\s+)?(.+)$/i);
  const sapaan = m?.[1] ?? "";
  const inti = (m?.[2] ?? nama).trim().toUpperCase();
  return `${sapaan}**${inti}**${rest.length ? "," + rest.join(",") : ""}`;
}

export const wasiat: DeedTemplate = {
  key: "wasiat",
  title: "Akta Wasiat",
  description: "Wasiat umum (openbaar testament) dibacakan di hadapan Notaris dan dua saksi.",
  sections: [
    { title: "Pewasiat (penghadap)", fields: [{ kind: "person", key: "pewasiat", label: "Identitas pewasiat" }] },
    {
      title: "Isi Wasiat",
      fields: [
        { kind: "select", key: "cabut", label: "Cabut wasiat sebelumnya?", options: ["Ya", "Tidak"], default: "Ya" },
        {
          kind: "list",
          key: "isi",
          label: "Ketetapan wasiat",
          itemLabel: "Ketetapan",
          min: 1,
          max: 15,
          fields: [
            { kind: "text", key: "penerima", label: "Penerima (nama & hubungan)", placeholder: "Nyonya RINA SANTOSO, anak kandung pewasiat" },
            { kind: "textarea", key: "isi", label: "Yang diwasiatkan", placeholder: "sebidang tanah Hak Milik Nomor 123/Babakan ... berikut bangunan di atasnya" }
          ]
        },
        { kind: "text", key: "pelaksana", label: "Pelaksana wasiat (opsional)", wide: true }
      ]
    }
  ],
  signers: (d) => [person(d.pewasiat)],
  prefill: (ctx) => ({ pewasiat: personFromClient(ctx.client) }),
  notes: () => [
    "Wasiat tidak boleh mengurangi bagian mutlak (legitieme portie) ahli waris menurut KUHPerdata; untuk muslim, wasiat kepada bukan ahli waris paling banyak sepertiga harta (KHI Pasal 195).",
    "Notaris wajib membuat daftar akta wasiat (Pasal 16 ayat (1) huruf i UUJN) dan mengirimkannya ke Daftar Pusat Wasiat dalam waktu lima hari pada minggu pertama bulan berikutnya (Pasal 16 ayat (1) huruf j UUJN)."
  ],
  build(d, variant) {
    const p = person(d.pewasiat);
    const isi = list<Wasiat>(d.isi);
    const blocks: Block[] = [
      judul("WASIAT", d),
      ...pembuka(d),
      ...daftarPenghadap([{ p, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }]),
      dikenal(1),
      { t: "p", text: "Penghadap, untuk selanjutnya disebut **PEWASIAT**, dalam keadaan sehat jasmani dan rohani, atas kehendaknya sendiri tanpa paksaan dari siapa pun, menyatakan kehendak terakhirnya kepada saya, Notaris, di hadapan saksi-saksi, untuk dituangkan dalam akta wasiat umum ini, sebagai berikut:" }
    ];
    let n = 1;
    if (str(d.cabut) !== "Tidak") {
      blocks.push({ t: "item", marker: `${n++}.`, text: "Pewasiat mencabut seluruh surat wasiat, hibah wasiat, dan ketetapan kehendak terakhir lainnya yang pernah dibuat sebelum akta ini." });
    }
    isi.forEach((w) => {
      blocks.push({ t: "item", marker: `${n++}.`, text: `Pewasiat menghibahwasiatkan kepada ${penerimaTebal(str(w.penerima))}, berupa ${str(w.isi).replace(/[.;]+$/, "") || "[...]"}.` });
    });
    if (str(d.pelaksana)) blocks.push({ t: "item", marker: `${n++}.`, text: `Pewasiat mengangkat ${str(d.pelaksana)} sebagai pelaksana wasiat (executeur testamentair) dengan segala hak dan kewenangan menurut undang-undang.` });
    blocks.push(
      { t: "p", text: "Pewasiat menerangkan bahwa wasiat ini dibuat dengan memperhatikan bagian mutlak para ahli warisnya menurut hukum yang berlaku." },
      ...penutup(d, variant, { wasiat: true })
    );
    return blocks;
  }
};
