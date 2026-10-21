import type { DeedTemplate } from "./types";
import { COMMON_SECTIONS, type SectionDef } from "./schema";
import { kuasa } from "./templates/kuasa";
import { kuasaJual } from "./templates/kuasaJual";
import { ppjb } from "./templates/ppjb";
import { pendirianPt } from "./templates/pendirianPt";
import { sewa } from "./templates/sewa";
import { kerjasamaInvestasi, kerjasamaUsaha } from "./templates/kerjasama";
import { pascaNikah, praNikah } from "./templates/perkawinan";
import { fidusia } from "./templates/fidusia";
import { peralihanSaham, perubahanPt } from "./templates/saham";
import { kuasaWaris, waris, wasiat } from "./templates/waris";

/** Semua template draft akta yang tersedia. Kunci = SERVICE_CATALOG[].deedKey. */
export const DEED_TEMPLATES: Record<string, DeedTemplate> = Object.fromEntries(
  [
    kuasa,
    kuasaJual,
    ppjb,
    sewa,
    waris,
    kuasaWaris,
    wasiat,
    praNikah,
    pascaNikah,
    fidusia,
    kerjasamaUsaha,
    kerjasamaInvestasi,
    pendirianPt,
    perubahanPt,
    peralihanSaham
  ].map((t) => [t.key, t])
);

export function getDeedTemplate(key: string): DeedTemplate | null {
  return DEED_TEMPLATES[key] ?? null;
}

/** Bagian form lengkap: bagian khusus akta + data akta & saksi. */
export function sectionsFor(t: DeedTemplate): SectionDef[] {
  return [...t.sections, ...COMMON_SECTIONS];
}

/** Daftar ringkas untuk pilihan di UI. */
export function deedTemplateOptions(): { key: string; title: string; description: string }[] {
  return Object.values(DEED_TEMPLATES).map((t) => ({ key: t.key, title: t.title, description: t.description }));
}
