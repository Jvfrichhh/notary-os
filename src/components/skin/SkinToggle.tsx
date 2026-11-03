"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { currentSkin, setSkin, type Skin } from "./skin";

/** Pilihan tampilan Liquid Glass / Klasik (untuk menu akun). */
export function SkinToggle({ className = "" }: { className?: string }) {
  const [skin, set] = useState<Skin>("glass");
  useEffect(() => set(currentSkin()), []);
  const next: Skin = skin === "glass" ? "classic" : "glass";
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setSkin(next);
        set(next);
      }}
      className={className}
    >
      <Layers className="h-4 w-4" /> Tampilan: {skin === "glass" ? "Liquid Glass" : "Klasik"}
    </button>
  );
}
