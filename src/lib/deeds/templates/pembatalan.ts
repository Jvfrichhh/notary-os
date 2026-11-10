import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { daftarPenghadap, dikenal, domisili, judul, pasal, pembuka, penutup, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { orBlank, rupiah, tanggalHuruf } from "../words";

const BIAYA = ["Pihak Pertama", "Pihak Kedua", "Kedua pihak, masing-masing separuh"];

/**
 * Akta Pembatalan: para pihak sepakat membatalkan akta/perjanjian yang
 * pernah mereka buat (Pasal 1338 ayat 2 KUHPerdata), mengatur pengembalian
 * yang sudah diterima, pencabutan kuasa, dan saling membebaskan.
 */
export const pembatalan: DeedTemplate = {
  key: "pembatalan",
  title: "Akta Pembatalan",
  description: "Pembatalan akta/perjanjian atas kesepakatan para pihak, berikut pengembalian uang atau dokumen dan pencabutan kuasa.",
  sections: [
    {
      title: "Akta / Perjanjian yang Dibatalkan",
      fields: [
        { kind: "text", key: "aktaJudul", label: "Judul akta/perjanjian", wide: true, placeholder: "Perjanjian Pengikatan Jual Beli" },
        { kind: "text", key: "aktaNomor", label: "Nomor akta", placeholder: "12" },
        { kind: "date", key: "aktaTanggal", label: "Tanggal akta" },
        {
          kind: "text",
          key: "aktaNotaris",
          label: "Dibuat di hadapan",
          wide: true,
          placeholder: "mis. Tuan ..., Sarjana Hukum, Notaris di Kota Depok",
          help: "Kosongkan bila akta itu dibuat di kantor ini. Untuk perjanjian di bawah tangan tulis 'di bawah tangan, bermeterai cukup'."
        },
        {
          kind: "textarea",
          key: "objek",
          label: "Pokok / objek perjanjian",
          placeholder: "mis. pengikatan jual beli atas sebidang tanah Hak Milik Nomor 123/Babakan seluas 120 m², terletak di Kelurahan Babakan, Kota Bogor"
        }
      ]
    },
    {
      title: "Pihak Pertama",
      fields: [partyList("pihakPertama", "Pihak Pertama", "Pihak Pertama", 1, 4)]
    },
    {
      title: "Pihak Kedua",
      fields: [partyList("pihakKedua", "Pihak Kedua", "Pihak Kedua", 1, 4)]
    },
    {
      title: "Pembatalan",
      fields: [
        {
          kind: "textarea",
          key: "alasan",
          label: "Alasan pembatalan",
          placeholder: "mis. Pihak Kedua tidak dapat melunasi harga pada waktu yang diperjanjikan, dan para pihak sepakat tidak melanjutkan jual beli",
          help: "Kosongkan bila cukup ditulis 'atas kesepakatan bersama'."
        },
        { kind: "money", key: "uangKembali", label: "Uang yang dikembalikan Pihak Pertama kepada Pihak Kedua (Rp)", help: "Kosongkan bila tidak ada uang yang dikembalikan." },
        {
          kind: "select",
          key: "waktuKembali",
          label: "Pengembalian uang",
          options: ["Sudah dikembalikan seluruhnya (akta ini sebagai kwitansi)", "Akan dikembalikan paling lambat pada tanggal tertentu"],
          default: "Sudah dikembalikan seluruhnya (akta ini sebagai kwitansi)",
          wide: true
        },
        { kind: "date", key: "tanggalKembali", label: "Tanggal pengembalian paling lambat", help: "Diisi bila uang belum dikembalikan." },
        {
          kind: "textarea",
          key: "dokumenKembali",
          label: "Dokumen / barang yang dikembalikan (opsional)",
          placeholder: "mis. asli Sertipikat Hak Milik Nomor 123/Babakan dikembalikan oleh Pihak Kedua kepada Pihak Pertama"
        },
        { kind: "select", key: "biaya", label: "Biaya akta ditanggung", options: BIAYA, default: BIAYA[2] }
      ]
    }
  ],
  signers: (d) => [...parties(d.pihakPertama).map((x) => x.p), ...parties(d.pihakKedua).map((x) => x.p)],
  signerLabels: (d) => [...parties(d.pihakPertama).map(() => "Pihak Pertama,"), ...parties(d.pihakKedua).map(() => "Pihak Kedua,")],
  subject: (d) => `Pembatalan ${str(d.aktaJudul) || "akta"}${str(d.aktaNomor) ? ` Nomor ${str(d.aktaNomor)}` : ""}`,
  prefill: (ctx) => ({ pihakPertama: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Pembatalan dengan akta Notaris hanya untuk perjanjian yang dibatalkan atas kesepakatan SEMUA pihaknya (Pasal 1338 ayat 2 KUHPerdata); semua pihak akta asal (atau ahli waris/kuasanya yang sah) harus hadir. Pembatalan sepihak memerlukan putusan pengadilan.",
    "Akta PPAT yang peralihan haknya sudah didaftarkan di Kantor Pertanahan (AJB, Hibah, APHB yang sudah balik nama) tidak dapat dibatalkan dengan akta ini; pembatalannya melalui putusan pengadilan atau peralihan kembali dengan akta PPAT baru.",
    "Bila akta asal dibuat di kantor ini, beri catatan pada minuta akta asal dengan menyebut nomor dan tanggal akta pembatalan ini. Bila dibuat di hadapan Notaris lain, minta salinan aslinya diperlihatkan dan lekatkan fotokopinya pada minuta.",
    "Periksa akibat ikutannya: kuasa yang terlanjur dipakai, pajak (PPh/BPHTB) yang sudah dibayar, uang muka, serta pendaftaran atau pemblokiran yang perlu dicabut."
  ],
  build(d, variant) {
    const p1 = parties(d.pihakPertama);
    const p2 = parties(d.pihakKedua);
    const pen = [...p1, ...p2].map((x) => ({ p: x.p, peran: peranDari(x) }));
    const notaris = str(d.aktaNotaris).replace(/[\s.;,]+$/, "");
    const bawahTangan = /bawah tangan/i.test(notaris);
    const judulAkta = str(d.aktaJudul);
    const sebut = bawahTangan
      ? `${judulAkta || "[...]"} tertanggal ${tanggalHuruf(str(d.aktaTanggal))}, yang dibuat ${notaris}`
      : `akta ${judulAkta || "[...]"} Nomor ${orBlank(str(d.aktaNomor))} tanggal ${tanggalHuruf(str(d.aktaTanggal))}, yang dibuat di hadapan ${notaris || "saya, Notaris"}`;
    const objek = str(d.objek).replace(/[\s.;]+$/, "");
    const alasan = str(d.alasan).replace(/[\s.;]+$/, "");
    const uang = Number(str(d.uangKembali)) > 0 ? rupiah(str(d.uangKembali)) : "";
    const sudah = !str(d.waktuKembali) || str(d.waktuKembali).startsWith("Sudah dikembalikan");
    const dokumen = str(d.dokumenKembali).replace(/[\s.;]+$/, "");
    const biaya = str(d.biaya) || BIAYA[2];

    let no = 0;
    const blocks: Block[] = [
      judul("PEMBATALAN", d, judulAkta ? judulAkta.toUpperCase() : undefined),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, p1.length)} untuk selanjutnya disebut **PIHAK PERTAMA**; dan penghadap ${nomorPenghadap(p1.length + 1, p2.length)} untuk selanjutnya disebut **PIHAK KEDUA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "-",
        text: `bahwa antara Pihak Pertama dan Pihak Kedua telah dibuat dan ditandatangani ${sebut}${objek ? `, mengenai ${objek}` : ""}, yang untuk selanjutnya disebut **PERJANJIAN**;`
      },
      {
        t: "item",
        marker: "-",
        text: alasan
          ? `bahwa ${alasan};`
          : "bahwa karena satu dan lain hal Pihak Pertama dan Pihak Kedua tidak bermaksud melanjutkan pelaksanaan Perjanjian tersebut;"
      },
      {
        t: "item",
        marker: "-",
        text: "bahwa berhubung dengan hal tersebut, Pihak Pertama dan Pihak Kedua telah saling setuju dan mufakat untuk membatalkan Perjanjian tersebut."
      },
      {
        t: "p",
        text: "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan dengan ini membatalkan Perjanjian tersebut dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut:"
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Pihak Pertama dan Pihak Kedua dengan ini membatalkan Perjanjian tersebut berikut segala perubahan dan tambahannya, terhitung sejak tanggal akta ini ditandatangani, sehingga sejak saat itu Perjanjian tersebut tidak berlaku lagi dan tidak mempunyai kekuatan hukum yang mengikat bagi para pihak, dan para pihak kembali pada keadaan seperti sebelum Perjanjian tersebut dibuat."
      },
      ...pasal(++no),
      {
        t: "p",
        text: "Untuk pembatalan ini para pihak melepaskan ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata, sepanjang ketentuan tersebut mensyaratkan putusan Hakim untuk batalnya suatu perjanjian."
      }
    ];

    if (uang) {
      blocks.push(...pasal(++no), {
        t: "p",
        text: sudah
          ? `Sehubungan dengan pembatalan ini, Pihak Pertama telah mengembalikan kepada Pihak Kedua uang sebesar ${uang} yang telah diterimanya berdasarkan Perjanjian tersebut; jumlah uang tersebut telah diterima seluruhnya oleh Pihak Kedua, dan untuk penerimaan sejumlah uang tersebut akta ini berlaku pula sebagai tanda penerimaannya atau kwitansinya yang sah.`
          : `Sehubungan dengan pembatalan ini, Pihak Pertama wajib mengembalikan kepada Pihak Kedua uang sebesar ${uang} yang telah diterimanya berdasarkan Perjanjian tersebut, selambat-lambatnya pada tanggal ${tanggalHuruf(str(d.tanggalKembali))}, dengan mendapat tanda penerimaan dari Pihak Kedua; kewajiban pengembalian ini tetap berlaku meskipun Perjanjian tersebut telah batal.`
      });
    }
    if (dokumen) {
      blocks.push(...pasal(++no), {
        t: "p",
        text: `Sehubungan dengan pembatalan ini, para pihak menerangkan bahwa ${dokumen}, dan masing-masing pihak wajib menyerahkan kembali segala surat dan dokumen milik pihak lainnya yang ada padanya berdasarkan Perjanjian tersebut.`
      });
    }

    blocks.push(
      ...pasal(++no),
      {
        t: "p",
        text: "Dengan batalnya Perjanjian tersebut, maka segala kuasa yang diberikan di dalam atau berdasarkan Perjanjian tersebut dengan ini dicabut dan dinyatakan tidak berlaku lagi, dan penerima kuasa tidak berhak lagi melakukan tindakan apa pun berdasarkan kuasa tersebut."
      },
      ...pasal(++no),
      {
        t: "p",
        text: uang && !sudah
          ? "Setelah kewajiban pengembalian uang tersebut di atas dipenuhi, Pihak Pertama dan Pihak Kedua saling memberikan pembebasan dan pelunasan sepenuhnya (acquit et decharge), dan masing-masing pihak tidak akan mengajukan tuntutan atau gugatan berupa apa pun terhadap pihak lainnya berdasarkan Perjanjian yang dibatalkan tersebut."
          : "Dengan ditandatanganinya akta ini, Pihak Pertama dan Pihak Kedua saling memberikan pembebasan dan pelunasan sepenuhnya (acquit et decharge), dan masing-masing pihak tidak akan mengajukan tuntutan atau gugatan berupa apa pun terhadap pihak lainnya berdasarkan Perjanjian yang dibatalkan tersebut."
      },
      ...pasal(++no),
      {
        t: "p",
        text: `Biaya pembuatan akta ini dan biaya lainnya berkenaan dengan pembatalan ini menjadi tanggungan dan harus dibayar oleh ${biaya === BIAYA[2] ? "Pihak Pertama dan Pihak Kedua, masing-masing untuk separuh bagian" : biaya}.`
      },
      ...pasal(++no),
      domisili(d),
      ...penutup(d, variant)
    );
    return blocks;
  }
};
