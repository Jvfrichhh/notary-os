"use client";

import { useEffect } from "react";
import { clearNewPortalAccount } from "@/lib/portalAccountActions";

/** Hapus cookie kredensial portal baru setelah ditampilkan (password sementara tampil sekali). */
export function ClearPortalCookie() {
  useEffect(() => {
    clearNewPortalAccount(window.location.pathname).catch(() => undefined);
  }, []);
  return null;
}
