import type { Block, Line } from "./layout";
import type { DeedData, Person } from "./schema";
import { hari, jamHuruf, orBlank, tanggalHuruf } from "./words";

/** Identitas kantor (skill akta-notaris-indonesia). */
export const NOTARIS = {
  namaLengkap: "ARI YUDANI APRIANTI, Sarjana Hukum, Magister Kenotariatan",
  namaSingkat: "ARI YUDANI APRIANTI, S.H., M.Kn.",
  kedudukan: "Notaris di Kota Bogor",
  wilayah: "wilayah jabatan Provinsi Jawa Barat",
  kota: "Kota Bogor"
};

/**
 * Data jabatan PPAT (isi sesuai SK pengangkatan). Kosong -> tertulis [...]
 * di akta PPAT supaya terlihat dan dilengkapi.
 */
export const PPAT = {
  skNomor: "",
  skTanggal: "",
  daerahKerja: "Kota Bogor",
  alamatKantor: ""
};

export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
export const person = (v: unknown): Person => (v && typeof v === "object" ? (v as Person) : {});
export const list = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Nama tebal huruf besar, mis. "Tuan **BUDI SANTOSO**". */
export function namaTebal(p: Person): string {
  const nama = str(p.nama).toUpperCase() || "[...]";
  return `${str(p.sapaan) || "Tuan/Nyonya"} **${nama}**`;
}

/** Identitas lengkap (komparisi) tanpa nama di depan. */
export function identitas(p: Person): string {
  const wn = str(p.kewarganegaraan) || "Indonesia";
  return [
    `lahir di ${orBlank(p.tempatLahir)}, pada tanggal ${tanggalHuruf(p.tanggalLahir)}`,
    `Warga Negara ${wn}`,
    orBlank(p.pekerjaan),
    `bertempat tinggal di ${orBlank(p.alamat)}, Rukun Tetangga ${orBlank(p.rt)}, Rukun Warga ${orBlank(p.rw)}, ${orBlank(p.kelurahan)}, Kecamatan ${orBlank(p.kecamatan)}, ${orBlank(p.kota)}`,
    `pemegang Kartu Tanda Penduduk dengan Nomor Induk Kependudukan ${orBlank(p.nik)}`
  ].join(", ");
}

/** "Tuan **BUDI**, lahir di ..., NIK ...;" */
export function komparisi(p: Person, akhir = ";"): string {
  return `${namaTebal(p)}, ${identitas(p)}${akhir}`;
}

export function judul(nama: string, data: DeedData): Block {
  return { t: "title", lines: [nama.toUpperCase(), `Nomor : ${orBlank(str(data.nomorAkta))}.`] };
}

/** "-Pada hari ini ..." + "-Berhadapan dengan saya ..." */
export function pembuka(data: DeedData): Block[] {
  const tgl = str(data.tanggalAkta);
  return [
    {
      t: "p",
      text: `Pada hari ini, ${hari(tgl)}, tanggal ${tanggalHuruf(tgl)}, pukul ${jamHuruf(str(data.jamAkta))}.`
    },
    {
      t: "p",
      text: `Berhadapan dengan saya, **${NOTARIS.namaLengkap}**, ${NOTARIS.kedudukan}, dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan nama-namanya akan disebutkan pada bagian akhir akta ini:`
    }
  ];
}

/** Daftar penghadap bernomor; `peran` ditambahkan setelah identitas (mis. kapasitas bertindak). */
export function daftarPenghadap(items: { p: Person; peran?: string }[]): Block[] {
  return items.map((it, i) => ({
    t: "item" as const,
    marker: `${i + 1}.`,
    text: `${komparisi(it.p, "")}${it.peran ? `; ${it.peran}` : ""};`
  }));
}

export function dikenal(jumlah: number): Block {
  return {
    t: "p",
    text:
      jumlah > 1
        ? "Para penghadap telah dikenal oleh saya, Notaris, dari identitas yang diperlihatkan kepada saya, Notaris."
        : "Penghadap telah dikenal oleh saya, Notaris, dari identitas yang diperlihatkan kepada saya, Notaris."
  };
}

export function domisili(data: DeedData, pihak = "para pihak"): Block {
  return {
    t: "p",
    text: `Mengenai akta ini dengan segala akibat dan pelaksanaannya, ${pihak} memilih tempat kedudukan hukum (domisili) yang umum dan tetap di Kantor Kepaniteraan Pengadilan Negeri ${str(data.kotaPengadilan) || "Bogor"}.`
  };
}

/** Akhir akta (Pasal 38 ayat 4 UUJN). */
export function penutup(data: DeedData, variant: "minuta" | "salinan"): Block[] {
  const s1 = person(data.saksi1);
  const s2 = person(data.saksi2);
  const blocks: Block[] = [
    { t: "closingStart" },
    { t: "center", text: "DEMIKIAN AKTA INI", bold: true },
    {
      t: "p",
      text: `Dibuat sebagai minuta dan dilangsungkan di ${NOTARIS.kota}, pada hari, tanggal dan jam sebagaimana tersebut pada bagian awal akta ini, dengan dihadiri oleh:`
    },
    { t: "item", marker: "1.", text: komparisi(s1) },
    { t: "item", marker: "2.", text: komparisi(s2, ".") },
    { t: "p", text: "Keduanya karyawan kantor Notaris, sebagai saksi-saksi." },
    {
      t: "p",
      text: "Segera setelah akta ini dibacakan oleh saya, Notaris kepada para penghadap dan saksi-saksi, maka akta ini ditandatangani oleh para penghadap, saksi-saksi dan saya, Notaris."
    },
    { t: "p", text: "Dilangsungkan dengan tanpa perubahan." },
    { t: "p", text: "Minuta akta ini telah ditandatangani dengan sempurna." }
  ];
  if (variant === "salinan") blocks.push({ t: "p", text: "Diberikan sebagai **SALINAN** yang sama bunyinya." });
  return blocks;
}

// ---------------------------------------------------------------------------
// Blok tanda tangan
// ---------------------------------------------------------------------------

const COL_W = 16;

function wrapPlain(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

const plain = (text: string, bold = false): Line => ({ segs: [{ text, bold }], col: 0, border: false, plain: true });

/** Minuta: tiga kolom Penghadap – Saksi-saksi – Notaris. */
export function tandaTanganMinuta(penghadap: Person[], data: DeedData, pejabat = "Notaris"): { lines: Line[]; minLines: number } {
  const saksi = [person(data.saksi1), person(data.saksi2)];
  const lines: Line[] = [plain(""), {
    segs: [
      { text: "Penghadap".padEnd(COL_W + 1), bold: true },
      { text: "Saksi-saksi".padEnd(COL_W + 1), bold: true },
      { text: pejabat, bold: true }
    ],
    col: 0,
    border: false,
    plain: true
  }];
  const rows = Math.max(penghadap.length, saksi.length, 1);
  for (let i = 0; i < rows; i++) {
    for (let g = 0; g < 4; g++) lines.push(plain(""));
    const cols = [
      penghadap[i] ? wrapPlain(str(penghadap[i].nama).toUpperCase() || "[...]", COL_W) : [""],
      saksi[i] ? wrapPlain(str(saksi[i].nama).toUpperCase() || "[...]", COL_W) : [""],
      i === 0 ? wrapPlain(NOTARIS.namaSingkat, COL_W) : [""]
    ];
    const h = Math.max(...cols.map((c) => c.length));
    for (let r = 0; r < h; r++) {
      lines.push({
        segs: cols.map((c, ci) => ({ text: ci < 2 ? (c[r] ?? "").padEnd(COL_W + 1) : c[r] ?? "", bold: true })),
        col: 0,
        border: false,
        plain: true
      });
    }
  }
  // Baris judul kolom + satu baris tanda tangan pertama wajib satu halaman dengan penutup.
  return { lines, minLines: 8 };
}

/** Salinan: blok bergaris tersendiri di kolom tanda tangan, celah 4 baris untuk meterai. */
export function tandaTanganSalinan(): { lines: Line[]; minLines: number } {
  const col = 16;
  const w = 50 - col;
  const center = (t: string, bold = false): Line => {
    const pad = Math.max(0, Math.floor((w - t.length) / 2));
    return { segs: [{ text: " ".repeat(Math.max(1, pad)) }, { text: t, bold }], col, border: true, plain: true };
  };
  const block: Line[] = [
    center(NOTARIS.kedudukan + ","),
    { segs: [{ text: "" }], col, border: true, plain: true },
    { segs: [{ text: "" }], col, border: true, plain: true },
    { segs: [{ text: "" }], col, border: true, plain: true },
    { segs: [{ text: "" }], col, border: true, plain: true },
    center(NOTARIS.namaSingkat, true)
  ];
  block[0].markTop = true;
  block[block.length - 1].markBottom = true;
  return { lines: [plain(""), ...block], minLines: block.length + 1 };
}

/**
 * Penghadap + pasangannya (persetujuan suami/istri atas harta bersama,
 * Pasal 36 ayat (1) UU Perkawinan). Pasangan menjadi penghadap tersendiri.
 */
export function denganPasangan(
  pihak: Person[],
  pasangan: Person,
  peranPihak: string
): { p: Person; peran?: string }[] {
  const out: { p: Person; peran?: string }[] = pihak.map((p) => ({ p, peran: peranPihak }));
  if (str(pasangan.nama)) {
    const utama = pihak[0];
    const hubungan = str(pasangan.sapaan) === "Tuan" ? "istrinya" : "suaminya";
    out.push({
      p: pasangan,
      peran: `menurut keterangannya dalam hal ini hadir untuk memberikan persetujuan kepada ${hubungan}, ${utama ? namaTebal(utama) : "[...]"}, tersebut di atas, untuk melakukan tindakan hukum dalam akta ini`
    });
  }
  return out;
}

export function pasal(nomor: number, judulPasal?: string): Block[] {
  const blocks: Block[] = [{ t: "center", text: `Pasal ${nomor}`, bold: true }];
  if (judulPasal) blocks.push({ t: "center", text: judulPasal.toUpperCase(), bold: true });
  return blocks;
}

/** Ayat bernomor (1), (2), ... dalam satu pasal. */
export function ayat(teks: string[]): Block[] {
  if (teks.length === 1) return [{ t: "p", text: teks[0] }];
  return teks.map((t, i) => ({ t: "item" as const, marker: `${i + 1}.`, text: t }));
}
