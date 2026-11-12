import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { Person, SectionDef } from "../schema";
import { daftarPenghadap, dikenal, domisili, judul, komparisi, list, namaTebal, pasal, pembuka, penutup, person, str } from "../common";
import { angka, rupiah, tanggalHuruf } from "../words";

/**
 * Akta perubahan badan non-PT:
 * - Yayasan & Perkumpulan: Pernyataan Keputusan Rapat (satu penghadap selaku kuasa rapat);
 * - CV: Masuk dan Keluar sebagai Pesero serta Perubahan Anggaran Dasar (semua sekutu menghadap).
 */

type Organ = { jabatan?: string; orang?: Person };
type Kbli = { kode?: string; judul?: string };
type SekutuCv = { orang?: Person; sebagai?: string; setoran?: string; kepada?: string };

const num = (v: unknown) => Number(str(v).replace(/[^\d]/g, "")) || 0;
const bersih = (v: unknown) => str(v).replace(/[\s.;,]+$/, "");
const URUT = ["PERTAMA", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM", "KETUJUH", "KEDELAPAN", "KESEMBILAN", "KESEPULUH"];
const gabung = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} dan ${a[a.length - 1]}`);
const DASAR_KUASA = "selaku kuasa berdasarkan keputusan rapat tersebut di bawah ini";

/* ------------------------------------------------------------------ */
/* Yayasan & Perkumpulan                                               */
/* ------------------------------------------------------------------ */

type Jenis = {
  key: string;
  badan: "Yayasan" | "Perkumpulan";
  rapat: string[];
  organRapat: string;
  jabatan: string[];
  pesertaLabel: string;
};

const YAYASAN: Jenis = {
  key: "perubahan_yayasan",
  badan: "Yayasan",
  rapat: ["Rapat Pembina", "Keputusan Pembina di luar rapat (sirkuler)"],
  organRapat: "Pembina",
  jabatan: ["Ketua Pembina", "Anggota Pembina", "Ketua Pengurus", "Sekretaris", "Bendahara", "Anggota Pengurus", "Ketua Pengawas", "Anggota Pengawas"],
  pesertaLabel: "anggota Pembina"
};
const PERKUMPULAN: Jenis = {
  key: "perubahan_perkumpulan",
  badan: "Perkumpulan",
  rapat: ["Rapat Umum Anggota", "Rapat Umum Anggota Luar Biasa"],
  organRapat: "Rapat Umum Anggota",
  jabatan: ["Ketua", "Wakil Ketua", "Sekretaris", "Bendahara", "Anggota Pengurus", "Ketua Pengawas", "Anggota Pengawas"],
  pesertaLabel: "anggota"
};

function sectionsRapat(j: Jenis): SectionDef[] {
  const yys = j.badan === "Yayasan";
  return [
    {
      title: "Penghadap (Kuasa Rapat)",
      fields: [
        { kind: "person", key: "penghadap", label: "Penghadap" },
        { kind: "text", key: "dasarKuasa", label: "Dasar kuasa", wide: true, default: DASAR_KUASA }
      ]
    },
    {
      title: `Data ${j.badan}`,
      fields: [
        { kind: "text", key: "nama", label: `Nama ${j.badan} (tanpa kata '${j.badan}')`, placeholder: "DAULATMAN NUSANTARA ABADI" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "textarea", key: "aktaPendirian", label: "Akta pendirian", placeholder: "akta Nomor 06 tanggal 27 Agustus 2026, yang dibuat di hadapan Ari Yudani Aprianti, Sarjana Hukum, Magister Kenotariatan, Notaris di Kota Bogor" },
        { kind: "text", key: "skPengesahan", label: "Pengesahan badan hukum", wide: true, placeholder: "Keputusan Menteri Hukum Republik Indonesia Nomor AHU-....AH.01.0..TAHUN 2026 tanggal ..." },
        { kind: "textarea", key: "perubahanTerakhir", label: "Perubahan anggaran dasar/data terakhir (kosongkan bila belum pernah)", placeholder: "akta Nomor ... tanggal ..., dibuat di hadapan ..., yang telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum sesuai surat Nomor ... tanggal ..." }
      ]
    },
    {
      title: "Rapat",
      fields: [
        { kind: "select", key: "jenisRapat", label: "Bentuk keputusan", options: j.rapat, default: j.rapat[0], wide: true },
        { kind: "date", key: "tanggalRapat", label: "Tanggal rapat/keputusan" },
        { kind: "text", key: "tempatRapat", label: "Tempat rapat", placeholder: "kantor Yayasan, Jalan ..." },
        { kind: "text", key: "pimpinanRapat", label: "Pimpinan rapat", placeholder: "Tuan ..., selaku Ketua Pembina" },
        { kind: "number", key: "hadir", label: `Jumlah ${j.pesertaLabel} yang hadir/diwakili` },
        { kind: "number", key: "total", label: `Jumlah seluruh ${j.pesertaLabel}` }
      ]
    },
    {
      title: "Keputusan",
      description: "Isi hanya bagian yang diputuskan; bagian yang kosong tidak dimuat dalam akta.",
      fields: [
        { kind: "text", key: "namaBaru", label: `Nama ${j.badan} yang baru`, placeholder: "kosongkan bila nama tidak berubah" },
        { kind: "text", key: "kedudukanBaru", label: "Tempat kedudukan yang baru", placeholder: "kosongkan bila tidak berubah" },
        { kind: "text", key: "alamatBaru", label: "Alamat lengkap yang baru", wide: true, placeholder: "kosongkan bila tidak berubah" },
        {
          kind: "textarea",
          key: "kegiatanBaru",
          label: yys ? "Kegiatan Yayasan yang baru (satu per baris)" : "Maksud, tujuan, dan kegiatan yang baru (satu per baris)",
          help: yys ? "Maksud dan tujuan Yayasan tidak dapat diubah; yang dapat diubah adalah kegiatannya." : undefined
        },
        {
          kind: "list",
          key: "organBaru",
          label: yys ? "Susunan Pembina, Pengurus, dan Pengawas yang baru" : "Susunan Pengurus dan Pengawas yang baru",
          itemLabel: "Anggota organ",
          min: 0,
          max: 20,
          fields: [
            { kind: "select", key: "jabatan", label: "Jabatan", options: j.jabatan, default: j.jabatan[0] },
            { kind: "person", key: "orang", label: "Identitas" }
          ],
          help: "Tulis susunan LENGKAP setelah perubahan, termasuk yang tidak berganti."
        },
        { kind: "text", key: "masaJabatan", label: "Masa jabatan organ yang diangkat", wide: true, placeholder: "5 (lima) tahun terhitung sejak tanggal keputusan ini" },
        {
          kind: "textarea",
          key: "perubahanLain",
          label: "Perubahan anggaran dasar lainnya",
          placeholder: "Pasal 14 ayat (1) menjadi berbunyi: \"...\""
        }
      ]
    }
  ];
}

function buatPerubahanRapat(j: Jenis): DeedTemplate {
  const yys = j.badan === "Yayasan";
  return {
    key: j.key,
    title: `Akta Pernyataan Keputusan Rapat (Perubahan ${j.badan})`,
    description: `Pernyataan keputusan ${j.rapat[0]}: nama, kedudukan, kegiatan, susunan organ, dan perubahan anggaran dasar ${j.badan} lainnya.`,
    sections: sectionsRapat(j),
    signers: (d) => [person(d.penghadap)],
    subject: (d) => `Perubahan ${j.badan} ${(str(d.nama) || "[...]").toUpperCase()}`,
    prefill: (ctx) => ({ penghadap: personFromClient(ctx.client), nama: ctx.client.companyName ?? "" }),
    notes: (d) => {
      const n: string[] = [];
      if (yys) {
        n.push("Perubahan nama dan kegiatan Yayasan memerlukan PERSETUJUAN Menteri; perubahan anggaran dasar lainnya dan perubahan data (susunan organ, alamat) cukup DIBERITAHUKAN [VERIFIKASI: Pasal 21 UU Yayasan dan PP 63/2008 jo. PP 2/2013].");
        n.push("Maksud dan tujuan Yayasan tidak dapat diubah (Pasal 17 UU Yayasan) [VERIFIKASI].");
        n.push("Kuorum Rapat Pembina untuk perubahan anggaran dasar: dihadiri paling sedikit 2/3 jumlah anggota Pembina [VERIFIKASI: Pasal 18 UU Yayasan dan anggaran dasar].");
        n.push("Pembina tidak boleh merangkap Pengurus atau Pengawas; Pengurus tidak boleh merangkap Pembina atau Pengawas.");
      } else {
        n.push("Perubahan anggaran dasar Perkumpulan berbadan hukum diajukan persetujuan/pemberitahuannya kepada Menteri melalui AHU Online [VERIFIKASI: Permenkumham 3/2016 jo. perubahannya].");
        n.push("Kuorum dan tata cara pengambilan keputusan mengikuti anggaran dasar Perkumpulan; cocokkan dengan daftar hadir.");
      }
      if (!str(d.tanggalRapat)) n.push("Tanggal rapat/keputusan belum diisi.");
      if (num(d.hadir) && num(d.total) && num(d.hadir) > num(d.total)) n.push("Jumlah yang hadir melebihi jumlah seluruh anggota — periksa isian rapat.");
      n.push("Lekatkan risalah/berita acara rapat, daftar hadir, dan surat kuasa (bila ada) pada minuta.");
      n.push("Template ini rumusan umum (belum dari contoh akta kantor); sesuaikan dengan anggaran dasar yang berlaku.");
      return n;
    },
    build(d, variant) {
      const p = person(d.penghadap);
      const nama = `${j.badan.toUpperCase()} ${(str(d.nama) || "[...]").toUpperCase()}`;
      const sirkuler = str(d.jenisRapat).includes("di luar rapat");
      const rapat = sirkuler ? j.rapat[0] : str(d.jenisRapat) || j.rapat[0];
      const organ = list<Organ>(d.organBaru);
      const kegiatan = str(d.kegiatanBaru).split("\n").map((x) => bersih(x)).filter(Boolean);
      const hadir = num(d.hadir);
      const total = num(d.total);
      const keputusan: Block[][] = [];

      if (str(d.namaBaru) || str(d.kedudukanBaru)) {
        const namaAkhir = `${j.badan.toUpperCase()} ${(str(d.namaBaru) || str(d.nama) || "[...]").toUpperCase()}`;
        const apa = [str(d.namaBaru) ? "nama" : "", str(d.kedudukanBaru) ? "tempat kedudukan" : ""].filter(Boolean).join(" dan ");
        keputusan.push([
          { t: "p", text: `Mengubah ${apa} ${j.badan}, sehingga Pasal 1 ayat (1) anggaran dasar ${j.badan} menjadi berbunyi sebagai berikut:` },
          { t: "item", marker: "1.", text: `${j.badan} ini bernama **${namaAkhir}** (selanjutnya dalam anggaran dasar ini cukup disingkat dengan "${j.badan}"), berkedudukan di ${str(d.kedudukanBaru) || str(d.kedudukan) || "[...]"}.` }
        ]);
      }
      if (str(d.alamatBaru))
        keputusan.push([{ t: "p", text: `Menyetujui perubahan alamat lengkap ${j.badan}, sehingga untuk selanjutnya ${j.badan} beralamat di ${bersih(d.alamatBaru)}.` }]);
      if (kegiatan.length)
        keputusan.push([
          {
            t: "p",
            text: yys
              ? "Mengubah ketentuan mengenai kegiatan Yayasan, sehingga untuk mencapai maksud dan tujuannya Yayasan menjalankan kegiatan sebagai berikut:"
              : "Mengubah ketentuan mengenai maksud dan tujuan serta kegiatan Perkumpulan, sehingga menjadi sebagai berikut:"
          },
          ...kegiatan.map((k, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: `${k}${i === kegiatan.length - 1 ? "." : ";"}` }))
        ]);
      if (organ.length) {
        const sebut = yys ? "Pembina, Pengurus, dan Pengawas" : "Pengurus dan Pengawas";
        keputusan.push([
          { t: "p", text: `Memberhentikan dengan hormat anggota ${sebut} ${j.badan} yang lama, dengan ucapan terima kasih atas jasa-jasanya, dan mengangkat anggota ${sebut} ${j.badan}, sehingga susunannya menjadi sebagai berikut:` },
          ...organ.map((x, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: `${str(x.jabatan) || "[...]"}: ${komparisi(person(x.orang), i === organ.length - 1 ? "." : ";")}` })),
          { t: "p", text: `Pengangkatan tersebut berlaku untuk masa jabatan ${bersih(d.masaJabatan) || `sesuai ketentuan anggaran dasar ${j.badan}, terhitung sejak tanggal keputusan ini`}, dan mereka yang diangkat telah menyatakan menerima pengangkatannya.` }
        ]);
      }
      if (str(d.perubahanLain))
        keputusan.push([
          { t: "p", text: `Mengubah ketentuan anggaran dasar ${j.badan} sebagai berikut:` },
          ...str(d.perubahanLain).split("\n").map((x) => bersih(x)).filter(Boolean).map((x) => ({ t: "item" as const, marker: "-", text: `${x};` })),
          { t: "p", text: `Ketentuan anggaran dasar ${j.badan} selebihnya yang tidak diubah tetap berlaku.` }
        ]);
      if (keputusan.length === 0) keputusan.push([{ t: "p", text: "[...]" }]);

      const dasarKuasa = !str(d.dasarKuasa) || str(d.dasarKuasa) === DASAR_KUASA ? (sirkuler ? `selaku kuasa berdasarkan keputusan ${j.organRapat} tersebut di bawah ini` : DASAR_KUASA) : str(d.dasarKuasa);
      const kehadiran = `${hadir ? angka(hadir) : "[...]"} orang dari ${total ? angka(total) : "[...]"} orang ${j.pesertaLabel}`;

      const blocks: Block[] = [
        judul(`PERNYATAAN KEPUTUSAN ${sirkuler ? j.organRapat.toUpperCase() : rapat.toUpperCase()}`, d, nama),
        ...pembuka(d),
        ...daftarPenghadap([{ p, peran: `menurut keterangannya dalam hal ini bertindak ${dasarKuasa}` }]),
        dikenal(1),
        { t: "p", text: "Penghadap dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
        {
          t: "item",
          marker: "a.",
          text: `bahwa penghadap bertindak untuk dan atas nama **${nama}**, berkedudukan di ${str(d.kedudukan) || "[...]"}, yang anggaran dasarnya dimuat dalam ${bersih(d.aktaPendirian) || "[...]"}${str(d.skPengesahan) ? `, dan telah memperoleh pengesahan badan hukum berdasarkan ${bersih(d.skPengesahan)}` : ""}${str(d.perubahanTerakhir) ? `, terakhir diubah dengan ${bersih(d.perubahanTerakhir)}` : ""}; untuk selanjutnya disebut "${j.badan}";`
        },
        {
          t: "item",
          marker: "b.",
          text: sirkuler
            ? `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} seluruh ${j.pesertaLabel} ${j.badan}, yaitu ${kehadiran}, telah mengambil keputusan di luar rapat secara tertulis yang ditandatangani oleh seluruh ${j.pesertaLabel};`
            : `bahwa pada tanggal ${tanggalHuruf(str(d.tanggalRapat))} bertempat di ${str(d.tempatRapat) || "[...]"} telah diadakan ${rapat} ${j.badan}, yang dipimpin oleh ${str(d.pimpinanRapat) || "[...]"}, dan dihadiri atau diwakili oleh ${kehadiran}, sebagaimana ternyata dari daftar hadir rapat, sehingga kuorum yang disyaratkan anggaran dasar ${j.badan} telah terpenuhi dan rapat berhak mengambil keputusan yang sah dan mengikat;`
        },
        {
          t: "item",
          marker: "c.",
          text: sirkuler
            ? "bahwa keputusan tersebut dibuat di bawah tangan dan dilekatkan pada minuta akta ini;"
            : "bahwa risalah rapat tersebut dibuat di bawah tangan dan bersama daftar hadir rapat dilekatkan pada minuta akta ini;"
        },
        { t: "item", marker: "d.", text: `bahwa penghadap diberi kuasa untuk menyatakan keputusan ${sirkuler ? "tersebut" : "rapat tersebut"} dalam akta notaris.` },
        { t: "p", text: "Selanjutnya penghadap dengan bertindak sebagaimana tersebut di atas menyatakan keputusan-keputusan sebagai berikut:" }
      ];
      keputusan.forEach((k, i) => blocks.push({ t: "center", text: `KEPUTUSAN ${URUT[i] ?? i + 1}`, bold: true }, ...k));
      blocks.push(
        { t: "center", text: `KEPUTUSAN ${URUT[keputusan.length] ?? keputusan.length + 1}`, bold: true },
        {
          t: "p",
          text: `Memberi kuasa kepada penghadap, ${namaTebal(p)}, dan/atau Pengurus ${j.badan}, dengan hak substitusi, untuk menyatakan keputusan-keputusan tersebut dalam akta notaris, memohon persetujuan dan/atau menyampaikan pemberitahuan perubahan anggaran dasar dan/atau perubahan data ${j.badan} kepada Menteri Hukum Republik Indonesia melalui Sistem Administrasi Badan Hukum, serta melakukan segala tindakan yang diperlukan untuk maksud tersebut.`
        },
        domisili(d, "penghadap"),
        ...penutup(d, variant)
      );
      return blocks;
    }
  };
}

export const perubahanYayasan = buatPerubahanRapat(YAYASAN);
export const perubahanPerkumpulan = buatPerubahanRapat(PERKUMPULAN);

/* ------------------------------------------------------------------ */
/* CV                                                                  */
/* ------------------------------------------------------------------ */

const SEBAGAI = ["Sekutu Komplementer (Direktur)", "Sekutu Komplementer", "Sekutu Komanditer"];

export const perubahanCv: DeedTemplate = {
  key: "perubahan_cv",
  title: "Akta Perubahan CV (Masuk-Keluar Pesero & Perubahan Anggaran Dasar)",
  description: "Masuk dan keluarnya sekutu serta perubahan nama, kedudukan, kegiatan usaha, modal, atau ketentuan lain CV.",
  sections: [
    {
      title: "Data Persekutuan",
      fields: [
        { kind: "text", key: "namaCv", label: "Nama persekutuan (tanpa 'CV')", placeholder: "SINAR MAJU SEJAHTERA" },
        { kind: "text", key: "kedudukan", label: "Tempat kedudukan (Kota/Kabupaten)", default: "Kota Bogor" },
        { kind: "textarea", key: "aktaPendirian", label: "Akta pendirian", placeholder: "akta Nomor 12 tanggal 5 Maret 2020, yang dibuat di hadapan ..., Sarjana Hukum, Notaris di ..." },
        { kind: "text", key: "pendaftaran", label: "Pendaftaran di AHU (SABU)", wide: true, placeholder: "Surat Keterangan Terdaftar Nomor AHU-....AH.01.14 Tahun 2020 tanggal ..." },
        { kind: "textarea", key: "perubahanTerakhir", label: "Perubahan terakhir (kosongkan bila belum pernah)", placeholder: "akta Nomor ... tanggal ..., dibuat di hadapan ..." }
      ]
    },
    {
      title: "Sekutu yang Tetap",
      description: "Sekutu lama yang tetap menjadi sekutu setelah perubahan (ikut menghadap).",
      fields: [
        {
          kind: "list",
          key: "tetap",
          label: "Sekutu yang tetap",
          itemLabel: "Sekutu",
          min: 0,
          max: 10,
          fields: [
            { kind: "person", key: "orang", label: "Identitas" },
            { kind: "select", key: "sebagai", label: "Kedudukan setelah perubahan", options: SEBAGAI, default: SEBAGAI[0] },
            { kind: "money", key: "setoran", label: "Pemasukan modal setelah perubahan (Rp; opsional)" }
          ]
        }
      ]
    },
    {
      title: "Sekutu yang Keluar",
      fields: [
        {
          kind: "list",
          key: "keluar",
          label: "Sekutu yang keluar",
          itemLabel: "Sekutu keluar",
          min: 0,
          max: 10,
          fields: [
            { kind: "person", key: "orang", label: "Identitas" },
            { kind: "select", key: "sebagai", label: "Kedudukan semula", options: SEBAGAI, default: SEBAGAI[2] },
            { kind: "text", key: "kepada", label: "Bagiannya diserahkan kepada", wide: true, placeholder: "Tuan ... (sekutu yang masuk) / para sekutu yang tetap" }
          ]
        }
      ]
    },
    {
      title: "Sekutu yang Masuk",
      fields: [
        {
          kind: "list",
          key: "masuk",
          label: "Sekutu yang masuk",
          itemLabel: "Sekutu masuk",
          min: 0,
          max: 10,
          fields: [
            { kind: "person", key: "orang", label: "Identitas" },
            { kind: "select", key: "sebagai", label: "Masuk sebagai", options: SEBAGAI, default: SEBAGAI[2] },
            { kind: "money", key: "setoran", label: "Pemasukan modal (Rp; opsional)" }
          ]
        }
      ]
    },
    {
      title: "Perubahan Anggaran Dasar",
      description: "Isi hanya yang berubah; bagian yang kosong tidak dimuat dalam akta.",
      fields: [
        { kind: "text", key: "namaBaru", label: "Nama CV yang baru (tanpa 'CV')" },
        { kind: "text", key: "kedudukanBaru", label: "Tempat kedudukan yang baru" },
        { kind: "text", key: "alamatBaru", label: "Alamat kantor yang baru", wide: true },
        { kind: "text", key: "bidangBaru", label: "Ringkasan bidang usaha yang baru", wide: true, placeholder: "Perdagangan Umum, Jasa, dan Konstruksi" },
        {
          kind: "list",
          key: "kbliBaru",
          label: "Kegiatan usaha yang baru (KBLI; tulis lengkap setelah perubahan)",
          itemLabel: "KBLI",
          min: 0,
          max: 30,
          fields: [
            { kind: "text", key: "kode", label: "Kode", placeholder: "46900" },
            { kind: "text", key: "judul", label: "Judul KBLI", placeholder: "Perdagangan Besar Berbagai Macam Barang" }
          ]
        },
        { kind: "money", key: "modalBaru", label: "Modal persekutuan setelah perubahan (Rp)", help: "Kosongkan bila modal tidak berubah." },
        { kind: "textarea", key: "perubahanLain", label: "Perubahan ketentuan lainnya (satu per baris)", placeholder: "Pasal 7 ayat (2) menjadi berbunyi: \"...\"" }
      ]
    }
  ],
  signers: (d) => [...list<SekutuCv>(d.tetap), ...list<SekutuCv>(d.keluar), ...list<SekutuCv>(d.masuk)].map((x) => person(x.orang)),
  subject: (d) => `Perubahan CV ${(str(d.namaCv) || "[...]").toUpperCase()}`,
  prefill: (ctx) => ({ namaCv: ctx.client.companyName ?? "", tetap: [{ orang: personFromClient(ctx.client), sebagai: SEBAGAI[0], setoran: "" }] }),
  notes: (d) => {
    const tetap = list<SekutuCv>(d.tetap);
    const masuk = list<SekutuCv>(d.masuk);
    const akhir = [...tetap, ...masuk];
    const n: string[] = [];
    if (!akhir.some((s) => str(s.sebagai).startsWith("Sekutu Komplementer"))) n.push("Setelah perubahan tidak ada sekutu komplementer — CV wajib mempunyai paling sedikit satu sekutu komplementer (pengurus).");
    if (!akhir.some((s) => str(s.sebagai) === SEBAGAI[2])) n.push("Setelah perubahan tidak ada sekutu komanditer — CV wajib mempunyai paling sedikit satu sekutu komanditer.");
    n.push("Seluruh sekutu lama (yang tetap dan yang keluar) serta sekutu yang masuk harus hadir atau diwakili dengan kuasa yang sah; sekutu yang kawin perlu persetujuan pasangan bila mengalihkan bagiannya.");
    n.push("Perubahan didaftarkan melalui Sistem Administrasi Badan Usaha (AHU Online) paling lambat 30 hari sejak akta ditandatangani [VERIFIKASI: Permenkumham 17/2018].");
    n.push("Sekutu yang keluar tetap bertanggung jawab kepada pihak ketiga atas perikatan Persekutuan yang timbul sebelum ia keluar; pastikan hal itu dipahami para pihak.");
    n.push("Template ini rumusan umum (belum dari contoh akta kantor); sesuaikan dengan anggaran dasar CV yang berlaku.");
    return n;
  },
  build(d, variant) {
    const tetap = list<SekutuCv>(d.tetap);
    const keluar = list<SekutuCv>(d.keluar);
    const masuk = list<SekutuCv>(d.masuk);
    const kbli = list<Kbli>(d.kbliBaru);
    const nama = `CV ${(str(d.namaCv) || "[...]").toUpperCase()}`;
    const namaAkhir = `CV ${(str(d.namaBaru) || str(d.namaCv) || "[...]").toUpperCase()}`;
    const sendiri = "menurut keterangannya dalam hal ini bertindak untuk diri sendiri";
    const semua = [...tetap, ...keluar, ...masuk];
    const pen = (semua.length ? semua : [{}]).map((x) => ({ p: person((x as SekutuCv).orang), peran: sendiri }));
    const akhir = [...tetap, ...masuk];
    const lain = str(d.perubahanLain).split("\n").map((x) => bersih(x)).filter(Boolean);

    let no = 0;
    const blocks: Block[] = [
      judul(keluar.length || masuk.length ? "MASUK DAN KELUAR SEBAGAI PESERO SERTA PERUBAHAN ANGGARAN DASAR" : "PERUBAHAN ANGGARAN DASAR", d, `PERSEKUTUAN KOMANDITER ${nama}`),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: `bahwa Persekutuan Komanditer **${nama}**, berkedudukan di ${str(d.kedudukan) || "[...]"}, didirikan dengan ${bersih(d.aktaPendirian) || "[...]"}${str(d.pendaftaran) ? `, dan telah terdaftar sebagaimana ternyata dari ${bersih(d.pendaftaran)}` : ""}${str(d.perubahanTerakhir) ? `, terakhir diubah dengan ${bersih(d.perubahanTerakhir)}` : ""}; untuk selanjutnya disebut "Persekutuan";`
      },
      {
        t: "item",
        marker: "-",
        text: `bahwa ${[...tetap, ...keluar].length ? gabung([...tetap, ...keluar].map((s) => namaTebal(person(s.orang)))) : "[...]"} adalah seluruh sekutu (pesero) dalam Persekutuan pada saat ini;`
      },
      { t: "item", marker: "-", text: "bahwa para sekutu tersebut telah sepakat untuk mengadakan perubahan dalam Persekutuan sebagaimana diuraikan di bawah ini." },
      { t: "p", text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan dengan ini mengadakan perubahan sebagai berikut:" }
    ];

    if (keluar.length) {
      blocks.push(...pasal(++no), { t: "p", text: "Terhitung sejak tanggal akta ini, keluar dari Persekutuan:" });
      keluar.forEach((s, i) =>
        blocks.push({
          t: "item",
          marker: `${i + 1}.`,
          text: `${namaTebal(person(s.orang))}, semula selaku ${str(s.sebagai) || SEBAGAI[2]}, yang menyerahkan seluruh bagian, hak, dan kepentingannya dalam Persekutuan kepada ${bersih(s.kepada) || "para sekutu lainnya"}${i === keluar.length - 1 ? "." : ";"}`
        })
      );
      blocks.push({
        t: "p",
        text: "Sekutu yang keluar tersebut menyatakan telah menerima segala sesuatu yang menjadi haknya dari Persekutuan dan tidak mempunyai tagihan apa pun lagi terhadap Persekutuan maupun para sekutu lainnya; sebaliknya para sekutu lainnya memberikan pembebasan dan pelunasan (acquit et decharge) kepada sekutu yang keluar atas tindakannya selama menjadi sekutu, sepanjang tindakan tersebut tercermin dalam pembukuan Persekutuan."
      });
    }
    if (masuk.length) {
      blocks.push(...pasal(++no), { t: "p", text: "Terhitung sejak tanggal akta ini, masuk ke dalam Persekutuan dan diterima oleh para sekutu lainnya:" });
      masuk.forEach((s, i) =>
        blocks.push({
          t: "item",
          marker: `${i + 1}.`,
          text: `${namaTebal(person(s.orang))}, selaku ${str(s.sebagai) || SEBAGAI[2]}${num(s.setoran) ? `, dengan pemasukan modal sebesar ${rupiah(num(s.setoran))}` : ""}${i === masuk.length - 1 ? "." : ";"}`
        })
      );
      blocks.push({ t: "p", text: "Sekutu yang masuk tersebut menyatakan telah mengetahui dan menerima keadaan Persekutuan, anggaran dasarnya, serta segala hak dan kewajiban Persekutuan." });
    }
    if (keluar.length || masuk.length || tetap.length) {
      blocks.push(...pasal(++no), { t: "p", text: "Dengan demikian, terhitung sejak tanggal akta ini susunan sekutu dalam Persekutuan menjadi sebagai berikut:" });
      (akhir.length ? akhir : [{}]).forEach((s: SekutuCv, i, arr) =>
        blocks.push({
          t: "item",
          marker: `${i + 1}.`,
          text: `${namaTebal(person(s.orang))}, selaku ${str(s.sebagai) || "[...]"}${num(s.setoran) ? `, dengan pemasukan modal sebesar ${rupiah(num(s.setoran))}` : ""}${i === arr.length - 1 ? "." : ";"}`
        })
      );
      blocks.push({
        t: "p",
        text: "Sekutu Komplementer mengurus dan mewakili Persekutuan serta bertanggung jawab sepenuhnya atas perikatan Persekutuan; Sekutu Komanditer tidak turut mengurus dan hanya bertanggung jawab sampai sejumlah pemasukannya."
      });
    }
    if (str(d.namaBaru) || str(d.kedudukanBaru) || str(d.alamatBaru)) {
      blocks.push(...pasal(++no), {
        t: "p",
        text: `Mengubah ketentuan mengenai nama, tempat kedudukan, dan alamat Persekutuan, sehingga Persekutuan bernama Persekutuan Komanditer **${namaAkhir}**, berkedudukan di ${str(d.kedudukanBaru) || str(d.kedudukan) || "[...]"}${str(d.alamatBaru) ? `, beralamat di ${bersih(d.alamatBaru)}` : ""}.`
      });
    }
    if (str(d.bidangBaru) || kbli.length) {
      blocks.push(
        ...pasal(++no),
        { t: "p", text: "Mengubah ketentuan mengenai maksud dan tujuan serta kegiatan usaha Persekutuan, sehingga menjadi berbunyi sebagai berikut:" },
        { t: "item", marker: "1.", text: `Maksud dan tujuan Persekutuan ialah berusaha dalam bidang ${bersih(d.bidangBaru) || "[...]"}.` },
        { t: "item", marker: "2.", text: "Untuk mencapai maksud dan tujuan tersebut di atas, Persekutuan dapat melaksanakan kegiatan usaha sebagai berikut:" },
        ...(kbli.length
          ? kbli.map((k, i) => ({ t: "item" as const, marker: `${String.fromCharCode(97 + (i % 26))}.`, level: 1, text: `${str(k.judul) || "[...]"} (KBLI ${str(k.kode) || "[...]"})${i === kbli.length - 1 ? "." : ";"}` }))
          : [{ t: "item" as const, marker: "a.", level: 1, text: "[...]." }])
      );
    }
    if (num(d.modalBaru)) {
      blocks.push(...pasal(++no), {
        t: "p",
        text: `Mengubah ketentuan mengenai modal, sehingga modal Persekutuan seluruhnya berjumlah ${rupiah(num(d.modalBaru))}, yang merupakan pemasukan dari para sekutu sebagaimana tercatat dalam pembukuan Persekutuan.`
      });
    }
    if (lain.length) {
      blocks.push(...pasal(++no), { t: "p", text: "Mengubah ketentuan anggaran dasar Persekutuan sebagai berikut:" }, ...lain.map((x) => ({ t: "item" as const, marker: "-", text: `${x};` })));
    }
    if (no === 0) blocks.push(...pasal(++no), { t: "p", text: "[...]" });

    blocks.push(
      ...pasal(++no),
      { t: "p", text: "Ketentuan anggaran dasar Persekutuan selebihnya yang tidak diubah dengan akta ini tetap berlaku dan mengikat para sekutu." },
      ...pasal(++no),
      {
        t: "p",
        text: "{Penghadap} memberi kuasa kepada Sekutu Komplementer Persekutuan dan/atau pegawai kantor Notaris, baik bersama-sama maupun masing-masing, dengan hak substitusi, untuk mendaftarkan perubahan ini pada Sistem Administrasi Badan Usaha Kementerian Hukum Republik Indonesia serta melakukan segala tindakan yang diperlukan untuk maksud tersebut."
      },
      ...pasal(++no),
      domisili(d, "{PENGHADAP}"),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
