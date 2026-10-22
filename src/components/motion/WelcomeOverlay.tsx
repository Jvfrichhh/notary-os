"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";

/** Penanda dipasang halaman login tepat setelah berhasil masuk. */
export const WELCOME_FLAG = "notaryos:welcome";

/** Skrip kecil di awal halaman: pasang tirai sebelum React siap, agar dashboard tidak berkedip. */
export const WELCOME_PENDING_SCRIPT = `try{if(sessionStorage.getItem("${"notaryos:welcome"}"))document.documentElement.classList.add("welcome-pending")}catch(e){}`;

/** "Selamat pagi/siang/sore/malam" menurut jam Jakarta. */
function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function today(): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
}

/**
 * Sambutan singkat (±2 detik) sekali setelah login: lambang kantor, salam
 * sesuai waktu, nama pengguna, lalu menyingkir ke atas memperlihatkan
 * dashboard. Klik di mana saja untuk melewati.
 */
export function WelcomeOverlay({ name, subtitle }: { name: string; subtitle: string }) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [text, setText] = useState({ hello: "", date: "" });

  useEffect(() => {
    let flag: string | null = null;
    try {
      flag = sessionStorage.getItem(WELCOME_FLAG);
      sessionStorage.removeItem(WELCOME_FLAG);
    } catch {
      /* penyimpanan browser tidak tersedia: lewati sambutan */
    }
    document.documentElement.classList.remove("welcome-pending");
    if (!flag) return;
    setText({ hello: greeting(), date: today() });
    setShow(true);
    document.documentElement.classList.add("welcome-active");
    const done = setTimeout(() => finish(), 2100);
    return () => clearTimeout(done);
  }, []);

  function finish() {
    setShow(false);
    setTimeout(() => document.documentElement.classList.remove("welcome-active"), 600);
  }

  function skip() {
    setLeaving(true);
    setTimeout(finish, 320);
  }

  if (!show) return null;
  const first = name.trim().split(/\s+/).slice(0, 2).join(" ");
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={skip}
      className={`welcome-overlay fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-gradient-to-br from-primary via-primary to-[hsl(222_47%_12%)] text-primary-foreground ${leaving ? "welcome-leaving" : ""}`}
    >
      <div className="px-6 text-center">
        <div className="welcome-mark mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <Scale className="h-8 w-8" />
        </div>
        <p className="welcome-fade-1 mt-6 text-sm uppercase tracking-[0.2em] text-white/70">{text.hello}</p>
        <h1 className="welcome-fade-2 mt-2 text-3xl font-semibold sm:text-4xl">{first}</h1>
        <p className="welcome-fade-3 mt-2 text-sm text-white/70">
          {subtitle} · {text.date}
        </p>
        <div className="mx-auto mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-white/15">
          <div className="welcome-line h-full w-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}
