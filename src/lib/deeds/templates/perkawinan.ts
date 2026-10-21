import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person } from "../schema";
import { ayat, daftarPenghadap, dikenal, domisili, judul, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import { tanggalHuruf } from "../words";

const lines = (v: unknown) =>
  str(v)
    .split(/\n+/)
    .map((s) => s.trim().replace(/^(?:[-•]\s*|\d{1,2}[.)]\s+|[a-z][.)]\s+)/i, "").replace(/[\s.;,]+$/, ""))
    .filter(Boolean);

const BIAYA_OPTS = ["ditanggung oleh pihak suami", "ditanggung bersama oleh suami dan istri secara seimbang dengan penghasilan masing-masing"];

function butir(teks: string[], level = 1): Block[] {
  return teks.map((t, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + (i % 26))}.`, level, text: `${t}${i === teks.length - 1 ? "." : ";"}` }));
}

/** Penegasan sebutan para pihak, ditempatkan sebelum pasal-pasal. */
function sebutan(s: Person, i: Person): Block {
  return { t: "p", text: `${namaTebal(s)} untuk selanjutnya disebut **PIHAK SUAMI**, dan ${namaTebal(i)} untuk selanjutnya disebut **PIHAK ISTRI**; Pihak Suami dan Pihak Istri bersama-sama disebut **PARA PIHAK**.` };
}

function pasalPemisahan(d: Record<string, unknown>, pasca: boolean): Block[] {
  const mulai = pasca ? "tanggal akta ini" : "perkawinan dilangsungkan";
  const hartaSuami = lines(d.hartaSuami);
  const hartaIstri = lines(d.hartaIstri);
  const blocks: Block[] = [
    ...pasal(1, "Pemisahan Harta"),
    { t: "p", text: `Antara Pihak Suami dan Pihak Istri tidak akan ada persatuan harta benda dalam bentuk dan nama apa pun juga, baik persatuan harta menurut undang-undang maupun persatuan untung dan rugi ataupun persatuan hasil dan pendapatan, terhitung sejak ${mulai}.` },
    ...pasal(2, "Harta Masing-masing"),
    {
      t: "p",
      text: pasca
        ? "Harta bawaan masing-masing pihak serta segala harta benda yang diperoleh masing-masing pihak terhitung sejak tanggal akta ini, baik karena pekerjaan, usaha, warisan, hibah, maupun dengan cara lain, tetap menjadi milik pihak yang membawa atau memperolehnya."
        : "Segala harta benda yang dibawa ke dalam perkawinan maupun yang diperoleh selama perkawinan oleh masing-masing pihak, baik karena pekerjaan, usaha, warisan, hibah, maupun dengan cara lain, tetap menjadi milik pihak yang membawa atau memperolehnya."
    }
  ];
  if (hartaSuami.length || hartaIstri.length) {
    blocks.push({ t: "p", text: "Harta bawaan masing-masing pihak antara lain:" });
    if (hartaSuami.length) blocks.push({ t: "item", marker: "1.", text: "milik Pihak Suami:" }, ...butir(hartaSuami));
    if (hartaIstri.length) blocks.push({ t: "item", marker: hartaSuami.length ? "2." : "1.", text: "milik Pihak Istri:" }, ...butir(hartaIstri));
  }
  blocks.push(
    ...pasal(3, "Utang"),
    {
      t: "p",
      text: pasca
        ? "Utang yang dibuat oleh masing-masing pihak terhitung sejak tanggal akta ini menjadi tanggungan pihak yang membuatnya dan tidak dapat ditagihkan kepada pihak lainnya; adapun utang yang telah ada sebelum tanggal akta ini tunduk pada ketentuan pasal mengenai pihak ketiga dalam akta ini."
        : "Utang yang dibuat oleh masing-masing pihak, baik sebelum maupun selama perkawinan, menjadi tanggungan pihak yang membuatnya, dan tidak dapat ditagihkan kepada pihak lainnya."
    },
    ...pasal(4, "Pengurusan Harta"),
    { t: "p", text: "Masing-masing pihak berhak mengurus, menguasai, menikmati hasil, dan melakukan perbuatan hukum apa pun atas harta miliknya sendiri tanpa memerlukan persetujuan atau bantuan pihak lainnya." },
    ...pasal(5, "Biaya Rumah Tangga"),
    { t: "p", text: `Biaya rumah tangga, pemeliharaan dan pendidikan anak-anak ${str(d.biaya) || BIAYA_OPTS[0]}.` },
    ...pasal(6, "Pemakaian Bersama"),
    { t: "p", text: "Barang-barang yang dipergunakan bersama dalam rumah tangga yang tidak dapat dibuktikan kepemilikannya oleh salah satu pihak dianggap milik Para Pihak masing-masing untuk satu per dua (1/2) bagian." }
  );
  return blocks;
}

export const praNikah: DeedTemplate = {
  key: "pra_nikah",
  title: "Akta Perjanjian Pra Nikah",
  description: "Perjanjian perkawinan pemisahan harta sebelum perkawinan dilangsungkan.",
  sections: [
    {
      title: "Calon Suami & Calon Istri (penghadap)",
      fields: [
        { kind: "person", key: "calonSuami", label: "Calon suami" },
        { kind: "person", key: "calonIstri", label: "Calon istri" }
      ]
    },
    {
      title: "Rencana Perkawinan & Harta",
      fields: [
        { kind: "date", key: "tanggalNikah", label: "Rencana tanggal perkawinan" },
        { kind: "text", key: "tempatNikah", label: "Tempat pencatatan perkawinan", placeholder: "Kantor Urusan Agama Kecamatan Bogor Tengah", wide: true },
        { kind: "textarea", key: "hartaSuami", label: "Harta bawaan calon suami (satu per baris, opsional)", wide: true },
        { kind: "textarea", key: "hartaIstri", label: "Harta bawaan calon istri (satu per baris, opsional)", wide: true },
        { kind: "select", key: "biaya", label: "Biaya rumah tangga", options: BIAYA_OPTS, default: BIAYA_OPTS[0] }
      ]
    }
  ],
  signers: (d) => [person(d.calonSuami), person(d.calonIstri)],
  prefill: (ctx) => ({ calonSuami: { ...personFromClient(ctx.client), sapaan: "Tuan" } }),
  notes: () => [
    "Perjanjian perkawinan wajib disahkan/dicatat oleh pegawai pencatat perkawinan (KUA/Dukcapil) agar berlaku terhadap pihak ketiga (Pasal 29 UU No. 1 Tahun 1974)."
  ],
  build(d, variant) {
    const s: Person = person(d.calonSuami);
    const i: Person = person(d.calonIstri);
    return [
      judul("PERJANJIAN PERKAWINAN", d),
      ...pembuka(d),
      ...daftarPenghadap([
        { p: s, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" },
        { p: i, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }
      ]),
      dikenal(2),
      {
        t: "p",
        text: `Para penghadap menerangkan bahwa mereka akan melangsungkan perkawinan pada tanggal ${tanggalHuruf(str(d.tanggalNikah))}, yang akan dicatat oleh ${str(d.tempatNikah) || "[...]"}.`
      },
      sebutan(s, i),
      { t: "p", text: "Para Pihak menerangkan bahwa sebelum perkawinan dilangsungkan, Para Pihak telah sepakat membuat perjanjian perkawinan dengan ketentuan-ketentuan sebagai berikut:" },
      ...pasalPemisahan(d, false),
      ...pasal(7, "Berlakunya Perjanjian"),
      ...ayat([
        "Perjanjian ini mulai berlaku sejak perkawinan dilangsungkan dan tidak dapat diubah selama perkawinan berlangsung, kecuali atas persetujuan Para Pihak dan perubahan tersebut tidak merugikan pihak ketiga.",
        "Para Pihak wajib mendaftarkan perjanjian ini kepada pegawai pencatat perkawinan pada saat atau sebelum perkawinan dilangsungkan."
      ]),
      ...pasal(8, "Domisili"),
      domisili(d, "Para Pihak"),
      ...penutup(d, variant)
    ];
  }
};

export const pascaNikah: DeedTemplate = {
  key: "pasca_nikah",
  title: "Akta Perjanjian Pasca Nikah",
  description: "Perjanjian perkawinan selama perkawinan (Putusan MK No. 69/PUU-XIII/2015).",
  sections: [
    {
      title: "Suami & Istri (penghadap)",
      fields: [
        { kind: "person", key: "suami", label: "Suami" },
        { kind: "person", key: "istri", label: "Istri" }
      ]
    },
    {
      title: "Data Perkawinan & Harta",
      fields: [
        { kind: "date", key: "tanggalNikah", label: "Tanggal perkawinan" },
        { kind: "text", key: "buktiNikah", label: "Bukti perkawinan", wide: true, placeholder: "Kutipan Akta Nikah Nomor 123/45/VI/2015 dari KUA Kecamatan Bogor Tengah" },
        { kind: "textarea", key: "hartaBersama", label: "Pembagian harta bersama yang sudah ada (satu per baris, opsional)", wide: true, placeholder: "Rumah di Jl. ... menjadi milik pihak istri" },
        { kind: "textarea", key: "hartaSuami", label: "Harta pihak suami (opsional)", wide: true },
        { kind: "textarea", key: "hartaIstri", label: "Harta pihak istri (opsional)", wide: true },
        { kind: "select", key: "biaya", label: "Biaya rumah tangga", options: BIAYA_OPTS, default: BIAYA_OPTS[0] }
      ]
    }
  ],
  signers: (d) => [person(d.suami), person(d.istri)],
  prefill: (ctx) => ({ suami: { ...personFromClient(ctx.client), sapaan: "Tuan" } }),
  notes: () => [
    "Perjanjian pasca nikah wajib dicatat pada KUA/Dukcapil, dan tidak boleh merugikan pihak ketiga (kreditur) atas harta bersama sebelum pencatatan.",
    "Periksa ada tidaknya utang/jaminan atas harta bersama sebelum pembagian."
  ],
  build(d, variant) {
    const s = person(d.suami);
    const i = person(d.istri);
    const bersama = lines(d.hartaBersama);
    const blocks: Block[] = [
      judul("PERJANJIAN PERKAWINAN", d),
      ...pembuka(d),
      ...daftarPenghadap([
        { p: s, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" },
        { p: i, peran: "menurut keterangannya dalam hal ini bertindak untuk diri sendiri" }
      ]),
      dikenal(2),
      { t: "p", text: "Para penghadap menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "a.",
        text: `bahwa para penghadap adalah suami istri yang sah, perkawinannya dilangsungkan pada tanggal ${tanggalHuruf(str(d.tanggalNikah))}, sebagaimana ternyata dari ${str(d.buktiNikah) || "[...]"};`
      },
      {
        t: "item",
        marker: "b.",
        text: "bahwa berdasarkan Pasal 29 Undang-Undang Nomor 1 Tahun 1974 tentang Perkawinan sebagaimana telah dimaknai oleh Putusan Mahkamah Konstitusi Nomor 69/PUU-XIII/2015, suami istri dapat membuat perjanjian perkawinan selama dalam ikatan perkawinan;"
      },
      {
        t: "item",
        marker: "c.",
        text: "bahwa para penghadap bermaksud membuat perjanjian perkawinan selama dalam ikatan perkawinan."
      },
      sebutan(s, i),
      { t: "p", text: "Sehubungan dengan hal-hal tersebut di atas, Para Pihak menerangkan dengan ini telah sepakat membuat perjanjian perkawinan dengan ketentuan-ketentuan sebagai berikut:" },
      ...pasalPemisahan(d, true)
    ];
    let n = 7;
    blocks.push(
      ...pasal(n++, "Harta Bersama yang Telah Ada"),
      bersama.length
        ? { t: "p", text: "Harta bersama yang diperoleh sejak perkawinan sampai dengan tanggal akta ini dibagi dan menjadi milik masing-masing pihak sebagai berikut:" }
        : { t: "p", text: "Harta bersama yang diperoleh sejak perkawinan sampai dengan tanggal akta ini tetap merupakan harta bersama Para Pihak, dan pembagiannya dilakukan menurut ketentuan hukum yang berlaku." },
      ...butir(bersama, 0)
    );
    blocks.push(
      ...pasal(n++, "Pihak Ketiga"),
      { t: "p", text: "Perjanjian ini tidak mengurangi hak pihak ketiga atas harta bersama yang timbul sebelum perjanjian ini dicatat, dan Para Pihak tetap bertanggung jawab atas kewajiban kepada pihak ketiga yang timbul sebelum pencatatan tersebut." },
      ...pasal(n++, "Pencatatan"),
      { t: "p", text: "Para Pihak wajib mencatatkan perjanjian ini pada pegawai pencatat perkawinan yang berwenang, dan perjanjian ini berlaku terhadap pihak ketiga sejak tanggal pencatatan tersebut." },
      ...pasal(n, "Domisili"),
      domisili(d, "Para Pihak"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
