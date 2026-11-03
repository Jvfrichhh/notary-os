"use client";

import { useEffect } from "react";

/**
 * Kilau permukaan kaca mengikuti kursor: mengisi --mx/--my pada setiap .surface.
 * Hanya pada perangkat berkursor (hover) dan skin Liquid Glass; dibatasi satu
 * pembaruan per frame supaya ringan.
 */
export function GlassPointer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      if (document.documentElement.dataset.skin !== "glass") return;
      const els = document.querySelectorAll<HTMLElement>(".surface");
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        el.style.setProperty("--mx", `${(((x - r.left) / Math.max(1, r.width)) * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(((y - r.top) / Math.max(1, r.height)) * 100).toFixed(1)}%`);
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
