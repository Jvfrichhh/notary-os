import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import { ayat, daftarPenghadap, denganPasangan, dikenal, domisili, judul, list, pasal, pembuka, penutup, person, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { rupiah, tanggalHuruf } from "../words";

type Objek = { uraian?: string; bukti?: string; nilai?: string };

export const fidusia: DeedTemplate = {
  key: "fidusia",
  title: "Akta Jaminan Fidusia",
  description: "Pembebanan jaminan fidusia atas benda bergerak (UU No. 42 Tahun 1999).",
  sections: [
    {
      title: "Pemberi Fidusia",
      fields: [
        partyList("pemberi", "Pemberi fidusia", "Pemberi fidusia", 1, 3),
        { kind: "person", key: "pasangan", label: "Suami/istri pemberi fidusia (persetujuan; kosongkan bila tidak ada)", optional: true }
      ]
    },
    {
      title: "Penerima Fidusia",
      fields: [
        partyList("penerima", "Penerima fidusia (kreditor) / wakilnya", "Penerima fidusia", 1, 2),
        { kind: "text", key: "namaKreditur", label: "Nama kreditor (bila badan hukum)", wide: true, placeholder: "PT Bank ABC Tbk., berkedudukan di Jakarta" }
      ]
    },
    {
      title: "Perjanjian Pokok & Nilai",
      fields: [
        { kind: "text", key: "perjanjianPokok", label: "Perjanjian pokok (judul, nomor)", wide: true, placeholder: "Perjanjian Kredit Nomor 123/PK/2026" },
        { kind: "date", key: "tanggalPerjanjian", label: "Tanggal perjanjian pokok" },
        { kind: "money", key: "nilaiUtang", label: "Nilai utang yang dijamin (Rp)" },
        { kind: "money", key: "nilaiPenjaminan", label: "Nilai penjaminan (Rp)" }
      ]
    },
    {
      title: "Objek Jaminan Fidusia",
      fields: [
        {
          kind: "list",
          key: "objek",
          label: "Benda",
          itemLabel: "Benda",
          min: 1,
          max: 20,
          fields: [
            { kind: "textarea", key: "uraian", label: "Uraian benda", placeholder: "1 (satu) unit mobil merek Toyota, tipe Avanza 1.3 G, tahun 2023, warna hitam, nomor rangka ..., nomor mesin ..., nomor polisi F 1234 AB" },
            { kind: "text", key: "bukti", label: "Bukti kepemilikan", placeholder: "BPKB Nomor P-01234567 atas nama ..." },
            { kind: "money", key: "nilai", label: "Nilai objek (Rp)" }
          ]
        }
      ]
    }
  ],
  signers: (d) => {
    const s = parties(d.pemberi).map((x) => x.p);
    if (str(person(d.pasangan).nama)) s.push(person(d.pasangan));
    return [...s, ...parties(d.penerima).map((x) => x.p)];
  },
  prefill: (ctx) => ({ pemberi: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] }),
  notes: () => [
    "Akta Jaminan Fidusia wajib didaftarkan secara elektronik paling lambat 30 hari sejak tanggal akta (PP No. 21 Tahun 2015).",
    "Untuk akta fidusia, PERHATIKAN format baku pendaftaran (nilai penjaminan, nilai objek) agar sesuai isian sistem."
  ],
  build(d, variant) {
    const pemberi = parties(d.pemberi);
    const penerima = parties(d.penerima);
    const pasangan = person(d.pasangan);
    const ada = !!str(pasangan.nama);
    const objek = list<Objek>(d.objek);
    const kreditorAwal = str(d.namaKreditur);
    const pen = [
      ...denganPasangan(pemberi.map((x) => x.p), pasangan, "").map((x, i) => (i < pemberi.length ? { ...x, peran: peranDari(pemberi[i]) } : x)),
      ...penerima.map((x) => ({
        p: x.p,
        // Wakil kreditor badan hukum: kedudukan bertindak harus sesuai dengan nama kreditor.
        peran:
          kreditorAwal && x.kapasitas === "untuk diri sendiri"
            ? `menurut keterangannya dalam hal ini bertindak selaku kuasa dari dan oleh karena itu untuk dan atas nama **${kreditorAwal}**`
            : peranDari(x)
      }))
    ];
    const n1 = pemberi.length + (ada ? 1 : 0);
    const kreditor = str(d.namaKreditur);
    const blocks: Block[] = [
      judul("JAMINAN FIDUSIA", d),
      ...pembuka(d),
      ...daftarPenghadap(pen),
      {
        t: "p",
        text: `Penghadap ${nomorPenghadap(1, pemberi.length)}${ada ? `, dengan persetujuan penghadap ${nomorPenghadap(pemberi.length + 1, 1)},` : ""} untuk selanjutnya disebut **PEMBERI FIDUSIA**; dan ${kreditor ? `**${kreditor}**, yang diwakili oleh penghadap ${nomorPenghadap(n1 + 1, penerima.length)},` : `penghadap ${nomorPenghadap(n1 + 1, penerima.length)}`} untuk selanjutnya disebut **PENERIMA FIDUSIA**.`
      },
      dikenal(pen.length),
      { t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" },
      {
        t: "item",
        marker: "a.",
        text: `bahwa antara Penerima Fidusia sebagai kreditor dan Pemberi Fidusia sebagai debitor telah dibuat dan ditandatangani ${str(d.perjanjianPokok) || "[...]"} tertanggal ${tanggalHuruf(str(d.tanggalPerjanjian))}, dengan nilai utang sebesar ${rupiah(str(d.nilaiUtang))}, berikut segala perubahan, perpanjangan, dan pembaruannya, untuk selanjutnya disebut **PERJANJIAN POKOK**;`
      },
      { t: "item", marker: "b.", text: "bahwa untuk menjamin pelunasan utang berdasarkan Perjanjian Pokok, Pemberi Fidusia bersedia memberikan jaminan fidusia atas benda-benda miliknya kepada Penerima Fidusia." },
      { t: "p", text: "Sehubungan dengan hal-hal tersebut di atas, {PENGHADAP} menerangkan dengan ini telah sepakat membuat perjanjian dengan syarat-syarat sebagai berikut:" },
      ...pasal(1, "Pembebanan"),
      { t: "p", text: `Pemberi Fidusia dengan ini memberikan jaminan fidusia kepada Penerima Fidusia, yang menerima dari Pemberi Fidusia, dengan nilai penjaminan sebesar ${rupiah(str(d.nilaiPenjaminan))}, atas benda-benda sebagai berikut:` },
      ...objek.map((o, i) => ({
        t: "item" as const,
        marker: `${i + 1}.`,
        text: `${str(o.uraian) || "[...]"}; bukti kepemilikan: ${str(o.bukti) || "[...]"}; nilai objek ${rupiah(str(o.nilai))}${i === objek.length - 1 ? "." : ";"}`
      })),
      { t: "p", text: "Benda-benda tersebut untuk selanjutnya disebut **OBJEK JAMINAN FIDUSIA**." },
      ...pasal(2, "Penguasaan Objek"),
      { t: "p", text: "Objek Jaminan Fidusia tetap berada dalam penguasaan Pemberi Fidusia sebagai peminjam pakai, dengan kewajiban memelihara dan memakainya dengan sebaik-baiknya serta tidak memindahkan tempatnya tanpa persetujuan tertulis Penerima Fidusia." },
      ...pasal(3, "Kewajiban Pemberi Fidusia"),
      ...ayat([
        "Pemberi Fidusia menjamin bahwa Objek Jaminan Fidusia benar miliknya, tidak dibebani jaminan apa pun kepada pihak lain, dan tidak dalam sengketa.",
        "Pemberi Fidusia dilarang mengalihkan, menggadaikan, menyewakan, atau memfidusiakan ulang Objek Jaminan Fidusia tanpa persetujuan tertulis Penerima Fidusia, kecuali pengalihan benda persediaan dalam kegiatan usaha perdagangan sebagaimana dimaksud dalam Pasal 21 Undang-Undang Nomor 42 Tahun 1999 tentang Jaminan Fidusia, dengan kewajiban menggantinya dengan objek yang setara.",
        "Pemberi Fidusia wajib mengasuransikan Objek Jaminan Fidusia bila diminta Penerima Fidusia, dengan Penerima Fidusia ditunjuk sebagai pihak yang berhak menerima klaim."
      ]),
      ...pasal(4, "Cidera Janji dan Eksekusi"),
      ...ayat([
        "Pemberi Fidusia dianggap cidera janji apabila tidak memenuhi kewajiban pembayaran atau kewajiban lain berdasarkan Perjanjian Pokok dan akta ini, setelah ditegur secara tertulis oleh Penerima Fidusia dan kewajiban tersebut tetap tidak dipenuhi dalam jangka waktu yang ditentukan dalam teguran itu.",
        "Dalam hal Pemberi Fidusia mengakui telah cidera janji dan secara sukarela menyerahkan Objek Jaminan Fidusia, Penerima Fidusia berhak menjual Objek Jaminan Fidusia atas kekuasaan sendiri melalui pelelangan umum, atau melalui penjualan di bawah tangan berdasarkan kesepakatan Pemberi Fidusia dan Penerima Fidusia, sesuai ketentuan Pasal 29 Undang-Undang Nomor 42 Tahun 1999 tentang Jaminan Fidusia.",
        "Dalam hal Pemberi Fidusia tidak mengakui adanya cidera janji atau tidak menyerahkan Objek Jaminan Fidusia secara sukarela, eksekusi dilakukan melalui permohonan pelaksanaan eksekusi kepada Pengadilan Negeri, sesuai Putusan Mahkamah Konstitusi Nomor 18/PUU-XVII/2019.",
        "Penerima Fidusia mengambil pelunasan piutangnya dari hasil penjualan Objek Jaminan Fidusia dan wajib mengembalikan kelebihannya kepada Pemberi Fidusia; dalam hal hasil penjualan tidak mencukupi, Pemberi Fidusia tetap bertanggung jawab atas sisa utangnya."
      ]),
      ...pasal(5, "Pendaftaran"),
      { t: "p", text: "Pemberi Fidusia dengan ini memberi kuasa kepada Penerima Fidusia, dengan hak substitusi, untuk mendaftarkan jaminan fidusia ini pada Kantor Pendaftaran Fidusia, melakukan perubahan pendaftaran, dan menandatangani segala dokumen yang diperlukan; kuasa ini merupakan bagian yang tidak terpisahkan dari akta ini dan tidak dapat ditarik kembali." },
      ...pasal(6, "Hapusnya Jaminan Fidusia"),
      { t: "p", text: "Jaminan fidusia hapus karena hapusnya utang yang dijamin, pelepasan hak atas jaminan fidusia oleh Penerima Fidusia, atau musnahnya Objek Jaminan Fidusia; dalam hal demikian Penerima Fidusia wajib memberitahukan penghapusan pendaftarannya sesuai ketentuan yang berlaku." },
      ...pasal(7, "Domisili"),
      domisili(d),
      ...penutup(d, variant)
    ];
    return blocks;
  }
};
