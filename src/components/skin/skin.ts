/** Kunci penyimpanan pilihan tampilan di browser: "glass" (bawaan) | "classic". */
export const SKIN_KEY = "nexora:skin";
export type Skin = "glass" | "classic";

/** Dijalankan di <head> sebelum halaman tampil (bersama skrip tema) supaya tidak berkedip. */
export const SKIN_INIT_SCRIPT = `try{var s=localStorage.getItem("${SKIN_KEY}");document.documentElement.setAttribute("data-skin",s==="classic"?"classic":"glass")}catch(e){document.documentElement.setAttribute("data-skin","glass")}`;

export function currentSkin(): Skin {
  if (typeof document === "undefined") return "glass";
  return document.documentElement.dataset.skin === "classic" ? "classic" : "glass";
}

export function setSkin(skin: Skin) {
  document.documentElement.setAttribute("data-skin", skin);
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    /* penyimpanan browser tidak tersedia: berlaku untuk halaman ini saja */
  }
}
