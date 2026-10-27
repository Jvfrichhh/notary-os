import { BONUM } from "./bonumMetrics";
import { solidPng, zip } from "./zip";

/**
 * Akta PPAT (AJB, Hibah) dengan TEMPLAT AJB KANTOR -- bukan format akta notaris
 * (skill "ppjb-kuasa-menjual-ari-yudani", bagian AKTA JUAL BELI, model yang
 * disetujui 27-10-2026):
 *  - A4 11907 x 16840; margin kiri 2126, kanan 907, atas 964, bawah 1191;
 *    Bookman Old Style 12; spasi eksak 587 twip (24 baris/halaman); isi
 *    menjorok kiri 1701, rata kiri;
 *  - kop PPAT di halaman 1, judul, "Nomor : [...] / tahun", label lembar miring;
 *  - satu paragraf = satu baris (dibungkus sendiri dengan metrik TeX Gyre Bonum
 *    +5%, sisa minimal 300 twip untuk strip); tiap baris ditutup tab kanan
 *    ber-leader hyphen di 8874;
 *  - butir: baris pertama menggantung 426 (label + tab); baris letak
 *    (Provinsi/Kota/...) kolom label-titik dua-nilai;
 *  - garis tepi kiri sz 12 space 4: hitam (Lembar Pertama/Kedua), merah
 *    (Lembar Salinan), mengikuti indent (left - hanging) membentuk tangga;
 *  - stub (garis datar 2 cm x 1,5 pt) di atas baris pertama & di bawah baris
 *    terakhir tiap halaman, dari x garis tepi baris itu; halaman 1 mulai di
 *    atas "-Pada hari ini"; baris penutup mendapat stub akhir;
 *  - footer templat: "Akta Jual Beli / ARI YUDANI APRIANTI, S.H., M.Kn. /
 *    Daerah Kerja Kota Bogor." kiri, "Halaman x dari y Halaman" kanan;
 *  - tabel tanda tangan tanpa garis; Lembar Salinan ditutup "Akta ini telah
 *    ditandatangani dengan sempurna ... PPAT Kota Bogor - ttd";
 *  - Lembar Pertama: section tambahan "Lembar Cap Ibu Jari".
 */

export type PpatVariant = "lembar-pertama" | "lembar-kedua" | "lembar-salinan";
export const PPAT_VARIANT_LABEL: Record<PpatVariant, string> = {
  "lembar-pertama": "Lembar Pertama",
  "lembar-kedua": "Lembar Kedua",
  "lembar-salinan": "Lembar Salinan"
};

export type PBlock =
  /** Alinea "-...", indent 0 (relatif indent isi 1701). */
  | { t: "p"; text: string; noDash?: boolean; carryStart?: boolean }
  /** Butir "1." / "a." / "-": baris pertama menggantung 426 per level. */
  | { t: "item"; marker: string; text: string; level?: number }
  /** Baris di tengah diapit strip (PIHAK PERTAMA, Pasal 1). */
  | { t: "center"; text: string; bold?: boolean }
  /** Baris "Provinsi : Jawa Barat;" -- label, titik dua, nilai berkolom. */
  | { t: "kv"; label: string; value: string; level?: number }
  | { t: "closingStart" };

// ---------------------------------------------------------------------------
// Ukuran
// ---------------------------------------------------------------------------
const PAGE_W = 11907;
const PAGE_H = 16840;
const MARGIN = { top: 964, right: 907, bottom: 1191, left: 2126 };
const BODY_IND = 1701; // indent isi relatif margin kiri
const RIGHT_TAB = 8874; // = lebar teks (11907 - 2126 - 907)
const LINE = 587;
const LINES_PER_PAGE = 24;
const STRIP_MIN = 300;
const HANG = 426;
const KV_LABEL_W = 1900; // kolom nilai pada baris letak (label terpanjang "Kecamatan")
const EMU = 635;
const STUB_LEN_EMU = 1134 * EMU; // 2 cm
const STUB_THICK_EMU = 19050; // 1,5 pt
const FONT = "Bookman Old Style";

// eslint-disable-next-line no-control-regex
const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// Metrik huruf & pembungkus baris
// ---------------------------------------------------------------------------
interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Lebar teks (twip) pada 12 pt, dinaikkan 5% untuk selisih Bookman asli vs klon. */
function width(text: string, bold = false): number {
  const tbl = BONUM[bold ? "b" : "r"];
  let adv = 0;
  for (const ch of text) adv += tbl[ch] ?? tbl["n"] ?? 600;
  return (adv * 12 * 20 * 1.05) / 1000;
}

interface Tok {
  text: string;
  bold: boolean;
  glue?: boolean;
}

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  // " :" tidak boleh terpisah dari kata sebelumnya.
  const parts = text.replace(/\s+/g, " ").replace(/ :/g, "\u00a0:").trim().split(/(\*\*[^*]+\*\*)/g);
  let prevEndedWithSpace = true;
  for (const part of parts) {
    if (!part) continue;
    const bold = part.startsWith("**") && part.endsWith("**");
    const body = bold ? part.slice(2, -2) : part;
    const startsWithSpace = /^\s/.test(body);
    body.split(" ").filter(Boolean).forEach((w, i) => {
      toks.push({ text: w, bold, glue: i === 0 && toks.length > 0 && !startsWithSpace && !prevEndedWithSpace });
    });
    prevEndedWithSpace = /\s$/.test(body);
  }
  return toks;
}

interface Word {
  parts: Run[];
  w: number;
}

function toWords(toks: Tok[]): Word[] {
  const words: Word[] = [];
  for (const t of toks) {
    const last = words[words.length - 1];
    const w = width(t.text, t.bold);
    if (t.glue && last) {
      last.parts.push({ text: t.text, bold: t.bold });
      last.w += w;
    } else words.push({ parts: [{ text: t.text, bold: t.bold }], w });
  }
  return words;
}

function push(line: Run[], r: Run) {
  const last = line[line.length - 1];
  if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) last.text += r.text;
  else line.push({ ...r });
}

/** Bungkus teks menjadi baris-baris selebar `firstW` lalu `nextW` (twip). */
function wrap(text: string, firstW: number, nextW: number): Run[][] {
  const lines: Run[][] = [];
  let cur: Run[] = [];
  let used = 0;
  let avail = firstW;
  const space = width(" ");
  const flush = () => {
    lines.push(cur);
    cur = [];
    used = 0;
    avail = nextW;
  };
  for (const w of toWords(tokenize(text))) {
    if (used > 0 && used + space + w.w > avail) flush();
    if (w.w > avail && used === 0) {
      // Kata terlalu panjang (nomor panjang): potong keras per huruf.
      for (const p of w.parts) {
        for (const ch of p.text) {
          const cw = width(ch, p.bold);
          if (used + cw > avail && used > 0) flush();
          push(cur, { text: ch, bold: p.bold });
          used += cw;
        }
      }
      continue;
    }
    if (used > 0) {
      push(cur, { text: " ", bold: w.parts[0].bold && !!cur[cur.length - 1]?.bold });
      used += space;
    }
    for (const p of w.parts) push(cur, p);
    used += w.w;
  }
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [[]];
}

// ---------------------------------------------------------------------------
// Baris isi
// ---------------------------------------------------------------------------
export interface PLine {
  runs: Run[];
  /** Indent kiri relatif indent isi (twip). */
  left: number;
  hanging: number;
  center?: boolean;
  /** Tab stop tambahan (posisi relatif margin kiri). */
  tabs?: number[];
  paraStart?: boolean;
  carryStart?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  stubTop?: boolean;
  stubBottom?: boolean;
}

const availW = (left: number) => RIGHT_TAB - BODY_IND - left - STRIP_MIN;

export function blocksToLines(blocks: PBlock[]): { body: PLine[]; closingIndex: number } {
  const body: PLine[] = [];
  let closingIndex = -1;
  for (const b of blocks) {
    if (b.t === "closingStart") {
      closingIndex = body.length;
      continue;
    }
    if (b.t === "center") {
      body.push({ runs: [{ text: b.text.trim(), bold: b.bold ?? true }], left: 0, hanging: 0, center: true, paraStart: true, keepNext: true });
      continue;
    }
    if (b.t === "p") {
      const text = b.noDash ? b.text : `-${b.text.trim()}`;
      wrap(text, availW(0), availW(0)).forEach((runs, i) => body.push({ runs, left: 0, hanging: 0, paraStart: i === 0, carryStart: i === 0 && !!b.carryStart }));
      continue;
    }
    if (b.t === "item") {
      const level = b.level ?? 0;
      const left = HANG * (level + 1);
      const lines = wrap(b.text, availW(left), availW(left));
      lines.forEach((runs, i) => {
        if (i === 0) body.push({ runs: [{ text: b.marker }, { text: "\t" }, ...runs], left, hanging: HANG, paraStart: true });
        else body.push({ runs, left, hanging: 0 });
      });
      continue;
    }
    if (b.t === "kv") {
      const level = b.level ?? 0;
      const base = HANG * (level + 1); // sejajar teks butir di level itu
      const left = base + KV_LABEL_W;
      const colon = base + KV_LABEL_W - 400;
      const tabs = [BODY_IND + colon, BODY_IND + left];
      const lines = wrap(b.value, availW(left), availW(left));
      lines.forEach((runs, i) => {
        if (i === 0) body.push({ runs: [{ text: b.label }, { text: "\t:\t" }, ...runs], left, hanging: KV_LABEL_W, tabs, paraStart: true });
        else body.push({ runs: [{ text: "\t\t" }, ...runs], left, hanging: KV_LABEL_W, tabs });
      });
    }
  }
  return { body, closingIndex };
}

/**
 * Susun halaman: `firstPageLines` = kapasitas baris isi di halaman 1 (sisa
 * setelah kop & judul). Stub atas/bawah ditandai pada baris pertama/terakhir
 * tiap halaman; blok penutup (sejak closingStart) tidak dipisah dari baris
 * terakhirnya lebih dari perlu; tabel tanda tangan (sigLines baris) harus
 * utuh satu halaman -- bila tidak muat, ia mulai di halaman baru.
 */
export function paginate(body: PLine[], closingIndex: number, firstPageLines: number, sigLines: number): { lines: PLine[]; sigOnNewPage: boolean; pages: number } {
  const out: PLine[] = [];
  let cap = firstPageLines;
  let n = 0;
  let pages = 1;
  const pushLine = (l: PLine) => {
    if (n === cap) {
      out[out.length - 1].stubBottom = true;
      cap = LINES_PER_PAGE;
      n = 0;
      pages++;
    }
    const line = { ...l };
    if (n === 0) {
      line.stubTop = true;
      if (out.length) line.pageBreakBefore = true;
    }
    out.push(line);
    n++;
  };
  body.forEach((l, i) => {
    // Judul (Pasal, PIHAK ...) tidak boleh jadi baris terakhir halaman.
    if (l.keepNext && n === cap - 1 && cap > 1) {
      // dorong ke halaman berikutnya dengan baris kosong ber-strip
      pushLine({ runs: [], left: 0, hanging: 0 });
    }
    void i;
    pushLine(l);
  });
  out[out.length - 1].stubBottom = true;
  const room = cap - n;
  return { lines: out, sigOnNewPage: room < sigLines, pages: room < sigLines ? pages + 1 : pages };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------
const rPr = (r: Run, size?: number, extra = "") =>
  `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${r.bold ? "<w:b/>" : ""}${r.italic ? "<w:i/>" : ""}${extra}${size ? `<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>` : ""}</w:rPr>`;

function run(r: Run, size?: number, extra = ""): string {
  // "\t" di dalam teks -> elemen tab
  return r.text
    .split("\t")
    .map((part, i) => `${i > 0 ? `<w:r>${rPr(r, size, extra)}<w:tab/></w:r>` : ""}${part ? `<w:r>${rPr(r, size, extra)}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>` : ""}`)
    .join("");
}

function stub(id: number, xTwip: number, yTwip: number): string {
  const x = xTwip * EMU;
  const y = yTwip * EMU;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${STUB_LEN_EMU}" cy="${STUB_THICK_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Garis ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="garis.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdGaris"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${STUB_LEN_EMU}" cy="${STUB_THICK_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

function bodyParagraph(l: PLine, color: string, nextId: () => number): string {
  const left = BODY_IND + l.left;
  const tabs = [
    ...(l.tabs ?? []).map((t) => `<w:tab w:val="left" w:pos="${t}"/>`),
    l.center ? `<w:tab w:val="center" w:leader="hyphen" w:pos="${Math.round((BODY_IND + RIGHT_TAB) / 2)}"/>` : "",
    `<w:tab w:val="right" w:leader="hyphen" w:pos="${RIGHT_TAB}"/>`
  ].join("");
  const ppr =
    `${l.pageBreakBefore ? "<w:pageBreakBefore/>" : ""}<w:widowControl w:val="0"/>${l.keepNext ? "<w:keepNext/>" : ""}<w:tabs>${tabs}</w:tabs>` +
    `<w:spacing w:before="0" w:after="0" w:line="${LINE}" w:lineRule="exact"/>` +
    `<w:ind w:left="${left}"${l.hanging ? ` w:hanging="${l.hanging}"` : ""}/>` +
    `<w:pBdr><w:left w:val="single" w:sz="12" w:space="4" w:color="${color}"/></w:pBdr><w:jc w:val="left"/>`;
  const stubX = MARGIN.left + left - l.hanging - 80 - 15;
  const stubs = (l.stubTop ? stub(nextId(), stubX, -10) : "") + (l.stubBottom ? stub(nextId(), stubX, LINE - 10) : "");
  const runs = l.runs.map((r) => run(r)).join("");
  const content = l.center ? `<w:r><w:tab/></w:r>${runs}<w:r><w:tab/></w:r>` : `${runs}<w:r><w:tab/></w:r>`;
  return `<w:p><w:pPr>${ppr}</w:pPr>${stubs}${content}</w:p>`;
}

/** Paragraf bebas (kop, judul, tabel): spasi eksak `line` twip. */
function P(runs: string, opts: { align?: "left" | "center" | "right"; line?: number; ind?: number; border?: "bottom"; keepNext?: boolean } = {}): string {
  const bdr = opts.border === "bottom" ? '<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="1" w:color="000000"/></w:pBdr>' : "";
  return `<w:p><w:pPr>${opts.keepNext ? "<w:keepNext/>" : ""}${bdr}<w:spacing w:before="0" w:after="0" w:line="${opts.line ?? LINE}" w:lineRule="exact"/>${opts.ind !== undefined ? `<w:ind w:left="${opts.ind}"/>` : ""}<w:jc w:val="${opts.align ?? "left"}"/></w:pPr>${runs}</w:p>`;
}

export interface PpatHeading {
  /** Mis. "AKTA JUAL BELI". */
  title: string;
  /** Nomor akta tanpa tahun, mis. "12" -> "Nomor : 12 / 2026". */
  nomor: string;
  tahun: string;
}

export interface PpatOffice {
  nama: string; // ARI YUDANI APRIANTI, S.H., M.Kn.
  skNomor: string;
  skTanggalLabel: string; // "17 JANUARI 2024"
  alamat1: string;
  alamat2: string;
  alamat3: string;
  telepon: string;
  email: string;
  daerahKerja: string; // Kota Bogor
}

/** Kop PPAT + judul: total tinggi 13 baris grid (lihat firstPageLines). */
export const HEADING_LINES = 13;

function heading(h: PpatHeading, office: PpatOffice, variant: PpatVariant): string {
  const big = (t: string) => run({ text: t, bold: true }, 16);
  const small = (t: string) => run({ text: t }, 11);
  const half = Math.floor(LINE / 2); // 293 / 294
  return [
    P(big("PEJABAT PEMBUAT AKTA TANAH"), { align: "center" }),
    P(big("(PPAT)"), { align: "center" }),
    P(big(office.nama), { align: "center" }),
    P(small("SURAT KEPUTUSAN MENTERI AGRARIA DAN TATA RUANG/"), { align: "center", line: half }),
    P(small("BADAN PERTANAHAN NASIONAL"), { align: "center", line: LINE - half }),
    P(small(`NOMOR : ${office.skNomor}`), { align: "center", line: half }),
    P(small(`TANGGAL ${office.skTanggalLabel}`), { align: "center", line: LINE - half }),
    P(small(`Alamat Kantor : ${office.alamat1}`), { align: "center", line: half }),
    P(small(office.alamat2), { align: "center", line: LINE - half }),
    P(small(office.alamat3), { align: "center", line: half }),
    P(small(`Telp. ${office.telepon}, Email : `) + run({ text: office.email }, 11, '<w:u w:val="single"/>'), { align: "center", line: LINE - half, border: "bottom" }),
    P("", {}),
    P(run({ text: h.title, bold: true }, 14), { align: "center" }),
    P(run({ text: `Nomor : ${h.nomor} / ${h.tahun}` }), { align: "center" }),
    P("", {}),
    P(run({ text: PPAT_VARIANT_LABEL[variant], italic: true }), { align: "center" }),
    P("", {})
  ].join("");
}

export interface PpatSigner {
  sebutan: string; // "Tn." / "Ny."
  nama: string;
}
export interface PpatSignature {
  pihakPertama: PpatSigner[];
  pihakKedua: PpatSigner[];
  persetujuan: PpatSigner[]; // istri/suami yang memberi persetujuan
  saksi: [PpatSigner, PpatSigner];
}

function signatureTable(sig: PpatSignature, variant: PpatVariant, office: PpatOffice, pageBreak: boolean): string {
  const colW = Math.round(RIGHT_TAB / 2);
  const cell = (paras: string[]) => `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>${paras.length ? paras.join("") : "<w:p/>"}</w:tc>`;
  // keepNext pada semua baris kecuali terakhir: tabel tidak terpecah ke dua halaman.
  const row = (a: string[], b: string[], last = false) => {
    const kn = (ps: string[]) => (last ? ps : ps.map((x) => x.replace("<w:p><w:pPr>", "<w:p><w:pPr><w:keepNext/>")));
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(kn(a))}${cell(kn(b))}</w:tr>`;
  };
  const c = (t: string, bold = false) => P(run({ text: t, bold }), { align: "center" });
  const name = (s: PpatSigner) => P(run({ text: s.sebutan ? `${s.sebutan} ` : "" }) + run({ text: s.nama, bold: true }), { align: "center" });
  const blank = P("", {});
  const group = (labelA: string, a: PpatSigner[], labelB: string, b: PpatSigner[]) =>
    row([c(labelA), blank, ...a.map(name)], [...(labelB ? [c(labelB), blank] : []), ...b.map(name)]);

  const rows: string[] = [group("Pihak Pertama", sig.pihakPertama, "Pihak Kedua", sig.pihakKedua)];
  if (sig.persetujuan.length) rows.push(group("Persetujuan Istri", sig.persetujuan, "", []));
  rows.push(group("Saksi", [sig.saksi[0]], "Saksi", [sig.saksi[1]]));
  const ppatName = P(run({ text: office.nama, bold: true }, 11, '<w:u w:val="single"/>'), { align: "center" });
  const ppatBlock = [c("Pejabat Pembuat Akta Tanah"), blank, blank, ppatName];
  if (variant === "lembar-salinan") {
    rows.push(
      row(
        [
          P(run({ text: "Akta ini telah ditandatangani dengan sempurna." })),
          P(run({ text: "Diberikan sebagai salinan yang sama bunyinya." })),
          c(`PPAT ${office.daerahKerja}`, true),
          blank,
          c("ttd"),
          blank,
          ppatName
        ],
        ppatBlock,
        true
      )
    );
  } else rows.push(row([], ppatBlock, true));

  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="${colW * 2}" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${colW}"/><w:gridCol w:w="${colW}"/></w:tblGrid>${rows.join("")}</w:tbl>`;
  // Paragraf kosong pemisah (dengan page break bila tabel harus di halaman baru).
  return `<w:p><w:pPr>${pageBreak ? "<w:pageBreakBefore/>" : ""}<w:keepNext/><w:spacing w:before="0" w:after="0" w:line="${LINE}" w:lineRule="exact"/></w:pPr></w:p>${tbl}`;
}

/** Perkiraan tinggi tabel tanda tangan dalam baris grid (nama panjang membungkus 2 baris). */
export function signatureLines(sig: PpatSignature, variant: PpatVariant): number {
  const colW = Math.round(RIGHT_TAB / 2) - 120;
  const nl = (s: PpatSigner) => (width(`${s.sebutan} `) + width(s.nama, true) > colW ? 2 : 1);
  const sum = (a: PpatSigner[]) => a.reduce((n, s) => n + nl(s), 0);
  const g = (a: PpatSigner[], b: PpatSigner[]) => 2 + Math.max(sum(a), sum(b), 1);
  return 1 + g(sig.pihakPertama, sig.pihakKedua) + (sig.persetujuan.length ? g(sig.persetujuan, []) : 0) + g([sig.saksi[0]], [sig.saksi[1]]) + (variant === "lembar-salinan" ? 7 : 4);
}

export interface ThumbSheet {
  judulAkta: string;
  nomor: string;
  tanggal: string;
  rows: { sebutan: string; nama: string; kedudukan: string }[];
}

function thumbSheet(t: ThumbSheet, office: PpatOffice): string {
  const widths = [600, 3800, 2300, 2174];
  const bord = ["top", "left", "bottom", "right"].map((s) => `<w:${s} w:val="single" w:sz="8" w:space="0" w:color="000000"/>`).join("");
  const cell = (w: number, paras: string[], h?: number) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${bord}</w:tcBorders>${h ? "" : ""}</w:tcPr>${paras.join("") || "<w:p/>"}</w:tc>`;
  const c = (txt: string, bold = false) => P(run({ text: txt, bold }, 11), { align: "center", line: 300 });
  const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell(widths[0], [c("No.", true)])}${cell(widths[1], [c("Nama", true)])}${cell(widths[2], [c("Kedudukan", true)])}${cell(widths[3], [c("Ibu Jari Kanan", true)])}</w:tr>`;
  const rows = t.rows
    .map(
      (r, i) =>
        `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="1900" w:hRule="exact"/></w:trPr>${cell(widths[0], [c(String(i + 1))])}${cell(widths[1], [P(run({ text: r.sebutan ? `${r.sebutan} ` : "" }, 11) + run({ text: r.nama, bold: true }, 11), { line: 300 })])}${cell(widths[2], [c(r.kedudukan)])}${cell(widths[3], ["<w:p/>"])}</w:tr>`
    )
    .join("");
  return [
    P(run({ text: "LEMBAR CAP IBU JARI", bold: true }, 13), { align: "center", line: 400 }),
    P(run({ text: `${t.judulAkta} Nomor : ${t.nomor}, tanggal ${t.tanggal}` }, 11), { align: "center", line: 300 }),
    P(run({ text: `Pejabat Pembuat Akta Tanah ${office.nama}, Daerah Kerja ${office.daerahKerja}` }, 11), { align: "center", line: 300 }),
    P("", { line: 300 }),
    P(
      run(
        {
          text: "Cap ibu jari tangan kanan para penghadap di bawah ini dibubuhkan pada lembar tersendiri ini yang dilekatkan pada Lembar Pertama akta tersebut di atas."
        },
        11
      ),
      { line: 300 }
    ),
    P("", { line: 300 }),
    `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${head}${rows}</w:tbl>`
  ].join("");
}

function footerXml(title: string, office: PpatOffice, totalField: "NUMPAGES" | "SECTIONPAGES"): string {
  const f = (t: string, bold = true) => run({ text: t, bold }, 9);
  const fld = (instr: string) =>
    `<w:r>${rPr({ text: "" }, 9)}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rPr({ text: "" }, 9)}<w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r>${rPr({ text: "" }, 9)}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rPr({ text: "1" }, 9)}<w:t>1</w:t></w:r><w:r>${rPr({ text: "" }, 9)}<w:fldChar w:fldCharType="end"/></w:r>`;
  const p1 = `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="4" w:color="000000"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB}"/></w:tabs><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${f(title)}<w:r><w:tab/></w:r>${f("Halaman ", false)}${fld("PAGE")}${f(" dari ", false)}${fld(totalField)}${f(" Halaman", false)}</w:p>`;
  const p = (t: string) => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${f(t)}</w:p>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS}>${p1}${p(office.nama)}${p(`Daerah Kerja ${office.daerahKerja}.`)}</w:ftr>`;
}

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

function sectPr(footer: boolean): string {
  const f = footer ? '<w:footerReference w:type="default" r:id="rIdFtr"/>' : '<w:footerReference w:type="default" r:id="rIdFtrEmpty"/>';
  return `<w:sectPr>${f}<w:type w:val="nextPage"/><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN.top}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:type="default" w:linePitch="${LINE}"/></w:sectPr>`;
}

export function buildPpatDocx(input: {
  variant: PpatVariant;
  heading: PpatHeading;
  office: PpatOffice;
  blocks: PBlock[];
  signature: PpatSignature;
  thumbSheet?: ThumbSheet;
  notes?: string[];
}): { buffer: Buffer; pages: number } {
  const color = input.variant === "lembar-salinan" ? "FF0000" : "000000";
  const { body, closingIndex } = blocksToLines(input.blocks);
  const sigLines = signatureLines(input.signature, input.variant);
  const { lines, sigOnNewPage, pages } = paginate(body, closingIndex, LINES_PER_PAGE - HEADING_LINES, sigLines);
  let id = 100;
  const nextId = () => ++id;

  const akta =
    heading(input.heading, input.office, input.variant) +
    lines.map((l) => bodyParagraph(l, color, nextId)).join("") +
    signatureTable(input.signature, input.variant, input.office, sigOnNewPage);

  const extra: string[] = [];
  if (input.thumbSheet) extra.push(thumbSheet(input.thumbSheet, input.office));
  if (input.notes?.length) {
    const np = (t: string, bold = false, pb = false) =>
      `<w:p><w:pPr>${pb ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
    extra.push(np("CATATAN PENYUSUNAN (bukan bagian akta; hapus halaman ini sebelum dicetak)", true, !!input.thumbSheet), ...input.notes.map((n) => np(n)));
  }
  const bodyXml = extra.length
    ? `${akta}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sectPr(true)}</w:pPr></w:p>${extra.join("")}${sectPr(false)}`
    : akta + sectPr(true);

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${bodyXml}</w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:updateFields w:val="true"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="${R}/settings" Target="settings.xml"/><Relationship Id="rIdGaris" Type="${R}/image" Target="media/garis.png"/><Relationship Id="rIdFtr" Type="${R}/footer" Target="footer1.xml"/><Relationship Id="rIdFtrEmpty" Type="${R}/footer" Target="footer2.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(input.heading.title)}</dc:title><dc:creator>Nexora</dc:creator></cp:coreProperties>`;
  const png = solidPng(40, 2, input.variant === "lembar-salinan" ? [255, 0, 0] : [0, 0, 0]);
  const emptyFtr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS}><w:p/></w:ftr>`;

  return {
    buffer: zip([
      { name: "[Content_Types].xml", data: contentTypes },
      { name: "_rels/.rels", data: rels },
      { name: "word/document.xml", data: document },
      { name: "word/styles.xml", data: styles },
      { name: "word/settings.xml", data: settings },
      { name: "word/footer1.xml", data: footerXml(titleCase(input.heading.title), input.office, extra.length ? "SECTIONPAGES" : "NUMPAGES") },
      { name: "word/footer2.xml", data: emptyFtr },
      { name: "word/_rels/document.xml.rels", data: docRels },
      { name: "word/media/garis.png", data: png },
      { name: "docProps/core.xml", data: core }
    ]),
    pages
  };
}

/** "AKTA JUAL BELI" -> "Akta Jual Beli" (footer). */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
