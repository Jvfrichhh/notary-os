import type { FieldDef } from "./schema";
import type { Person } from "./schema";
import { list, person, str } from "./common";

/** Daftar pihak berulang: identitas + kapasitas bertindak. */
export function partyList(key: string, label: string, itemLabel: string, min = 1, max = 4): FieldDef {
  return {
    kind: "list",
    key,
    label,
    itemLabel,
    min,
    max,
    fields: [
      { kind: "person", key: "orang", label: "Identitas" },
      {
        kind: "text",
        key: "kapasitas",
        label: "Bertindak",
        wide: true,
        default: "untuk diri sendiri",
        help: "mis. 'untuk diri sendiri' atau 'selaku Direktur Utama dari dan oleh karena itu untuk dan atas nama PT ABC, berkedudukan di Kota Bogor'"
      }
    ]
  };
}

export type Party = { p: Person; kapasitas: string };

export function parties(v: unknown): Party[] {
  const out = list<{ orang?: Person; kapasitas?: string }>(v).map((x) => ({ p: person(x.orang), kapasitas: str(x.kapasitas) || "untuk diri sendiri" }));
  // Belum ada pihak yang diisi: satu tempat isian supaya penomoran & susunan akta tetap utuh.
  return out.length ? out : [{ p: {}, kapasitas: "untuk diri sendiri" }];
}

export const peranDari = (x: Party) => `menurut keterangannya dalam hal ini bertindak ${x.kapasitas}`;

/** "angka 1 dan 2" */
export function nomorPenghadap(start: number, count: number): string {
  const nums = Array.from({ length: count }, (_, i) => String(start + i));
  if (nums.length <= 1) return `angka ${nums[0] ?? "[...]"}`;
  return `angka ${nums.slice(0, -1).join(", ")} dan ${nums[nums.length - 1]}`;
}
