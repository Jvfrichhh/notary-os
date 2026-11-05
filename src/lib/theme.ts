/**
 * Konstanta tema (terang/gelap). Modul biasa TANPA "use client" supaya bisa
 * dipakai server (app/layout.tsx membaca cookie) maupun komponen klien.
 * Catatan: mengimpor konstanta dari file "use client" ke komponen server
 * menghasilkan referensi klien, bukan nilainya -> cookie tidak pernah terbaca
 * (penyebab tema "balik terang" setelah muat ulang).
 */
/** Kunci penyimpanan pilihan tema di browser ("light" | "dark"). */
export const THEME_KEY = "nexora:theme";

/**
 * Dijalankan di <head> sebelum halaman tampil, supaya tidak "berkedip" putih:
 * pakai pilihan tersimpan, bila belum ada ikuti pengaturan perangkat.
 */
export const THEME_COOKIE = "nexora-theme";

/** Tema awal bila belum pernah memilih: gelap. */
export const DEFAULT_THEME: "dark" | "light" = "dark";

/**
 * Dijalankan di <head> sebelum halaman tampil. Selalu menerapkan pilihan
 * (cookie -> localStorage -> bawaan gelap) ke <html>, apa pun yang dirender
 * server, lalu menyamakan cookie & localStorage. Jadi muat ulang tidak pernah
 * "balik" ke tema lain, bahkan bila HTML datang dari cache atau tanpa cookie.
 */
/** Tingkat kaca Liquid Glass (Pengaturan > Tampilan): clear | regular | solid. */
export const GLASS_KEY = "nexora:glass";
export const GLASS_COOKIE = "nexora-glass";
export type GlassLevel = "clear" | "regular" | "solid";
export const DEFAULT_GLASS: GlassLevel = "regular";
export const isGlassLevel = (v: unknown): v is GlassLevel => v === "clear" || v === "regular" || v === "solid";

export const THEME_INIT_SCRIPT = `try{var d=document.documentElement,t=null,c=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);if(c)t=c[1];else{try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}}if(t!=="dark"&&t!=="light")t="${DEFAULT_THEME}";d.classList.toggle("dark",t==="dark");d.style.colorScheme=t;try{localStorage.setItem("${THEME_KEY}",t)}catch(e){}document.cookie="${THEME_COOKIE}="+t+";path=/;max-age=31536000;SameSite=Lax"+(location.protocol==="https:"?";Secure":"");var g=null,gc=document.cookie.match(/(?:^|; )${GLASS_COOKIE}=(clear|regular|solid)/);if(gc)g=gc[1];else{try{g=localStorage.getItem("${GLASS_KEY}")}catch(e){}}if(g!=="clear"&&g!=="regular"&&g!=="solid")g="${DEFAULT_GLASS}";d.dataset.glass=g}catch(e){}`;
