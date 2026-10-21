/**
 * Tata letak akta gaya mesin tik (lihat skill "akta-notaris-indonesia"):
 *  - setiap baris = satu paragraf; 50 huruf Courier per baris; sisa baris
 *    ditutup garis putus-putus sampai margin kanan;
 *  - garis tepi kiri menempel pada huruf pertama tiap baris (kolom berbeda
 *    untuk butir bernomor);
 *  - tepat 30 baris per halaman; garis datar pendek membuka & menutup tiap
 *    halaman; halaman terakhir ditutup tepat di bawah kalimat terakhir;
 *  - bila kalimat penutup + blok tanda tangan tidak muat, sisa halaman diisi
 *    garis penutup penuh dan keduanya pindah ke halaman berikutnya.
 *
 * Modul ini murni (tanpa import) supaya bisa diuji langsung dengan Node.
 */

export const LINE_WIDTH = 50;
export const LINES_PER_PAGE = 30;
const DASH = "-";

export interface Seg {
  text: string;
  bold?: boolean;
}

export type Block =
  /** Judul akta di tengah tanpa garis tepi (maks. 4 baris; sisanya garis penuh). */
  | { t: "title"; lines: string[] }
  /** Alinea: diawali "-" menempel pada kata pertama. Gunakan **tebal**. */
  | { t: "p"; text: string; noDash?: boolean }
  /** Butir bernomor: kolom nomor 3 huruf; level 0,1,2 menjorok 3 huruf per level. */
  | { t: "item"; marker: string; text: string; level?: number }
  /** Baris di tengah diapit garis putus-putus (mis. "Pasal 1", "DEMIKIAN AKTA INI"). */
  | { t: "center"; text: string; bold?: boolean }
  /** Penanda: blok sesudah ini adalah bagian penutup yang harus satu halaman dengan tanda tangan. */
  | { t: "closingStart" };

export interface Line {
  segs: Seg[];
  /** Kolom (dalam huruf) tempat garis tepi & huruf pertama. */
  col: number;
  border: boolean;
  /** Garis datar pendek di atas / bawah baris ini. */
  markTop?: boolean;
  markBottom?: boolean;
  pageBreakBefore?: boolean;
  /** Baris blok tanda tangan (tanpa isian garis putus-putus). */
  plain?: boolean;
  /** Baris pertama sebuah alinea/butir (untuk memindah kalimat utuh ke halaman berikutnya). */
  paraStart?: boolean;
  /** Awal satu baris tanda tangan (celah + nama) yang tidak boleh terpotong halaman. */
  rowStart?: boolean;
  /** Judul (Pasal, DEMIKIAN AKTA INI, dst.) yang harus satu halaman dengan baris berikutnya. */
  keepNext?: boolean;
}

// ---------------------------------------------------------------------------
// Markup **tebal** -> token kata
// ---------------------------------------------------------------------------

interface Tok {
  text: string;
  bold: boolean;
  /** true = menempel ke kata sebelumnya tanpa spasi (tanda baca setelah teks tebal). */
  glue?: boolean;
}

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  const parts = text.replace(/\s+/g, " ").trim().split(/(\*\*[^*]+\*\*)/g);
  let prevEndedWithSpace = true;
  for (const part of parts) {
    if (!part) continue;
    const bold = part.startsWith("**") && part.endsWith("**");
    const body = bold ? part.slice(2, -2) : part;
    const startsWithSpace = /^\s/.test(body);
    const words = body.split(" ").filter(Boolean);
    words.forEach((w, i) => {
      // Kata pertama sebuah bagian menempel bila tidak ada spasi di antaranya (mis. "**NAMA**,").
      const glue = i === 0 && toks.length > 0 && !startsWithSpace && !prevEndedWithSpace;
      toks.push({ text: w, bold, glue });
    });
    prevEndedWithSpace = /\s$/.test(body);
  }
  return toks;
}

/**
 * Satu "kata" untuk pemenggalan: token yang menempel (glue) digabung ke kata
 * sebelumnya, sehingga tanda baca tidak pernah terpisah ke baris berikutnya.
 */
interface Word {
  parts: Seg[];
  len: number;
}

function toWords(toks: Tok[]): Word[] {
  const words: Word[] = [];
  for (const t of toks) {
    const last = words[words.length - 1];
    if (t.glue && last) {
      last.parts.push({ text: t.text, bold: t.bold });
      last.len += t.text.length;
    } else words.push({ parts: [{ text: t.text, bold: t.bold }], len: t.text.length });
  }
  return words;
}

/** Tambahkan segmen ke baris, menggabungkan segmen bertetangga dengan gaya sama. */
function appendSeg(line: Seg[], seg: Seg) {
  const last = line[line.length - 1];
  if (last && !!last.bold === !!seg.bold) last.text += seg.text;
  else line.push({ text: seg.text, bold: seg.bold });
}

function wrapTokens(toks: Tok[], firstWidth: number, nextWidth: number): Seg[][] {
  const lines: Seg[][] = [];
  let cur: Seg[] = [];
  let len = 0;
  let width = firstWidth;
  const flush = () => {
    lines.push(cur);
    cur = [];
    len = 0;
    width = nextWidth;
  };

  for (const w of toWords(toks)) {
    if (len > 0 && len + 1 + w.len > width) flush();
    if (w.len > width) {
      // Kata lebih panjang dari baris (mis. nomor panjang): potong keras,
      // gaya (tebal/biasa) tiap huruf dipertahankan.
      const chars: Seg[] = w.parts.flatMap((p) => p.text.split("").map((c) => ({ text: c, bold: p.bold })));
      if (len > 0) flush();
      let i = 0;
      while (chars.length - i > width) {
        for (const c of chars.slice(i, i + width)) appendSeg(cur, c);
        flush();
        i += width;
      }
      for (const c of chars.slice(i)) appendSeg(cur, c);
      len = chars.length - i;
      continue;
    }
    if (len > 0) {
      appendSeg(cur, { text: " ", bold: w.parts[0].bold && !!cur[cur.length - 1]?.bold });
      len += 1;
    }
    for (const p of w.parts) appendSeg(cur, p);
    len += w.len;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function segLen(segs: Seg[]): number {
  return segs.reduce((n, s) => n + s.text.length, 0);
}

/** Tutup sisa baris dengan garis putus-putus sampai lebar baris. */
export function fillRight(segs: Seg[], width: number): Seg[] {
  const rest = width - segLen(segs);
  return rest > 0 ? [...segs, { text: DASH.repeat(rest) }] : segs;
}

function centered(text: string, bold: boolean, width: number): Seg[] {
  const t = text.trim();
  const rest = Math.max(0, width - t.length);
  const left = Math.floor(rest / 2);
  return [{ text: DASH.repeat(left) }, { text: t, bold }, { text: DASH.repeat(rest - left) }];
}

// ---------------------------------------------------------------------------
// Blok -> baris
// ---------------------------------------------------------------------------

export function blocksToLines(blocks: Block[]): { title: Line[]; body: Line[]; closingIndex: number } {
  const title: Line[] = [];
  const body: Line[] = [];
  let closingIndex = -1;

  for (const b of blocks) {
    if (b.t === "closingStart") {
      closingIndex = body.length;
      continue;
    }
    if (b.t === "title") {
      for (const l of b.lines.slice(0, 4)) {
        for (const segs of wrapTokens(tokenize(l), LINE_WIDTH - 2, LINE_WIDTH - 2)) {
          const text = segs.map((s) => s.text).join("");
          // Nama akta tebal; baris "Nomor : ..." huruf biasa.
          title.push({ segs: centered(text, !/^nomor\b/i.test(text.trim()), LINE_WIDTH), col: 0, border: false });
        }
      }
      continue;
    }
    if (b.t === "center") {
      // Baris tengah panjang (mis. nama PT) dipenggal; minimal 1 garis di kiri-kanan.
      wrapTokens(tokenize(b.text), LINE_WIDTH - 2, LINE_WIDTH - 2).forEach((segs, i) => {
        body.push({
          segs: centered(segs.map((x) => x.text).join(""), b.bold ?? false, LINE_WIDTH),
          col: 0,
          border: true,
          paraStart: i === 0,
          keepNext: true
        });
      });
      continue;
    }
    if (b.t === "p") {
      const toks = tokenize(b.text);
      // Tanda "-" pembuka alinea selalu huruf biasa, menempel pada kata pertama.
      if (!b.noDash && toks.length) toks.unshift({ text: DASH, bold: false }, { ...toks.shift()!, glue: true });
      wrapTokens(toks, LINE_WIDTH, LINE_WIDTH).forEach((segs, i) => {
        body.push({ segs: fillRight(segs, LINE_WIDTH), col: 0, border: true, paraStart: i === 0 });
      });
      continue;
    }
    if (b.t === "item") {
      const level = b.level ?? 0;
      const col = level * 3;
      const marker = b.marker.padEnd(3, " ");
      const textCol = col + 3;
      if (!b.marker.trim()) {
        // Lanjutan butir tanpa nomor: seluruh baris di kolom teks, garis tepi menempel.
        wrapTokens(tokenize(b.text), LINE_WIDTH - textCol, LINE_WIDTH - textCol).forEach((segs, i) => {
          body.push({ segs: fillRight(segs, LINE_WIDTH - textCol), col: textCol, border: true, paraStart: i === 0 });
        });
        continue;
      }
      const wrapped = wrapTokens(tokenize(b.text), LINE_WIDTH - textCol, LINE_WIDTH - textCol);
      wrapped.forEach((segs, i) => {
        if (i === 0) body.push({ segs: fillRight([{ text: marker }, ...segs], LINE_WIDTH - col), col, border: true, paraStart: true });
        else body.push({ segs: fillRight(segs, LINE_WIDTH - textCol), col: textCol, border: true });
      });
    }
  }

  // Judul selalu 4 baris; kekurangan diisi garis penuh.
  while (title.length < 4) title.push({ segs: [{ text: DASH.repeat(LINE_WIDTH) }], col: 0, border: false });
  return { title: title.slice(0, Math.max(4, title.length)), body, closingIndex };
}

/** Baris garis penuh (pengisi sisa halaman). */
function fullDashLine(): Line {
  return { segs: [{ text: DASH.repeat(LINE_WIDTH) }], col: 0, border: true };
}

/**
 * Susun halaman: judul + badan akta + blok tanda tangan.
 * `minSigLines` = jumlah baris blok tanda tangan yang wajib satu halaman
 * dengan kalimat penutup.
 */
export function paginate(
  title: Line[],
  body: Line[],
  closingIndex: number,
  sig: Line[],
  minSigLines: number
): Line[] {
  const out: Line[] = [...title];
  let lineOnPage = title.length;
  let firstOfPage = true;
  const closingAt = closingIndex >= 0 ? closingIndex : body.length;
  const closingLen = body.length - closingAt;

  const pushBody = (l: Line) => {
    if (lineOnPage === LINES_PER_PAGE) {
      out[out.length - 1].markBottom = true;
      lineOnPage = 0;
      firstOfPage = true;
    }
    const line = { ...l };
    if (firstOfPage) {
      line.markTop = true;
      if (out.length > 0 && lineOnPage === 0) line.pageBreakBefore = true;
      firstOfPage = false;
    }
    out.push(line);
    lineOnPage++;
  };

  body.forEach((l, i) => {
    // Judul tidak boleh menjadi baris terakhir halaman: judul-judul berurutan
    // + minimal satu baris isi harus satu halaman.
    if (l.keepNext && (i === 0 || !body[i - 1].keepNext)) {
      let k = 0;
      while (i + k < body.length && body[i + k].keepNext) k++;
      const need = Math.min(k + 1, body.length - i);
      if (lineOnPage < LINES_PER_PAGE && LINES_PER_PAGE - lineOnPage < need && need < LINES_PER_PAGE) {
        while (lineOnPage < LINES_PER_PAGE) pushBody(fullDashLine());
      }
    }
    if (i === closingAt && closingLen > 0) {
      // Kalimat penutup + awal blok tanda tangan harus satu halaman.
      const room = LINES_PER_PAGE - lineOnPage;
      const need = closingLen + 1 + Math.min(minSigLines, sig.length);
      if (need <= LINES_PER_PAGE && room < need) {
        while (lineOnPage < LINES_PER_PAGE) pushBody(fullDashLine());
      }
    }
    pushBody(l);
  });

  // Blok tanda tangan tidak muat di sisa halaman: pindahkan alinea terakhir
  // UTUH (bukan potongan kalimat) bersama blok ke halaman berikutnya, lalu
  // sisa halaman sekarang ditutup garis penuh. Bila seluruh blok + alinea
  // muat dalam satu halaman, keduanya dipindah bersama.
  const room = LINES_PER_PAGE - lineOnPage;
  let carry = 1;
  while (carry < lineOnPage && !out[out.length - carry].paraStart) carry++;
  const keep = sig.length + carry <= LINES_PER_PAGE ? sig.length : Math.min(minSigLines, sig.length);
  if (room < Math.min(sig.length, keep) && keep + carry <= LINES_PER_PAGE && lineOnPage > carry) {
    const carried = out.splice(out.length - carry, carry).map((l) => ({ ...l, markTop: false, markBottom: false, pageBreakBefore: false }));
    lineOnPage -= carry;
    while (lineOnPage < LINES_PER_PAGE) pushBody(fullDashLine());
    carried.forEach(pushBody);
  }
  out[out.length - 1].markBottom = true;

  // Blok tanda tangan mengalir setelah badan akta; satu baris tanda tangan
  // (celah meterai + nama) tidak pernah terpotong ke halaman berikutnya.
  for (let i = 0; i < sig.length; i++) {
    const s = sig[i];
    if (s.rowStart) {
      let rowLen = 1;
      while (i + rowLen < sig.length && !sig[i + rowLen].rowStart) rowLen++;
      if (lineOnPage + rowLen > LINES_PER_PAGE && rowLen <= LINES_PER_PAGE) lineOnPage = LINES_PER_PAGE;
    }
    if (lineOnPage >= LINES_PER_PAGE) {
      lineOnPage = 0;
      out.push({ ...s, pageBreakBefore: true });
    } else out.push(s);
    lineOnPage++;
  }
  return out;
}
