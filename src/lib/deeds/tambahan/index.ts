import type { Cfg } from "./types";
import { D1_BADAN } from "./d1Badan";
import { D2_TANAH } from "./d2Tanah";
import { D3_UTANG } from "./d3Utang";
import { D4_PERJANJIAN } from "./d4Perjanjian";
import { D5_KELUARGA } from "./d5Keluarga";
import { D6_KUASA } from "./d6Kuasa";

/** Seluruh akta tambahan (data murni; aman diimpor dari server, client, dan script). */
export const TAMBAHAN: Cfg[] = [...D1_BADAN, ...D2_TANAH, ...D3_UTANG, ...D4_PERJANJIAN, ...D5_KELUARGA, ...D6_KUASA];

/** Akta yang masuk register Wasiat & laporan Daftar Pusat Wasiat. */
export const KUNCI_LAPOR_WASIAT: string[] = TAMBAHAN.filter((c) => c.lapor).map((c) => c.key);
