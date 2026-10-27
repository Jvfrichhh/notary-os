import { solidPng, zip } from "./zip";
import type { Line } from "./layout";

/**
 * Tulis baris-baris akta ke file .docx sesuai standar kantor (skill
 * "akta-standar-kantor-ari-yudani", model PT Branjangan):
 *  - F4 12189 x 18709 twip; margin kiri 3969, kanan 850, atas 1134, bawah 1680;
 *    Courier New 12 pt; spasi eksak 529 twip = 30 baris/halaman;
 *  - setiap baris = satu paragraf rata kiri-kanan; sisa baris ditutup strip dari
 *    tab kanan 7370 ber-leader hyphen (BUKAN strip diketik), judul di tengah
 *    diapit strip (tab tengah + tab kanan ber-leader);
 *  - garis tepi kiri menempel pada indent paragraf (baris nomor: indent gantung);
 *    hitam (minuta), merah (salinan);
 *  - garis datar pendek (2 cm x 1,5 pt) di atas baris pertama & di bawah baris
 *    terakhir tiap halaman, menempel pada paragraf baris itu dan berangkat dari
 *    garis tepinya (ikut jorokan) -- sama dengan templat AJB kantor; halaman 1
 *    mulai di atas "-Pada hari ini"; garis juga tepat di bawah kalimat terakhir
 *    dan pada blok tanda tangan; nomor halaman di tengah footer;
 *  - Minuta: section tersendiri untuk LEMBAR TAMBAHAN sidik jari + CATATAN
 *    PENYUSUNAN (tanpa garis).
 */

const TWIP_PER_CHAR = 144; // Courier New 12 pt = 7,2 pt per huruf
const LINE_TWIP = 529;
const LINES_PER_PAGE = 30;
const TITLE_LINES = 4;
const EMU_PER_TWIP = 635;
const PAGE_W = 12189;
const PAGE_H = 18709;
const MARGIN = { top: 1134, right: 850, bottom: 1680, left: 3969 };
const TEXT_W = PAGE_W - MARGIN.left - MARGIN.right; // 7370
const RULE_LEN_EMU = 1134 * EMU_PER_TWIP; // 2 cm
const RULE_THICK_EMU = 19050; // 1,5 pt

export type Variant = "minuta" | "salinan";

// Karakter kontrol (selain tab/baris baru) membuat file Word rusak -> dibuang.
// eslint-disable-next-line no-control-regex
const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Gambar garis datar mengambang. `rel` = acuan posisi (paragraf untuk garis isi, halaman untuk header). */
function rule(id: number, xEmu: number, yEmu: number, rel: "paragraph" | "page"): string {
  const relH = rel === "page" ? "page" : "margin";
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${relH}"><wp:posOffset>${xEmu}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${rel}"><wp:posOffset>${yEmu}</wp:posOffset></wp:positionV><wp:extent cx="${RULE_LEN_EMU}" cy="${RULE_THICK_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Garis ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="garis.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdGaris"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${RULE_LEN_EMU}" cy="${RULE_THICK_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

/** Garis datar yang menempel pada paragraf (di bawah kalimat terakhir, blok tanda tangan). */
function lineRule(id: number, line: Line, bottom: boolean): string {
  const startCol = line.col - (line.hanging ?? 0);
  const x = startCol * TWIP_PER_CHAR * EMU_PER_TWIP - 30 * EMU_PER_TWIP;
  const y = (bottom ? LINE_TWIP * EMU_PER_TWIP : 0) - Math.round(RULE_THICK_EMU / 2);
  return rule(id, x, y, "paragraph");
}

const RUN = (text: string, bold?: boolean, size?: number) =>
  `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${size ? `<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const TAB = "<w:r><w:tab/></w:r>";
const TABS_RIGHT = `<w:tabs><w:tab w:val="right" w:leader="hyphen" w:pos="${TEXT_W}"/></w:tabs>`;
const TABS_CENTER = `<w:tabs><w:tab w:val="center" w:leader="hyphen" w:pos="${Math.round(TEXT_W / 2)}"/><w:tab w:val="right" w:leader="hyphen" w:pos="${TEXT_W}"/></w:tabs>`;

function paragraph(line: Line, color: string, nextId: () => number): string {
  const left = line.col * TWIP_PER_CHAR;
  const hanging = (line.hanging ?? 0) * TWIP_PER_CHAR;
  const ppr = [
    line.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    '<w:widowControl w:val="0"/>',
    line.keepNext ? "<w:keepNext/>" : "",
    line.center ? TABS_CENTER : line.fill ? TABS_RIGHT : "",
    `<w:spacing w:before="0" w:after="0" w:line="${LINE_TWIP}" w:lineRule="exact"/>`,
    `<w:ind w:left="${left}" w:right="0"${hanging ? ` w:hanging="${hanging}"` : ' w:firstLine="0"'}/>`,
    line.border ? `<w:pBdr><w:left w:val="single" w:sz="12" w:space="0" w:color="${color}"/></w:pBdr>` : "",
    // Satu baris rata kiri-kanan: baris tunggal (= baris terakhir paragraf) tampil rata kiri;
    // hanya luberan hasil edit manual yang diratakan.
    `<w:jc w:val="${line.plain ? "left" : "both"}"/>`
  ].join("");
  const marks = (line.markTop ? lineRule(nextId(), line, false) : "") + (line.markBottom ? lineRule(nextId(), line, true) : "");
  let runs = line.segs.filter((s) => s.text.length > 0).map((s) => RUN(s.text, s.bold)).join("");
  // Baris pengisi (strip penuh): beri satu strip diketik di depan supaya paragraf tidak
  // dianggap kosong oleh pembaca lain (LibreOffice memendekkan tinggi baris kosong);
  // tampilannya sama karena leader tab juga strip.
  if (!runs && line.fill && !line.center) runs = RUN("-");
  const body = line.center ? `${TAB}${runs}${TAB}` : line.fill ? `${runs}${TAB}` : runs;
  return `<w:p><w:pPr>${ppr}</w:pPr>${marks}${body}</w:p>`;
}

// ---------------------------------------------------------------------------
// Header: garis datar pembuka & penutup halaman (relatif halaman, tidak bergeser)
// ---------------------------------------------------------------------------

const HDR_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

const fld = (instr: string) =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;

function headerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${HDR_NS}><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p></w:hdr>`;
}

function footerXml(withNumber: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${HDR_NS}><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>${withNumber ? fld("PAGE") : ""}</w:p></w:ftr>`;
}

function sectPr(opts: { headers: "rules" | "none"; pageNumber: boolean; titlePg: boolean }): string {
  const refs =
    opts.headers === "rules"
      ? '<w:headerReference w:type="first" r:id="rIdHdrFirst"/><w:headerReference w:type="default" r:id="rIdHdr"/>'
      : '<w:headerReference w:type="first" r:id="rIdHdrEmpty"/><w:headerReference w:type="default" r:id="rIdHdrEmpty"/>';
  const ftr = opts.pageNumber
    ? '<w:footerReference w:type="first" r:id="rIdFtr"/><w:footerReference w:type="default" r:id="rIdFtr"/>'
    : '<w:footerReference w:type="first" r:id="rIdFtrEmpty"/><w:footerReference w:type="default" r:id="rIdFtrEmpty"/>';
  return `<w:sectPr>${refs}${ftr}<w:type w:val="nextPage"/><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN.top}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="680" w:footer="680" w:gutter="0"/><w:cols w:space="708"/>${opts.titlePg ? "<w:titlePg/>" : ""}<w:docGrid w:type="default" w:linePitch="${LINE_TWIP}"/></w:sectPr>`;
}

// ---------------------------------------------------------------------------
// Lembar tambahan (sidik jari) & catatan penyusunan -- minuta saja
// ---------------------------------------------------------------------------

export interface ExtraSheet {
  jenisAkta: string;
  objek: string;
  nomorAkta: string;
  tanggalAkta: string;
  notaris: string;
  /** Penghadap: sebutan "Tn."/"Ny.", nama, kedudukan (mis. "Penghadap", "Pihak Pertama"), NIK. */
  penghadap: { sebutan: string; nama: string; kedudukan: string; nik: string }[];
}

const P = (inner: string, opts: { align?: string; after?: number; pageBreak?: boolean; size?: number } = {}) =>
  `<w:p><w:pPr>${opts.pageBreak ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="0" w:after="${opts.after ?? 0}" w:line="276" w:lineRule="auto"/>${opts.align ? `<w:jc w:val="${opts.align}"/>` : ""}</w:pPr>${inner}</w:p>`;

function extraSheetXml(x: ExtraSheet): string {
  const label = (k: string, v: string) => P(RUN(`${k.padEnd(15)}: `) + RUN(v));
  const parts: string[] = [
    P(RUN("LEMBAR TAMBAHAN", true), { align: "center" }),
    P(RUN("SIDIK JARI PENGHADAP", true), { align: "center", after: 240 }),
    label("Jenis akta", x.jenisAkta),
    label("Obyek", x.objek || "-"),
    label("Nomor akta", x.nomorAkta),
    label("Tanggal akta", x.tanggalAkta),
    label("Notaris", x.notaris),
    P(RUN(`${"Para penghadap".padEnd(15)}:`)),
    ...x.penghadap.flatMap((p, i) => [
      P(RUN(`${String(i + 1).padStart(2)}. ${p.sebutan} `.padEnd(8)) + RUN(p.nama, true) + RUN(` (${p.kedudukan})`)),
      P(RUN(`${"".padEnd(8)}NIK ${p.nik}`), { after: 60 })
    ]),
    P(
      RUN(
        "Sesuai Pasal 16 ayat (1) huruf c Undang-Undang Nomor 30 Tahun 2004 tentang Jabatan Notaris sebagaimana telah diubah dengan Undang-Undang Nomor 2 Tahun 2014, lembar ini memuat sidik jari (cap ibu jari tangan kanan) para penghadap dan dilekatkan pada minuta akta."
      ),
      { align: "both", after: 240 }
    )
  ];
  // Tabel kotak ibu jari, dua per baris: kotak maks. 2600 x 2800 twip, di bawahnya kedudukan + Tn./Ny. NAMA (9 pt).
  const BOX_W = 2600;
  const BOX_H = 2800;
  const GAP = 400;
  const cellBorders = (on: boolean) =>
    `<w:tcBorders>${["top", "left", "bottom", "right"].map((s) => (on ? `<w:${s} w:val="single" w:sz="8" w:space="0" w:color="000000"/>` : `<w:${s} w:val="nil"/>`)).join("")}</w:tcBorders>`;
  const rows: string[] = [];
  for (let i = 0; i < x.penghadap.length; i += 2) {
    const pair = x.penghadap.slice(i, i + 2);
    const boxCells = pair
      .map((_, k) => `<w:tc><w:tcPr><w:tcW w:w="${BOX_W}" w:type="dxa"/>${cellBorders(true)}</w:tcPr><w:p/></w:tc>${k === 0 && pair.length > 1 ? `<w:tc><w:tcPr><w:tcW w:w="${GAP}" w:type="dxa"/>${cellBorders(false)}</w:tcPr><w:p/></w:tc>` : ""}`)
      .join("");
    const nameCells = pair
      .map(
        (p, k) =>
          `<w:tc><w:tcPr><w:tcW w:w="${BOX_W}" w:type="dxa"/>${cellBorders(false)}</w:tcPr>${P(RUN(p.kedudukan, false, 9), { align: "center" })}${P(RUN(`${p.sebutan} `, false, 9) + RUN(p.nama, true, 9), { align: "center", after: 200 })}</w:tc>${k === 0 && pair.length > 1 ? `<w:tc><w:tcPr><w:tcW w:w="${GAP}" w:type="dxa"/>${cellBorders(false)}</w:tcPr><w:p/></w:tc>` : ""}`
      )
      .join("");
    rows.push(`<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${BOX_H}" w:hRule="exact"/></w:trPr>${boxCells}</w:tr><w:tr><w:trPr><w:cantSplit/></w:trPr>${nameCells}</w:tr>`);
  }
  const grid = `<w:gridCol w:w="${BOX_W}"/><w:gridCol w:w="${GAP}"/><w:gridCol w:w="${BOX_W}"/>`;
  parts.push(`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join("")}</w:tbl>`);
  return parts.join("");
}

/** Halaman catatan penyusunan (hanya minuta; dihapus sebelum cetak). */
function notesXml(notes: string[], pageBreak: boolean): string {
  const p = (text: string, bold = false, pb = false) =>
    `<w:p><w:pPr>${pb ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  return [p("CATATAN PENYUSUNAN (bukan bagian akta; hapus halaman ini sebelum dicetak)", true, pageBreak), ...notes.map((n) => p(n))].join("");
}

export function buildDocx(
  lines: Line[],
  variant: Variant,
  opts: { title: string; notes?: string[]; extraSheet?: ExtraSheet }
): Buffer {
  const color = variant === "salinan" ? "FF0000" : "000000";
  let id = 100;
  const nextId = () => ++id;

  const akta = lines.map((l) => paragraph(l, color, nextId)).join("");
  const hasExtra = !!opts.extraSheet || !!opts.notes?.length;
  // Section 1 = akta (header bergaris, nomor halaman). Section 2 = lembar tambahan & catatan (tanpa garis).
  const body = hasExtra
    ? `${akta}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sectPr({ headers: "rules", pageNumber: true, titlePg: true })}</w:pPr></w:p>` +
      (opts.extraSheet ? extraSheetXml(opts.extraSheet) : "") +
      (opts.notes?.length ? notesXml(opts.notes, !!opts.extraSheet) : "") +
      sectPr({ headers: "none", pageNumber: false, titlePg: false })
    : akta + sectPr({ headers: "rules", pageNumber: true, titlePg: true });

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${HDR_NS}><w:body>${body}</w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="Courier New" w:cs="Courier New"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="${LINE_TWIP}" w:lineRule="exact"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:updateFields w:val="true"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

  const override = (part: string, type: string) => `<Override PartName="/word/${part}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${override("document.xml", "document.main")}${override("styles.xml", "styles")}${override("settings.xml", "settings")}${override("header1.xml", "header")}${override("header2.xml", "header")}${override("header3.xml", "header")}${override("footer1.xml", "footer")}${override("footer2.xml", "footer")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="${R}/settings" Target="settings.xml"/><Relationship Id="rIdGaris" Type="${R}/image" Target="media/garis.png"/><Relationship Id="rIdHdrFirst" Type="${R}/header" Target="header1.xml"/><Relationship Id="rIdHdr" Type="${R}/header" Target="header2.xml"/><Relationship Id="rIdHdrEmpty" Type="${R}/header" Target="header3.xml"/><Relationship Id="rIdFtr" Type="${R}/footer" Target="footer1.xml"/><Relationship Id="rIdFtrEmpty" Type="${R}/footer" Target="footer2.xml"/></Relationships>`;
  const hdrRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdGaris" Type="${R}/image" Target="media/garis.png"/></Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title)}</dc:title><dc:creator>Nexora</dc:creator></cp:coreProperties>`;

  const png = solidPng(40, 2, variant === "salinan" ? [255, 0, 0] : [0, 0, 0]);

  return zip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: styles },
    { name: "word/settings.xml", data: settings },
    { name: "word/header1.xml", data: headerXml() },
    { name: "word/header2.xml", data: headerXml() },
    { name: "word/header3.xml", data: headerXml() },
    { name: "word/footer1.xml", data: footerXml(true) },
    { name: "word/footer2.xml", data: footerXml(false) },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/_rels/header1.xml.rels", data: hdrRels },
    { name: "word/_rels/header2.xml.rels", data: hdrRels },
    { name: "word/media/garis.png", data: png },
    { name: "docProps/core.xml", data: core }
  ]);
}
