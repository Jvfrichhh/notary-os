import type { id } from "./id";

/** Ubah `as const` literal menjadi string biasa supaya kamus lain bebas isinya tapi wajib lengkap. */
type Loosen<T> = { [K in keyof T]: T[K] extends string ? string : Loosen<T[K]> };
export type Dict = Loosen<typeof id>;
