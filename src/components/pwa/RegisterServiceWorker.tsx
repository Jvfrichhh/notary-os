"use client";

import { useEffect } from "react";

/** Mendaftarkan /sw.js (lihat public/sw.js) agar Nexora bisa dipasang sebagai aplikasi. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
