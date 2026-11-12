import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, denganPasangan, dikenal, domisili, judul, pasal, pembuka, penutup, person, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, rupiah } from "../words";

const STATUS = [
  "tanah garapan di atas tanah yang dikuasai langsung oleh Negara",
  "tanah bekas hak milik adat yang belum bersertipikat",
  "tanah Negara bekas hak yang telah berakhir jangka waktunya"
];

/**
 * Akta Pengoperan dan Penyerahan Hak atas Tanah: untuk tanah yang BELUM
 * bersertipikat (garapan, bekas hak adat, tanah negara). Yang dioperkan
 * adalah penguasaan fisik dan segala hak/kepentingan atas tanah itu dengan
 * ganti rugi, agar penerima dapat memohon hak ke Kantor Pertanahan.
 */
export const pengoperanHak: DeedTemplate = {
  key: "pengoperan_hak",
  title: "Akta Pengoperan Hak atas Tanah",
  description: "Pengoperan dan penyerahan hak (oper alih) atas tanah yang belum bersertipikat, dengan ganti rugi.",
  sections: [
    {
      title: "Pihak Pertama (Yang Mengoperkan)",
      fields: [
        partyList("pihakPertama", "Pihak Pertama", "Pihak Pertama", 1, 4),
        { kind: "person", key: "pasangan", label: "Suami/istri Pihak Pertama (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    {
      title: "Pihak Kedua (Penerima Pengoperan)",
      fields: [partyList("pihakKedua", "Pihak Kedua", "Pihak Kedua", 1, 4)]
    },
    {
      title: "Tanah yang Dioperkan",
      fields: [
        { kind: "select", key: "statusTanah", label: "Status tanah", options: STATUS, default: STATUS[0], wide: true },
        { kind: "number", key: "luas", label: "Luas tanah (m²)" },
        { kind: "text", key: "sejak", label: "Dikuasai sejak tahun", placeholder: "1998" },
        { kind: "text", key: "letakJalan", label: "Jalan / blok / kampung", wide: true, placeholder: "Kampung Cibeureum RT 002 RW 005" },
        { kind: "text", key: "letakKelurahan", label: "Desa/Kelurahan" },
        { kind: "text", key: "letakKecamatan", label: "Kecamatan" },
        { kind: "text", key: "letakKota", label: "Kota/Kabupaten (lengkap)", placeholder: "Kabupaten Bogor" },
        { kind: "text", key: "letakProvinsi", label: "Provinsi", default: "Jawa Barat" },
        { kind: "text", key: "batasUtara", label: "Batas utara" },
        { kind: "text", key: "batasTimur", label: "Batas timur" },
        { kind: "text", key: "batasSelatan", label: "Batas selatan" },
        { kind: "text", key: "batasBarat", label: "Batas barat" },
        {
          kind: "textarea",
          key: "dasar",
          label: "Dasar penguasaan / bukti",
          placeholder: "Surat Keterangan Garapan Nomor ... tanggal ... yang dikeluarkan oleh Kepala Desa ... dan diketahui Camat ...; Surat Pernyataan Penguasaan Fisik Bidang Tanah tanggal ..."
        },
        { kind: "text", key: "diAtasnya", label: "Bangunan / tanaman di atasnya (opsional)", wide: true, placeholder: "sebuah bangunan rumah tinggal semi permanen dan tanaman keras" }
      ]
    },
    {
      title: "Ganti Rugi",
      fields: [
        { kind: "money", key: "gantiRugi", label: "Uang ganti rugi (Rp)" },
        {
          kind: "select",
          key: "pembayaran",
          label: "Pembayaran",
          options: ["Lunas, akta ini sebagai kwitansi", "Lunas sebelum akta ini, dengan kwitansi tersendiri"],
          default: "Lunas, akta ini sebagai kwitansi",
          wide: true
        }
      ]
    }
  ],
  signers: (d) => {
    const s = parties(d.pihakPertama).map((x) => x.p);
    if (str(person(d.pasangan).nama)) s.push(person(d.pasangan));
    return [...s, ...parties(d.pihakKedua).map((x) => x.p)];
  },
  signerLabels: (d) => {
    const n1 = parties(d.pihakPertama).length + (str(person(d.pasangan).nama) ? 1 : 0);
    return [...Array.from({ length: n1 }, () => "Pihak Pertama,"), ...parties(d.pihakKedua).map(() => "Pihak Kedua,")];
  },
  subject: (d) => `Pengoperan hak atas tanah seluas ${str(d.luas) || "[...]"} m² di ${str(d.letakKelurahan) || "[...]"}`,
  prefill: (ctx) => ({ pihakKedua: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Akta ini HANYA untuk tanah yang belum bersertipikat. Tanah yang sudah terdaftar (bersertipikat) wajib dialihkan dengan akta PPAT (Akta Jual Beli, Hibah, dan seterusnya).",
    "Akta ini tidak memindahkan hak atas tanah; yang dioperkan adalah penguasaan fisik dan hak/kepentingan (hak prioritas) untuk memohon hak. Pihak Kedua tetap harus mengajukan permohonan hak ke Kantor Pertanahan.",
    "Sebelum tanda tangan periksa: surat keterangan riwayat tanah dan tidak sengketa dari Desa/Kelurahan, surat pernyataan penguasaan fisik, bukti PBB, dan pastikan tanah bukan kawasan hutan, aset pemerintah, sempadan, atau tanah yang sedang diperkarakan. Lekatkan fotokopinya pada minuta.",
    "Kuasa dalam akta ini diberikan dalam rangka pengoperan hak. Cermati larangan kuasa mutlak yang pada hakikatnya memindahkan hak atas tanah [VERIFIKASI: Instruksi Mendagri Nomor 14 Tahun 1982 dan PP 24/1997 Pasal 39].",
    "Pajak (PPh pengalihan dan BPHTB) dapat terutang atas pengoperan ini atau pada saat pendaftaran hak; pastikan ke kantor pajak dan Bapenda setempat sebelum penandatanganan [VERIFIKASI]."
  ],
  build(d, variant) {
    const p1 = parties(d.pihakPertama);
    const p2 = parties(d.pihakKedua);
    const pasangan = person(d.pasangan);
    const ada = !!str(pasangan.nama);
    const pen = [
      ...denganPasangan(p1.map((x) => x.p), pasangan, "").map((x, i) => (i < p1.length ? { ...x, peran: peranDari(p1[i]) } : x)),
      ...p2.map((x) => ({ p: x.p, peran: peranDari(x) }))
    ];
    const n1 = p1.length + (ada ? 1 : 0);
    const luas = Number(str(d.luas));
    const status = str(d.statusTanah) || STATUS[0];
    const letak = [
      str(d.letakJalan),
      `Desa/Kelurahan ${str(d.letakKelurahan) || "[...]"}`,
      `Kecamatan ${str(d.letakKecamatan) || "[...]"}`,
      str(d.letakKota) || "[...]",
      `Provinsi ${str(d.letakProvinsi) || "[...]"}`
    ].filter(Boolean).join(", ");
    const dasar = str(d.dasar).replace(/[\s.;]+$/, "");
    const diAtasnya = str(d.diAtasnya).replace(/[\s.;]+$/, "");
    const ganti = rupiah(str(d.gantiRugi));
    const kwitansi = !str(d.pembayaran) || str(d.pembayaran).startsWith("Lunas, akta ini");

    let no = 0;
    const blocks: Block[] = [
      judul("PENGOPERAN DAN PENYERAHAN HAK", d, "ATAS TANAH"),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, p1.length)} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(n1 + 1, p2.length)} untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: `bahwa Pihak Pertama${str(d.sejak) ? ` sejak tahun ${str(d.sejak)}` : ""} menguasai secara fisik, terus-menerus, dan dengan iktikad baik sebidang ${status}, seluas kurang lebih ${Number.isFinite(luas) && luas > 0 ? angka(luas) : "[...]"} meter persegi, terletak di ${letak}, dengan batas-batas:`
      },
      { t: "item", marker: "-", level: 1, text: `sebelah utara: ${str(d.batasUtara) || "[...]"};` },
      { t: "item", marker: "-", level: 1, text: `sebelah timur: ${str(d.batasTimur) || "[...]"};` },
      { t: "item", marker: "-", level: 1, text: `sebelah selatan: ${str(d.batasSelatan) || "[...]"};` },
      { t: "item", marker: "-", level: 1, text: `sebelah barat: ${str(d.batasBarat) || "[...]"};` },
      {
        t: "p",
        text: `${diAtasnya ? `berikut ${diAtasnya} yang berdiri dan tumbuh di atasnya, ` : ""}untuk selanjutnya disebut **TANAH**;`
      },
      ...(dasar ? [{ t: "item" as const, marker: "-", text: `bahwa penguasaan Pihak Pertama atas Tanah tersebut ternyata dari ${dasar};` }] : []),
      {
        t: "item",
        marker: "-",
        text: "bahwa Tanah tersebut belum terdaftar (belum bersertipikat) pada Kantor Pertanahan;"
      },
      {
        t: "item",
        marker: "-",
        text: "bahwa Pihak Pertama bermaksud mengoperkan dan menyerahkan segala hak dan kepentingannya atas Tanah tersebut kepada Pihak Kedua, dan Pihak Kedua bermaksud menerima pengoperan dan penyerahan tersebut, dengan memberikan ganti rugi kepada Pihak Pertama."
      },
      {
        t: "p",
        text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan telah saling setuju untuk mengadakan pengoperan dan penyerahan hak ini dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:"
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pihak Pertama dengan ini mengoperkan dan menyerahkan kepada Pihak Kedua, yang dengan ini menerima pengoperan dan penyerahan dari Pihak Pertama, segala hak, kepentingan, dan penguasaan yang dimiliki atau dapat dijalankan oleh Pihak Pertama atas Tanah tersebut, berikut segala sesuatu yang berdiri, tertanam, dan tumbuh di atasnya, tanpa ada yang dikecualikan."
      },
      ...pasal(++no),
      {
        t: "p",
        text: kwitansi
          ? `Pengoperan dan penyerahan hak ini dilakukan dengan ganti rugi sebesar ${ganti}, jumlah uang mana telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama, dan untuk penerimaan jumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaannya atau kwitansinya yang sah.`
          : `Pengoperan dan penyerahan hak ini dilakukan dengan ganti rugi sebesar ${ganti}, jumlah uang mana telah dibayar lunas oleh Pihak Kedua kepada Pihak Pertama sebelum penandatanganan akta ini dengan kwitansi tersendiri.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Tanah tersebut diserahkan oleh Pihak Pertama kepada Pihak Kedua dalam keadaan kosong dan nyata pada hari ini. Mulai hari ini segala keuntungan yang didapat dari, dan segala kerugian serta beban atas, Tanah tersebut menjadi hak dan tanggungan Pihak Kedua; segala pajak dan pungutan sampai dengan hari ini tetap menjadi tanggungan Pihak Pertama."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pihak Pertama menjamin Pihak Kedua bahwa Pihak Pertama adalah satu-satunya pihak yang berhak atas Tanah tersebut; bahwa Tanah tersebut tidak dalam sengketa, tidak dikenakan sitaan, tidak dijaminkan dengan cara apa pun, dan belum pernah dioperkan atau dijanjikan untuk dioperkan kepada pihak lain; dan bahwa Pihak Kedua tidak akan mendapat gangguan atau tuntutan dari pihak lain mengenai hal itu. Oleh karena itu Pihak Pertama membebaskan Pihak Kedua dari segala tuntutan mengenai hal-hal tersebut."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pihak Kedua berhak mengajukan permohonan hak atas Tanah tersebut kepada instansi yang berwenang atas nama Pihak Kedua sendiri atau pihak lain yang ditunjuknya, dan Pihak Pertama wajib memberikan segala keterangan serta menandatangani segala surat yang diperlukan untuk itu setiap kali diminta oleh Pihak Kedua."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Untuk keperluan tersebut Pihak Pertama dengan ini memberi kuasa kepada Pihak Kedua, kuasa mana merupakan bagian yang tidak terpisahkan dari akta ini dan tidak akan berakhir karena sebab-sebab yang termaktub dalam Pasal 1813 Kitab Undang-Undang Hukum Perdata, untuk mewakili Pihak Pertama mengurus permohonan hak dan pendaftaran Tanah tersebut, menghadap pejabat yang berwenang, memberikan keterangan, serta membuat dan menandatangani segala surat yang diperlukan."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pajak yang terutang karena pengoperan dan penyerahan hak ini ditanggung oleh masing-masing pihak sesuai ketentuan peraturan perundang-undangan; biaya akta ini serta biaya permohonan hak dan pendaftaran Tanah tersebut ditanggung dan dibayar oleh Pihak Kedua."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pengoperan dan penyerahan hak ini tidak berakhir karena salah satu pihak meninggal dunia, tetapi berlaku turun-temurun dan harus dipenuhi oleh para ahli waris atau penerima hak dari masing-masing pihak."
      },
      ...pasal(++no),
      domisili(d),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
