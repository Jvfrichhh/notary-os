"use client";

import { useEffect } from "react";

/**
 * Pembiasan tepi ("lensing") Liquid Glass: latar di pinggir setiap .surface
 * dibelokkan sedikit seperti lewat kaca tebal, tanpa blur.
 *
 * Cara kerja: untuk tiap ukuran panel dibuat satu <filter> SVG berisi peta
 * perpindahan (feDisplacementMap) seukuran piksel panel — pita selebar BAND px
 * di sepanjang tepi (mengikuti sudut bulat) menggeser sampel latar ke arah
 * luar. Filter dipasang sebagai backdrop-filter pada ::after panel (bukan pada
 * panelnya langsung: bayangan luar panel menggeser tekstur latar di Chromium
 * sehingga peta meleset). Browser tanpa dukungan filter SVG di backdrop-filter
 * (Safari) mengabaikannya dan tetap memakai kaca biasa.
 */
const BAND = 14;
const SCALE = 16;
const MAX_AREA = 1_600_000; // panel sangat besar dilewati (hemat memori)

function makeMap(w: number, h: number, r: number): string | null {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const hw = w / 2;
  const hh = h / 2;
  for (let j = 0; j < h; j++) {
    const py = j + 0.5;
    const gy = py - hh;
    const qy = Math.abs(gy) - (hh - r);
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      const px = i + 0.5;
      const gx = px - hw;
      const qx = Math.abs(gx) - (hw - r);
      const ax = qx > 0 ? qx : 0;
      const ay = qy > 0 ? qy : 0;
      // jarak bertanda ke tepi persegi bersudut bulat (negatif = di dalam)
      const dist = Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r;
      const t = -dist / BAND;
      if (t >= 1 || t <= 0) {
        d[o] = 128;
        d[o + 1] = 128;
        d[o + 2] = 128;
        d[o + 3] = 255;
        continue;
      }
      const s = Math.sin(t * Math.PI); // 0 di tepi & di dalam, puncak di tengah pita
      let nx = 0;
      let ny = 0;
      if (ax > 0 || ay > 0) {
        const l = Math.hypot(ax, ay) || 1;
        nx = Math.sign(gx) * (ax / l);
        ny = Math.sign(gy) * (ay / l);
      } else if (qx > qy) nx = Math.sign(gx);
      else ny = Math.sign(gy);
      d[o] = 128 + nx * s * 127;
      d[o + 1] = 128 + ny * s * 127;
      d[o + 2] = 128;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export function GlassLens() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.skin !== "glass") return;
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    const style = document.createElement("style");
    document.body.append(svg, style);
    const filters = new Map<string, string>(); // kunci ukuran -> id filter
    let seq = 0;

    const apply = (el: HTMLElement) => {
      if (root.dataset.glass === "solid") {
        delete el.dataset.lens;
        return;
      }
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 24 || h < 24 || w * h > MAX_AREA) {
        delete el.dataset.lens;
        return;
      }
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, Math.min(w, h) / 2);
      const key = `${w}x${h}x${Math.round(r)}`;
      let id = filters.get(key);
      if (!id) {
        const map = makeMap(w, h, r);
        if (!map) return;
        id = `nx-lens-${++seq}`;
        const f = document.createElementNS(svgNS, "filter");
        f.setAttribute("id", id);
        f.setAttribute("x", "0");
        f.setAttribute("y", "0");
        f.setAttribute("width", String(w));
        f.setAttribute("height", String(h));
        f.setAttribute("filterUnits", "userSpaceOnUse");
        f.setAttribute("color-interpolation-filters", "sRGB");
        const im = document.createElementNS(svgNS, "feImage");
        im.setAttribute("href", map);
        im.setAttribute("x", "0");
        im.setAttribute("y", "0");
        im.setAttribute("width", String(w));
        im.setAttribute("height", String(h));
        im.setAttribute("result", "map");
        const dm = document.createElementNS(svgNS, "feDisplacementMap");
        dm.setAttribute("in", "SourceGraphic");
        dm.setAttribute("in2", "map");
        dm.setAttribute("scale", String(SCALE));
        dm.setAttribute("xChannelSelector", "R");
        dm.setAttribute("yChannelSelector", "G");
        f.append(im, dm);
        svg.appendChild(f);
        style.sheet?.insertRule(`html[data-skin="glass"] [data-lens="${id}"]::after{-webkit-backdrop-filter:url(#${id});backdrop-filter:url(#${id})}`);
        filters.set(key, id);
      }
      if (el.dataset.lens !== id) el.dataset.lens = id;
    };

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.target as HTMLElement);
    });
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>(".surface").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        ro.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    // Tingkat kaca berubah (Pengaturan) -> terapkan ulang.
    const ao = new MutationObserver(() => document.querySelectorAll<HTMLElement>(".surface").forEach(apply));
    ao.observe(root, { attributes: true, attributeFilter: ["data-glass"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
      ao.disconnect();
      svg.remove();
      style.remove();
    };
  }, []);
  return null;
}
