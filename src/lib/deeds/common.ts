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

/** Nama tebal huruf besar, mis. "Tuan **BUDI SANTOSO**". */
export function namaTebal(p: Person): string {
  const nama = str(p.nama).toUpperCase() || "[...]";
  return `${str(p.sapaan) || "Tuan/Nyonya"} **${nama}**`;
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
  return [
    `lahir di ${orBlank(p.tempatLahir)}, pada tanggal ${tanggalHuruf(p.tanggalLahir)}`,
    `Warga Negara ${wn}`,
    orBlank(p.pekerjaan),
    `${tinggal} ${orBlank(p.alamat)}, Rukun Tetangga ${orBlank(p.rt)}, Rukun Warga ${orBlank(p.rw)}, ${orBlank(p.kelurahan)}, Kecamatan ${orBlank(p.kecamatan)}, ${orBlank(p.kota)}`,
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
      text: `Berhadapan dengan saya, **${NOTARIS.namaLengkap}**, ${NOTARIS.kedudukan}, dengan dihadiri oleh saksi-saksi yang saya, Notaris, kenal dan nama-namanya akan disebutkan pada bagian akhir akta ini:`
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

/** Akhir akta (Pasal 38 ayat 4 UUJN). */
export function penutup(data: DeedData, variant: "minuta" | "salinan", opts: { wasiat?: boolean } = {}): Block[] {
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
    // Keterangan "karyawan kantor Notaris" hanya bila pekerjaan kedua saksi memang demikian.
    {
      t: "p",
      text: [s1, s2].every((x) => /notaris/i.test(str(x.pekerjaan)))
        ? "Keduanya karyawan kantor Notaris, sebagai saksi-saksi."
        : "Keduanya sebagai saksi-saksi."
    },
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
            text: "Segera setelah itu akta ini dibacakan oleh saya, Notaris, kepada Pewasiat di hadapan saksi-saksi, dan atas pertanyaan saya, Notaris, Pewasiat menerangkan bahwa apa yang dibacakan itu benar memuat kehendak terakhirnya; maka akta ini ditandatangani oleh Pewasiat, saksi-saksi dan saya, Notaris."
          },
          { t: "p", text: "Segala ketentuan Pasal 938 dan Pasal 939 Kitab Undang-Undang Hukum Perdata telah dipenuhi dalam pembuatan akta wasiat ini." }
        ] as Block[])
      : ([
          {
            t: "p",
            carryStart: true,
            text: "Segera setelah akta ini dibacakan oleh saya, Notaris, kepada {PENGHADAP} dan saksi-saksi, maka akta ini ditandatangani oleh {PENGHADAP}, saksi-saksi dan saya, Notaris."
          }
        ] as Block[])),
    { t: "p", text: "Dilangsungkan dengan tanpa perubahan." },
    { t: "p", text: "Minuta akta ini telah ditandatangani dengan sempurna." }
  ];
  if (variant === "salinan") blocks.push({ t: "p", text: "Diberikan sebagai **SALINAN** yang sama bunyinya." });
  return blocks;
}

// ---------------------------------------------------------------------------
// Blok tanda tangan
// ---------------------------------------------------------------------------

/** Lebar kolom tanda tangan minuta: Penghadap 14 | Saksi 14 | Pejabat 20 (+ spasi pemisah = 50). */
const COL_W = 14;
const COL_LAST = 20;

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
  let firstRowLen = 0;
  for (let i = 0; i < rows; i++) {
    const rowStartAt = lines.length;
    // Celah 4 baris untuk tanda tangan; baris pertama menandai awal satu baris tanda tangan.
    // Banyak penandatangan: celah 3 baris supaya seluruh blok tetap muat satu halaman.
    const gap = rows > 4 ? 3 : 4;
    for (let g = 0; g < gap; g++) lines.push(g === 0 ? { ...plain(""), rowStart: true } : plain(""));
    const cols = [
      penghadap[i] ? wrapPlain(str(penghadap[i].nama).toUpperCase() || "[...]", COL_W) : [""],
      saksi[i] ? wrapPlain(str(saksi[i].nama).toUpperCase() || "[...]", COL_W) : [""],
      i === 0 ? wrapPlain(NOTARIS.namaSingkat, COL_LAST) : [""]
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
    if (i === 0) firstRowLen = lines.length - rowStartAt;
  }
  // Judul kolom + baris tanda tangan pertama wajib satu halaman dengan penutup;
  // bila muat, seluruh blok dipindah bersama alinea terakhir (lihat paginate).
  return { lines, minLines: 2 + firstRowLen };
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
