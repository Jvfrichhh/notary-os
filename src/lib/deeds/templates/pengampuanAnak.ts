import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, dikenal, domisili, judul, list, pasal, pembuka, penutup, str } from "../common";
import { parties, partyList, peranDari } from "../parties";
import { tanggalHuruf } from "../words";

type Anak = { nama?: string; tempatLahir?: string; tanggalLahir?: string; nik?: string; aktaLahir?: string };

const HUBUNGAN = ["ibu kandung", "ayah kandung", "wali"];

/**
 * Akta Pernyataan Pengampuan Anak di Bawah Umur: orang tua yang masih hidup
 * (atau wali) menyatakan mewakili anak-anaknya yang belum dewasa untuk suatu
 * perbuatan hukum dan menjamin hasilnya dipakai untuk kepentingan anak.
 * Dalam undang-undang lembaga ini disebut kekuasaan orang tua / perwalian;
 * "pengampuan" adalah istilah yang lazim dipakai dalam praktik kantor.
 */
export const pengampuanAnak: DeedTemplate = {
  key: "pengampuan_anak",
  title: "Akta Pernyataan Pengampuan Anak di Bawah Umur",
  description: "Pernyataan orang tua/wali yang mewakili anak di bawah umur untuk suatu perbuatan hukum (mis. menjual tanah warisan).",
  sections: [
    {
      title: "Yang Menyatakan (Orang Tua / Wali)",
      fields: [
        partyList("pengampu", "Yang menyatakan", "Penghadap", 1, 2),
        { kind: "select", key: "hubungan", label: "Hubungan dengan anak", options: HUBUNGAN, default: HUBUNGAN[0] }
      ]
    },
    {
      title: "Orang Tua yang Telah Meninggal (bila ada)",
      description: "Kosongkan seluruhnya bila kedua orang tua masih hidup.",
      fields: [
        { kind: "text", key: "almNama", label: "Nama almarhum/almarhumah", wide: true, placeholder: "Tuan Ahmad Sanusi" },
        { kind: "date", key: "almTanggal", label: "Tanggal meninggal" },
        { kind: "text", key: "almTempat", label: "Tempat meninggal", placeholder: "Kota Bogor" },
        { kind: "text", key: "almAkta", label: "Bukti kematian", wide: true, placeholder: "Kutipan Akta Kematian Nomor ... tanggal ... dari Dinas Kependudukan dan Pencatatan Sipil Kota Bogor" }
      ]
    },
    {
      title: "Anak di Bawah Umur",
      fields: [
        {
          kind: "list",
          key: "anak",
          label: "Anak yang diwakili",
          itemLabel: "Anak",
          min: 1,
          max: 8,
          fields: [
            { kind: "text", key: "nama", label: "Nama lengkap", wide: true },
            { kind: "text", key: "tempatLahir", label: "Tempat lahir" },
            { kind: "date", key: "tanggalLahir", label: "Tanggal lahir" },
            { kind: "text", key: "nik", label: "NIK (bila ada)" },
            { kind: "text", key: "aktaLahir", label: "Kutipan Akta Kelahiran", wide: true, placeholder: "Nomor ... tanggal ... dari Dinas Kependudukan dan Pencatatan Sipil ..." }
          ]
        }
      ]
    },
    {
      title: "Keperluan",
      fields: [
        {
          kind: "textarea",
          key: "keperluan",
          label: "Perbuatan hukum yang akan dilakukan untuk anak",
          placeholder: "menjual sebidang tanah Hak Milik Nomor 123/Babakan seluas 120 m², terletak di Kelurahan Babakan, Kecamatan Bogor Tengah, Kota Bogor, yang sebagian merupakan hak bagian anak-anak tersebut sebagai ahli waris"
        },
        {
          kind: "text",
          key: "penetapan",
          label: "Penetapan pengadilan (bila ada)",
          wide: true,
          placeholder: "Penetapan Pengadilan Agama Bogor Nomor .../Pdt.P/2026/PA.Bgr tanggal ...",
          help: "Untuk menjual atau menjaminkan tanah milik anak, Kantor Pertanahan umumnya meminta penetapan pengadilan."
        },
        {
          kind: "textarea",
          key: "penggunaan",
          label: "Penggunaan hasil untuk anak (opsional)",
          placeholder: "disimpan dalam tabungan atas nama masing-masing anak pada Bank ... sampai anak tersebut dewasa"
        }
      ]
    }
  ],
  signers: (d) => parties(d.pengampu).map((x) => x.p),
  signerLabels: (d) => parties(d.pengampu).map(() => "Penghadap,"),
  subject: (d) => {
    const anak = list<Anak>(d.anak).map((a) => str(a.nama)).filter(Boolean);
    return `Pernyataan pengampuan anak di bawah umur${anak.length ? `: ${anak.join(", ")}` : ""}`;
  },
  prefill: (ctx) => ({ pengampu: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Istilah: dalam undang-undang, mewakili anak yang belum dewasa disebut kekuasaan orang tua atau perwalian; pengampuan (curatele) sebenarnya untuk orang dewasa yang tidak cakap. Judul akta mengikuti istilah praktik; sesuaikan bila Notaris menghendaki \"Pernyataan Perwalian\".",
    "Akta ini adalah pernyataan penghadap dan TIDAK menggantikan penetapan pengadilan. Untuk menjual, mengalihkan, atau menjaminkan barang tetap milik anak, mintakan penetapan pengadilan dan cantumkan di isian \"Penetapan pengadilan\" [VERIFIKASI: Pasal 48 UU Perkawinan dan persyaratan Kantor Pertanahan setempat].",
    "Periksa batas usia dewasa yang dipakai instansi tujuan (18 atau 21 tahun) terhadap tanggal lahir tiap anak [VERIFIKASI].",
    "Lekatkan pada minuta: fotokopi Kartu Keluarga, Akta Kelahiran tiap anak, Akta Kematian/Surat Keterangan Waris (bila salah satu orang tua meninggal), dan penetapan pengadilan (bila ada).",
    "Bila yang menyatakan adalah wali (bukan orang tua kandung), dasar pengangkatannya sebagai wali wajib berupa penetapan pengadilan."
  ],
  build(d, variant) {
    const pengampu = parties(d.pengampu);
    const pen = pengampu.map((x) => ({ p: x.p, peran: peranDari(x) }));
    const hubungan = str(d.hubungan) || HUBUNGAN[0];
    const anak = list<Anak>(d.anak);
    const banyak = anak.length > 1;
    const sebutAnak = banyak ? "anak-anak tersebut" : "anak tersebut";
    const alm = str(d.almNama);
    const keperluan = str(d.keperluan).replace(/[\s.;]+$/, "");
    const penetapan = str(d.penetapan).replace(/[\s.;]+$/, "");
    const penggunaan = str(d.penggunaan).replace(/[\s.;]+$/, "");

    let no = 0;
    const blocks: Block[] = [
      judul("PERNYATAAN PENGAMPUAN", d, "ANAK DI BAWAH UMUR"),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: `bahwa {PENGHADAP} adalah ${hubungan} dari ${banyak ? "anak-anak" : "anak"} yang belum dewasa (masih di bawah umur), yaitu:`
      },
      ...anak.map((a, i): Block => ({
        t: "item",
        marker: `${i + 1}.`,
        level: 1,
        text: `**${str(a.nama) || "[...]"}**, lahir di ${str(a.tempatLahir) || "[...]"} pada tanggal ${tanggalHuruf(str(a.tanggalLahir))}${str(a.nik) ? `, pemegang Nomor Induk Kependudukan ${str(a.nik)}` : ""}${str(a.aktaLahir) ? `, sebagaimana ternyata dari Kutipan Akta Kelahiran ${str(a.aktaLahir).replace(/[\s.;]+$/, "")}` : ""}${i === anak.length - 1 ? ";" : ";"}`
      })),
      ...(alm
        ? [{
            t: "item" as const,
            marker: "-",
            text: `bahwa ${hubungan === "ibu kandung" ? "ayah" : hubungan === "ayah kandung" ? "ibu" : "orang tua"} dari ${sebutAnak}, yaitu **${alm}**, telah meninggal dunia${str(d.almTempat) ? ` di ${str(d.almTempat)}` : ""} pada tanggal ${tanggalHuruf(str(d.almTanggal))}${str(d.almAkta) ? `, sebagaimana ternyata dari ${str(d.almAkta).replace(/[\s.;]+$/, "")}` : ""};`
          }]
        : []),
      {
        t: "item",
        marker: "-",
        text: `bahwa ${sebutAnak} belum dewasa dan karenanya menurut hukum belum cakap bertindak sendiri, sehingga dalam segala perbuatan hukum harus diwakili;`
      },
      ...(penetapan
        ? [{ t: "item" as const, marker: "-", text: `bahwa untuk keperluan tersebut di bawah ini telah diperoleh ${penetapan}, yang salinannya dilekatkan pada minuta akta ini;` }]
        : []),
      { t: "item", marker: "-", text: `bahwa ${sebutAnak} berkepentingan dalam perbuatan hukum yang akan diuraikan di bawah ini.` },
      {
        t: "p",
        text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} dengan ini menyatakan dengan sebenar-benarnya hal-hal sebagai berikut:"
      },
      ...pasal(++no),
      {
        t: "p",
        text: `{Penghadap} adalah orang yang menurut hukum menjalankan ${hubungan === "wali" ? "perwalian" : "kekuasaan orang tua"} atas, dan karenanya bertindak selaku pengampu serta wakil yang sah dari, ${sebutAnak}, baik di dalam maupun di luar Pengadilan, dan tidak ada orang lain yang berhak atau telah ditunjuk untuk mewakili ${sebutAnak}.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Dalam kedudukannya tersebut {PENGHADAP} akan bertindak untuk dan atas nama ${sebutAnak} untuk ${keperluan || "[...]"}, berikut melakukan segala tindakan yang diperlukan untuk itu, menghadap pejabat yang berwenang, serta membuat dan menandatangani akta-akta dan surat-surat yang diperlukan.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Segala hasil yang menjadi hak bagian ${sebutAnak} dari perbuatan hukum tersebut semata-mata akan dipergunakan untuk kepentingan ${sebutAnak}, yaitu untuk pemeliharaan, pendidikan, dan kesejahteraannya${penggunaan ? `, dan ${penggunaan}` : ""}; {PENGHADAP} tidak akan mempergunakannya untuk kepentingan lain yang merugikan ${sebutAnak}.`
      },
      ...pasal(++no),
      {
        t: "p",
        text: `{Penghadap} menjamin kebenaran segala keterangan dalam akta ini dan bertanggung jawab sepenuhnya atas segala akibatnya, termasuk terhadap tuntutan dari ${sebutAnak} setelah dewasa atau dari pihak lain siapa pun, dan dengan ini membebaskan Notaris, para saksi, serta pihak yang mengadakan perbuatan hukum dengan {PENGHADAP} berdasarkan akta ini dari segala tuntutan mengenai hal tersebut.`
      },
      ...pasal(++no),
      domisili(d, "{PENGHADAP}"),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
