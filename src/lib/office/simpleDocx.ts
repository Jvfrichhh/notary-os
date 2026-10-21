import { zip } from "@/lib/deeds/zip";

/**
 * Penulis .docx sederhana untuk surat & laporan kantor (paragraf + tabel),
 * tanpa dependensi. Kertas A4, huruf Arial 11.
 */

export type DocBlock =
  | { t: "p"; text: string; bold?: boolean; align?: "left" | "center" | "right" | "both"; size?: number; spaceAfter?: number }
  | { t: "table"; header: string[]; rows: string[][]; widths?: number[]; noHeader?: boolean; borderless?: boolean }
  | { t: "pageBreak" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Teks dengan **tebal** ringan dan baris baru (\n). */
function runs(text: string, bold = false, size?: number): string {
  const sz = size ? `<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>` : "";
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => {
      const b = bold || (part.startsWith("**") && part.endsWith("**"));
      const raw = part.startsWith("**") && part.endsWith("**") ? part.slice(2, -2) : part;
      const lines = raw.split("\n");
      return lines
        .map(
          (l, i) =>
            `${i > 0 ? "<w:r><w:br/></w:r>" : ""}<w:r><w:rPr>${b ? "<w:b/>" : ""}${sz}</w:rPr><w:t xml:space="preserve">${esc(l)}</w:t></w:r>`
        )
        .join("");
    })
    .join("");
}

function para(b: Extract<DocBlock, { t: "p" }>): string {
  // Rata kanan-kiri + baris baru: pecah per baris agar baris terakhir tiap bagian tidak "melar".
  if (b.align === "both" && b.text.includes("\n")) {
    const parts = b.text.split("\n");
    return parts.map((t, i) => para({ ...b, text: t, spaceAfter: i === parts.length - 1 ? b.spaceAfter : 0 })).join("");
  }
  return `<w:p><w:pPr><w:jc w:val="${b.align ?? "left"}"/><w:spacing w:after="${b.spaceAfter ?? 120}"/></w:pPr>${runs(b.text, b.bold, b.size)}</w:p>`;
}

function table(b: Extract<DocBlock, { t: "table" }>, total: number): string {
  const widths = b.widths ?? b.header.map(() => 1);
  const sum = widths.reduce((a, c) => a + c, 0);
  const tw = widths.map((w) => Math.round((w / sum) * total));
  const cell = (text: string, i: number, header: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${tw[i]}" w:type="dxa"/>${header ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${runs(text, header, 10)}</w:p></w:tc>`;
  const row = (cells: string[], header: boolean) =>
    `<w:tr>${header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells.map((c, i) => cell(c, i, header)).join("")}</w:tr>`;
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((s) => (b.borderless ? `<w:${s} w:val="nil"/>` : `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`))
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${tw
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join("")}</w:tblGrid>${b.noHeader ? "" : row(b.header, true)}${b.rows.map((r) => row(r, false)).join("")}</w:tbl><w:p/>`;
}

export function buildSimpleDocx(blocks: DocBlock[], opts: { title: string; landscape?: boolean } = { title: "Dokumen" }): Buffer {
  const [w, h] = opts.landscape ? [16838, 11906] : [11906, 16838];
  const contentWidth = w - 2 * 1134; // lebar isi dengan margin 2 cm (twip)
  const body = blocks
    .map((b) => (b.t === "p" ? para(b) : b.t === "table" ? table(b, contentWidth) : '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'))
    .join("");
  const sect = `<w:sectPr><w:pgSz w:w="${w}" w:h="${h}"${opts.landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sect}</w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(opts.title)}</dc:title><dc:creator>Notary OS</dc:creator></cp:coreProperties>`;
  return zip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: styles },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "docProps/core.xml", data: core }
  ]);
}
