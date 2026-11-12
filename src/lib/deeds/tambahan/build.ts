import type { DeedTemplate } from "../types";
import { personFromClient } from "../types";
import type { Block } from "../layout";
import type { DeedData, SectionDef } from "../schema";
import { daftarPenghadap, denganPasangan, dikenal, domisili, judul, pasal, pembuka, penutup, person, str } from "../common";
import { nomorPenghadap, parties, partyList, peranDari } from "../parties";
import { angka, rupiah, tanggalHuruf } from "../words";
import type { Cfg, Isi } from "./types";

const UMUM = "Template ini rumusan umum (belum dari contoh akta kantor); wajib diperiksa dan disesuaikan Notaris sebelum dipakai.";
const bersih = (v: unknown) => str(v).replace(/[\s.;,]+$/, "");
const terisi = (d: DeedData, k: string) => {
  const v = d[k];
  return Array.isArray(v) ? parties(v).some((x) => !!str(x.p.nama)) : !!str(v);
};

/** Nilai satu penanda; null bila kosong (dipakai untuk membuang bagian opsional). */
function nilai(d: DeedData, token: string): string | null {
  const [k, f] = token.split(":");
  const raw = str(d[k]);
  if (!raw) return null;
  if (f === "rp") return rupiah(raw);
  if (f === "tgl") return tanggalHuruf(raw);
  if (f === "angka") return angka(raw);
  if (f === "up") return bersih(raw).toUpperCase();
  return bersih(raw);
}

export function isiTeks(d: DeedData, t: string): string {
  const opsional = t.replace(/<<([\s\S]*?)>>/g, (_, seg: string) => {
    let kosong = false;
    const out = seg.replace(/\{([A-Za-z0-9_]+(?::[a-z]+)?)\}/g, (_m, tok: string) => {
      const v = nilai(d, tok);
      if (v === null) kosong = true;
      return v ?? "";
    });
    return kosong ? "" : out;
  });
  return opsional
    .replace(/\{([A-Za-z0-9_]+(?::[a-z]+)?)\}/g, (m, tok: string) => (tok === "PENGHADAP" || tok === "Penghadap" ? m : nilai(d, tok) ?? "[...]"))
    .replace(/ {2,}/g, " ")
    .replace(/ ([,;]|\.(?!\.))/g, "$1");
}

function cocok(d: DeedData, syarat: string): boolean {
  if (syarat.startsWith("!")) return !cocok(d, syarat.slice(1));
  const eq = syarat.indexOf("=");
  if (eq > 0) return str(d[syarat.slice(0, eq)]).startsWith(syarat.slice(eq + 1));
  return terisi(d, syarat);
}

function rakit(d: DeedData, isi: Isi[], sebagaiButir = false): Block[] {
  const out: Block[] = [];
  for (const x of isi) {
    if (typeof x === "string") {
      const teks = isiTeks(d, x).trim();
      if (teks) out.push(sebagaiButir ? { t: "item", marker: "-", text: teks } : { t: "p", text: teks });
    }
    else if ("j" in x) out.push({ t: "center", text: isiTeks(d, x.j), bold: true });
    else if ("b" in x) x.b.forEach((s, i) => out.push({ t: "item", marker: `${i + 1}.`, level: sebagaiButir ? 1 : 0, text: isiTeks(d, s) }));
    else if ("baris" in x) {
      const baris = str(d[x.baris]).split("\n").map((s) => bersih(s)).filter(Boolean);
      (baris.length ? baris : ["[...]"]).forEach((s, i, a) => out.push({ t: "item", marker: `${i + 1}.`, level: sebagaiButir ? 1 : 0, text: `${s}${i === a.length - 1 ? "." : ";"}` }));
    } else if (cocok(d, x.jika)) out.push(...rakit(d, x.maka, sebagaiButir));
  }
  return out;
}

const kunciPasangan = (k: string) => `pasangan_${k}`;

function sectionsDari(c: Cfg): SectionDef[] {
  const pihak: SectionDef[] = c.pihak.map((p) => ({
    title: p.label,
    fields: [
      partyList(p.key, p.label, p.sebut || "Penghadap", p.min ?? 1, p.max ?? 4),
      ...(p.pasangan ? [{ kind: "person" as const, key: kunciPasangan(p.key), label: `Suami/istri ${p.sebut || "penghadap"} (persetujuan; kosongkan bila tidak ada)`, optional: true }] : [])
    ]
  }));
  return [...pihak, ...c.sections];
}

export function buatTemplate(c: Cfg): DeedTemplate {
  /** Urutan penghadap per kelompok pihak (termasuk pasangan yang memberi persetujuan). */
  const susun = (d: DeedData) =>
    c.pihak.map((p) => {
      // Pihak opsional (min 0) yang tidak diisi tidak ikut menghadap.
      const semua = parties(d[p.key]);
      const ps = p.min === 0 ? semua.filter((x) => !!str(x.p.nama)) : semua;
      const pas = p.pasangan ? person(d[kunciPasangan(p.key)]) : null;
      const ada = !!(pas && str(pas.nama));
      const pen = ada
        ? denganPasangan(ps.map((x) => x.p), pas!, "").map((x, i) => (i < ps.length ? { ...x, peran: peranDari(ps[i]) } : x))
        : ps.map((x) => ({ p: x.p, peran: peranDari(x) }));
      return { p, utama: ps.length, pen };
    });

  return {
    key: c.key,
    title: c.title,
    description: c.description,
    sections: sectionsDari(c),
    signers: (d) => susun(d).flatMap((g) => g.pen.map((x) => x.p)),
    signerLabels: (d) => susun(d).flatMap((g) => g.pen.map(() => `${g.p.sebut || "Penghadap"},`)),
    subject: (d) => isiTeks(d, c.subject),
    prefill: (ctx) => {
      const p = c.pihak.find((x) => x.klien) ?? c.pihak[0];
      return { [p.key]: [{ orang: personFromClient(ctx.client), kapasitas: "untuk diri sendiri" }] };
    },
    notes: () => [...c.notes, UMUM],
    build(d, variant) {
      const grup = susun(d);
      const pen = grup.flatMap((g) => g.pen);
      const blocks: Block[] = [judul(isiTeks(d, c.judul), d, c.sub ? isiTeks(d, c.sub) : undefined), ...pembuka(d), ...daftarPenghadap(pen)];

      // Sebutan para pihak ("untuk selanjutnya disebut ...").
      const bersebut = grup.filter((g) => g.p.sebut);
      if (bersebut.length) {
        let mulai = 1;
        const bagian: string[] = [];
        for (const g of grup) {
          if (g.p.sebut && g.utama) bagian.push(`${pen.length === 1 ? "Penghadap" : `penghadap ${nomorPenghadap(mulai, g.utama)}`} untuk selanjutnya disebut **${g.p.sebut.toUpperCase()}**`);
          mulai += g.pen.length;
        }
        const kal = bagian.join("; dan ");
        blocks.push({ t: "p", text: `${kal.charAt(0).toUpperCase()}${kal.slice(1)}.` });
      }
      blocks.push(dikenal(pen.length));

      if (c.premis?.length) {
        blocks.push({ t: "p", text: "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan terlebih dahulu:" });
        blocks.push(...rakit(d, c.premis, true));
      }
      blocks.push({
        t: "p",
        text: c.pengantar
          ? isiTeks(d, c.pengantar)
          : c.premis?.length
            ? "Sehubungan dengan segala sesuatu yang diuraikan di atas, {PENGHADAP} menerangkan hal-hal sebagai berikut:"
            : "{Penghadap} dengan bertindak sebagaimana tersebut di atas menerangkan hal-hal sebagai berikut:"
      });

      let no = 0;
      for (const ps of c.pasal) {
        const isi = Array.isArray(ps) ? ps : cocok(d, ps.jika) ? ps.isi : null;
        if (!isi) continue;
        const first = isi[0];
        if (c.tanpaPasal) blocks.push(...rakit(d, isi));
        else if (typeof first === "object" && "j" in first) blocks.push(...rakit(d, [first]), ...pasal(++no), ...rakit(d, isi.slice(1)));
        else blocks.push(...pasal(++no), ...rakit(d, isi));
      }
      if (!c.tanpaDomisili) blocks.push(...(c.tanpaPasal ? [] : pasal(++no)), domisili(d, pen.length === 1 ? "{PENGHADAP}" : "para pihak"));
      blocks.push(...penutup(d, variant, c.wasiat ? { wasiat: true } : {}));
      return blocks;
    }
  };
}
