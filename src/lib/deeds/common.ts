import type { Block, Line, Seg } from "./layout";
import type { DeedData, Person } from "./schema";
import { hari, jamHuruf, orBlank, tanggalHuruf } from "./words";

/** Identitas kantor (skill akta-standar-kantor-ari-yudani). */
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
  /** SK Menteri ATR/Kepala BPN (papan nama kantor). */
  skNomor: "88/SK-HR.03.04.PPAT/I/2024",
  /** ISO; ditulis dengan huruf di akta. */
  skTanggal: "2024-01-17",
  daerahKerja: "Kota Bogor",
  alamatKantor:
    "Tata Hill Townhouse Yasmin, Blok D Nomor 06, Jalan Cimanggu Pabuaran, Kelurahan Cilendek Timur, Kecamatan Bogor Barat, Kota Bogor, Provinsi Jawa Barat",
  /** Untuk kop surat (covernote, tagihan). */
  alamatSurat: "Tata Hill Townhouse Yasmin, Blok D No. 06, Jl. Cimanggu Pabuaran, Kel. Cilendek Timur, Kec. Bogor Barat, Kota Bogor, Jawa Barat 16112",
  telepon: "0812-1311-5252 / 0817-985-4676",
  email: "no.ppat.ariyudani@gmail.com"
};

export const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
export const person = (v: unknown): Person => (v && typeof v === "object" ? (v as Person) : {});
export const list = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** NAMA huruf besar + gelar lengkap bila ada, mis. "DENY CHANDRA, Sarjana Hukum". */
export function namaLengkap(p: Person): string {
  const nama = str(p.nama).toUpperCase() || "[...]";
  return str(p.gelar) ? `${nama}, ${str(p.gelar)}` : nama;
}

/** Nama tebal huruf besar, mis. "Tuan **BUDI SANTOSO**". */
export function namaTebal(p: Person): string {
  return `${str(p.sapaan) || "Tuan/Nyonya"} **${namaLengkap(p)}**`;
}

/** Sebutan singkat untuk blok tanda tangan & lembar sidik jari: "Tn." / "Ny." (tidak tebal). */
export function sebutanSingkat(p: Person): string {
  const s = str(p.sapaan).toLowerCase();
  if (s === "tuan") return "Tn.";
  if (s === "nyonya" || s === "nona") return "Ny.";
  return "";
}

/** "Kelurahan X" / "Desa X" -- tambahkan kata Kelurahan bila belum ada. */
function kelurahan(v: string): string {
  if (!v || v === "[...]") return `Kelurahan ${v || "[...]"}`;
  return /^(kel(urahan)?|desa)\b/i.test(v) ? v.replace(/^kel\.?\s+/i, "Kelurahan ") : `Kelurahan ${v}`;
}

/** "almarhum" (Tuan) / "almarhumah" (Nyonya, Nona) untuk orang yang telah meninggal. */
export function almarhum(p: Person): string {
  const s = str(p.sapaan).toLowerCase();
  if (s === "tuan") return "almarhum";
  if (s === "nyonya" || s === "nona") return "almarhumah";
  return "almarhum/almarhumah";
}

/** Identitas lengkap (komparisi) tanpa nama di depan. */
export function identitas(p: Person, opts: { almarhum?: boolean } = {}): string {
  const wn = str(p.kewarganegaraan) || "Indonesia";
  const tinggal = opts.almarhum ? "semasa hidupnya terakhir bertempat tinggal di" : "bertempat tinggal di";
  // Urutan standar kantor: lahir, pekerjaan, kewarganegaraan, alamat (kota dahulu), KTP.
  return [
    `lahir di ${orBlank(p.tempatLahir)}, pada tanggal ${tanggalHuruf(p.tanggalLahir)}`,
    orBlank(p.pekerjaan),
    `Warga Negara ${wn}`,
    `${tinggal} ${orBlank(p.kota)}, ${orBlank(p.alamat)}, Rukun Tetangga ${orBlank(p.rt)}, Rukun Warga ${orBlank(p.rw)}, ${kelurahan(orBlank(p.kelurahan))}, Kecamatan ${orBlank(p.kecamatan)}`,
    `pemegang Kartu Tanda Penduduk dengan Nomor Induk Kependudukan ${orBlank(p.nik)}`
  ].join(", ");
}

/** "Tuan **BUDI**, lahir di ..., NIK ...;" */
export function komparisi(p: Person, akhir = ";"): string {
  return `${namaTebal(p)}, ${identitas(p)}${akhir}`;
}

/** Judul akta: nama akta, (opsional) baris kedua mis. nama PT, lalu nomor. */
export function judul(nama: string, data: DeedData, sub?: string): Block {
  return { t: "title", lines: [nama.toUpperCase(), ...(sub ? [sub.toUpperCase()] : []), `Nomor : ${orBlank(str(data.nomorAkta))}.`] };
}

/**
 * Teks penutup memakai penanda {PENGHADAP}/{Penghadap}; diganti saat render
 * sesuai jumlah penghadap ("para penghadap" atau "penghadap").
 */
export function resolvePenghadap<T extends { t: string; text?: string }>(blocks: T[], jumlah: number): T[] {
  const many = jumlah !== 1;
  return blocks.map((b) =>
    typeof b.text === "string" && b.text.includes("{")
      ? { ...b, text: b.text.replace(/\{PENGHADAP\}/g, many ? "para penghadap" : "penghadap").replace(/\{Penghadap\}/g, many ? "Para penghadap" : "Penghadap") }
      : b
  );
}

/** "-Pada hari ini ..." + "-Hadir menghadap kepada saya ..." (kepala akta standar kantor). */
export function pembuka(data: DeedData): Block[] {
  const tgl = str(data.tanggalAkta);
  return [
    {
      t: "p",
      text: `Pada hari ini, ${hari(tgl)}, tanggal ${tanggalHuruf(tgl)}, pukul ${jamHuruf(str(data.jamAkta))}.`
    },
    {
      t: "p",
      text: `Hadir menghadap kepada saya, **${NOTARIS.namaLengkap}**, ${NOTARIS.kedudukan}, dengan dihadiri oleh saksi-saksi yang saya, Notaris, kenal dan nama-namanya akan disebut pada akhir akta ini:`
    }
  ];
}

/** Daftar penghadap bernomor; `peran` ditambahkan setelah identitas (mis. kapasitas bertindak). */
export function daftarPenghadap(items: { p: Person; peran?: string }[]): Block[] {
  return items.map((it, i) => ({
    t: "item" as const,
    marker: `${i + 1}.`,
    text: `${komparisi(it.p, "")}${it.peran ? `; ${it.peran}` : ""}${i === items.length - 1 ? "." : ";"}`
  }));
}

export function dikenal(jumlah: number): Block {
  return {
    t: "p",
    text:
      jumlah !== 1
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

/** Akhir akta (Pasal 38 ayat 4 UUJN) -- rumusan standar kantor. */
export function penutup(data: DeedData, variant: "minuta" | "salinan", opts: { wasiat?: boolean } = {}): Block[] {
  const s1 = person(data.saksi1);
  const s2 = person(data.saksi2);
  const blocks: Block[] = [
    { t: "closingStart" },
    { t: "center", text: "DEMIKIAN AKTA INI", bold: true },
    {
      t: "p",
      // Minuta: "sebagai minuta"; Salinan: "sebagai salinan" (jangan tertukar).
      text: `Dibuat sebagai ${variant} dan dilangsungkan di ${NOTARIS.kota}, pada hari, tanggal dan pukul tersebut pada bagian awal akta ini, dengan dihadiri oleh:`
    },
    { t: "item", marker: "1.", text: komparisi(s1) },
    { t: "item", marker: "2.", text: komparisi(s2, ";") },
    { t: "p", text: "sebagai saksi-saksi." },
    ...(opts.wasiat
      ? ([
          {
            t: "p",
            text: "Kedua saksi tersebut bukan ahli waris atau penerima hibah wasiat dalam akta ini, dan tidak mempunyai hubungan keluarga sedarah atau semenda sampai derajat keempat dengan Pewasiat maupun dengan para penerima hibah wasiat, maupun dengan saya, Notaris."
          },
          {
            t: "p",
            carryStart: true,
            text: "Pewasiat telah menerangkan kehendaknya kepada saya, Notaris, di hadapan saksi-saksi, dan saya, Notaris, telah menuliskan kehendak tersebut dalam akta ini dengan kata-kata yang jelas."
          },
          {
            t: "p",
            text: "Segera setelah itu akta ini saya, Notaris, bacakan kepada Pewasiat di hadapan saksi-saksi, dan atas pertanyaan saya, Notaris, Pewasiat menerangkan bahwa apa yang dibacakan itu benar memuat kehendak terakhirnya; maka akta ini ditandatangani oleh Pewasiat, saksi-saksi, dan saya, Notaris."
          },
          { t: "p", text: "Segala ketentuan Pasal 938 dan Pasal 939 Kitab Undang-Undang Hukum Perdata telah dipenuhi dalam pembuatan akta wasiat ini." }
        ] as Block[])
      : ([
          {
            t: "p",
            carryStart: true,
            text: "Segera setelah akta ini saya, Notaris, bacakan kepada {PENGHADAP} dan saksi-saksi, maka akta ini ditandatangani oleh {PENGHADAP}, saksi-saksi, dan saya, Notaris."
          }
        ] as Block[])),
    { t: "p", text: "{Penghadap} membubuhkan cap ibu jari tangan kanan pada lembar kertas yang dilekatkan pada minuta akta ini." },
    { t: "p", text: "Dilangsungkan dengan tiada perubahan." }
  ];
  if (variant === "minuta") blocks.push({ t: "p", text: "Asli akta ini telah ditandatangani sempurna." });
  else {
    blocks.push({ t: "p", text: "Minuta akta ini telah ditandatangani dengan sempurna." });
    blocks.push({ t: "p", text: "Diberikan sebagai **SALINAN** yang sama bunyinya." });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Blok tanda tangan
// ---------------------------------------------------------------------------

function wrapPlain(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean).flatMap((w) => {
    // Kata lebih panjang dari kolom dipotong keras.
    const parts: string[] = [];
    for (let i = 0; i < w.length; i += width) parts.push(w.slice(i, i + width));
    return parts;
  });
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

const SIG_GAP_MINUTA = 3; // baris kosong untuk tanda tangan (sudah dikurangi satu spasi)
const SIG_GAP_SALINAN = 2;
const SIG_COL2 = 26; // kolom kedua (digeser bila nama kolom pertama lebih panjang)
const WIDTH = 50;

/**
 * Minuta: blok bergaris tepi; tiap penghadap: label ("Penghadap," / "Pihak
 * Pertama,"), 3 baris kosong, lalu "Tn./Ny. NAMA" (sebutan tidak tebal, nama
 * tebal). Dua penghadap per baris; kolom kedua digeser bila nama kolom pertama
 * lebih panjang dari kolomnya supaya tidak bertabrakan.
 */
export function tandaTanganMinuta(
  penghadap: Person[],
  labels: string[] = [],
  opts: { border?: boolean } = {}
): { lines: Line[]; minLines: number } {
  const border = opts.border ?? true;
  const mk = (segs: Seg[], rowStart = false): Line => ({ segs, col: 0, border, plain: true, rowStart });
  const people = penghadap.length ? penghadap : [{} as Person];
  const lines: Line[] = [];
  let firstRowLen = 0;
  for (let i = 0; i < people.length; i += 2) {
    const pair = people.slice(i, i + 2);
    const start = lines.length;
    const nama = pair.map((p) => ({ sebutan: sebutanSingkat(p), nama: namaLengkap(p) }));
    const lbl = pair.map((_, k) => labels[i + k] || "Penghadap,");
    // Lebar kolom pertama: minimal 24; melebar bila nama/label pertama lebih panjang.
    const w1 = pair.length > 1 ? Math.max(SIG_COL2 - 2, nama[0].sebutan.length + 1 + nama[0].nama.length, lbl[0].length) : WIDTH;
    const col2 = pair.length > 1 ? Math.min(w1 + 2, WIDTH - 10) : WIDTH;
    const w2 = WIDTH - col2;
    const pad = (t: string) => t.padEnd(col2, " ");

    lines.push(mk([{ text: pair.length > 1 ? pad(lbl[0]) + lbl[1] : lbl[0] }], true));
    for (let g = 0; g < SIG_GAP_MINUTA; g++) lines.push(mk([{ text: "" }]));
    const c1 = wrapPlain(nama[0].nama, col2 - 1 - (nama[0].sebutan ? nama[0].sebutan.length + 1 : 0));
    const c2 = pair[1] ? wrapPlain(nama[1].nama, w2 - (nama[1].sebutan ? nama[1].sebutan.length + 1 : 0)) : [];
    const h = Math.max(c1.length, c2.length);
    for (let r = 0; r < h; r++) {
      const segs: Seg[] = [];
      const left1 = c1[r] ?? "";
      const pre1 = r === 0 && nama[0].sebutan ? `${nama[0].sebutan} ` : "";
      segs.push({ text: pre1 });
      segs.push({ text: left1, bold: true });
      if (pair[1]) {
        const used = pre1.length + left1.length;
        segs.push({ text: " ".repeat(Math.max(1, col2 - used)) });
        const pre2 = r === 0 && nama[1].sebutan ? `${nama[1].sebutan} ` : "";
        segs.push({ text: pre2 });
        segs.push({ text: c2[r] ?? "", bold: true });
      }
      lines.push(mk(segs));
    }
    if (i === 0) firstRowLen = lines.length - start;
  }
  // Garis datar menutup blok (garis tepi berakhir di sini).
  lines[lines.length - 1].markBottom = true;
  return { lines, minLines: firstRowLen };
}

/** Salinan: blok bergaris merah tersendiri di kolom tanda tangan (indent 2592 twip = 18 huruf). */
export function tandaTanganSalinan(): { lines: Line[]; minLines: number } {
  const col = 18;
  const mk = (segs: Seg[]): Line => ({ segs, col, border: true, plain: true });
  const block: Line[] = [mk([{ text: NOTARIS.kedudukan + "," }])];
  for (let g = 0; g < SIG_GAP_SALINAN; g++) block.push(mk([{ text: "" }]));
  block.push(mk([{ text: NOTARIS.namaSingkat, bold: true }]));
  block[0].markTop = true;
  block[0].rowStart = true;
  block[block.length - 1].markBottom = true;
  return { lines: [{ segs: [{ text: "" }], col: 0, border: false, plain: true }, ...block], minLines: block.length + 1 };
}

/**
 * Penghadap + pasangannya (persetujuan suami/istri atas harta bersama,
 * Pasal 36 ayat (1) UU Perkawinan). Pasangan menjadi penghadap tersendiri.
 */
/**
 * Pihak yang disetujui oleh pasangan: dicocokkan ke pihak berlawanan jenis
 * (Tuan <-> Nyonya/Nona), utamakan yang alamatnya sama; bila tidak dapat
 * ditentukan, pihak pertama.
 */
export function pasanganDari(pihak: Person[], pasangan: Person): Person | undefined {
  const lawan = str(pasangan.sapaan) === "Tuan" ? ["Nyonya", "Nona"] : str(pasangan.sapaan) ? ["Tuan"] : [];
  const kandidat = pihak.filter((p) => lawan.includes(str(p.sapaan)));
  return kandidat.find((p) => str(p.alamat) && str(p.alamat).toLowerCase() === str(pasangan.alamat).toLowerCase()) ?? kandidat[0] ?? pihak[0];
}

export function denganPasangan(
  pihak: Person[],
  pasangan: Person,
  peranPihak: string
): { p: Person; peran?: string }[] {
  const out: { p: Person; peran?: string }[] = pihak.map((p) => ({ p, peran: peranPihak }));
  if (str(pasangan.nama)) {
    const utama = pasanganDari(pihak, pasangan);
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
