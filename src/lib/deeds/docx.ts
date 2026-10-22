import { solidPng, zip } from "./zip";
import type { Line } from "./layout";

/**
 * Tulis baris-baris akta ke file .docx (WordprocessingML) sesuai format
 * kantor: F4 21,5 x 33 cm; margin kiri 7 / kanan 1,5 / atas 2 / bawah 3 cm;
 * Courier New 12 pt; tinggi baris eksak 529 twip (30 baris per halaman);
 * garis tepi kiri 1,5 pt menempel pada huruf pertama; garis datar pendek
 * berupa gambar garis 1,5 pt yang diposisikan absolut.
 * Minuta: garis hitam. Salinan: garis merah.
 */

const TWIP_PER_CHAR = 144; // Courier New 12 pt = 7,2 pt per huruf
const LINE_TWIP = 529;
const EMU_PER_TWIP = 635;
const MARK_LEN_EMU = 540000; // 1,5 cm
const MARK_THICK_EMU = 19050; // 1,5 pt

export type Variant = "minuta" | "salinan";

// Karakter kontrol (selain tab/baris baru) membuat file Word rusak -> dibuang.
// eslint-disable-next-line no-control-regex
const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function markDrawing(id: number, col: number, bottom: boolean): string {
  const x = col * TWIP_PER_CHAR * EMU_PER_TWIP - MARK_THICK_EMU;
  const y = (bottom ? LINE_TWIP * EMU_PER_TWIP : 0) - Math.round(MARK_THICK_EMU / 2);
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${MARK_LEN_EMU}" cy="${MARK_THICK_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Garis ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="garis.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdGaris"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${MARK_LEN_EMU}" cy="${MARK_THICK_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

function paragraph(line: Line, color: string, nextId: () => number): string {
  const ppr = [
    line.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    '<w:widowControl w:val="0"/>',
    `<w:spacing w:before="0" w:after="0" w:line="${LINE_TWIP}" w:lineRule="exact"/>`,
    `<w:ind w:left="${line.col * TWIP_PER_CHAR}" w:right="0" w:firstLine="0"/>`,
    line.border ? `<w:pBdr><w:left w:val="single" w:sz="12" w:space="0" w:color="${color}"/></w:pBdr>` : "",
    '<w:jc w:val="left"/>'
  ].join("");
  const marks =
    (line.markTop ? markDrawing(nextId(), line.col, false) : "") + (line.markBottom ? markDrawing(nextId(), line.col, true) : "");
  const runs = line.segs
    .filter((s) => s.text.length > 0)
    .map((s) => `<w:r>${s.bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(s.text)}</w:t></w:r>`)
    .join("");
  return `<w:p><w:pPr>${ppr}</w:pPr>${marks}${runs}</w:p>`;
}

/** Halaman catatan penyusunan (hanya minuta; dihapus sebelum cetak). */
function notesParagraphs(notes: string[]): string {
  const p = (text: string, bold = false, pageBreak = false) =>
    `<w:p><w:pPr>${pageBreak ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  return [p("CATATAN PENYUSUNAN — HAPUS HALAMAN INI SEBELUM DICETAK", true, true), ...notes.map((n) => p(n))].join("");
}

export function buildDocx(lines: Line[], variant: Variant, opts: { title: string; notes?: string[] }): Buffer {
  const color = variant === "salinan" ? "FF0000" : "000000";
  let id = 100;
  const nextId = () => ++id;

  const body = lines.map((l) => paragraph(l, color, nextId)).join("") + (opts.notes?.length ? notesParagraphs(opts.notes) : "");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="12189" w:h="18709"/><w:pgMar w:top="1134" w:right="850" w:bottom="1701" w:left="3969" w:header="567" w:footer="567" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:type="default" w:linePitch="${LINE_TWIP}"/></w:sectPr></w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="Courier New" w:cs="Courier New"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="${LINE_TWIP}" w:lineRule="exact"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdGaris" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/garis.png"/></Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title)}</dc:title><dc:creator>Notary OS</dc:creator></cp:coreProperties>`;

  const png = solidPng(40, 2, variant === "salinan" ? [255, 0, 0] : [0, 0, 0]);

  return zip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: styles },
    { name: "word/settings.xml", data: settings },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/media/garis.png", data: png },
    { name: "docProps/core.xml", data: core }
  ]);
}
