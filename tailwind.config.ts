import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // Tema "Modern Bersih" (Varian A, Okt 2026): latar abu-abu muda, kartu
      // putih bersudut lembut, satu warna utama hijau zamrud.
      // Warna lewat variabel CSS (globals.css) supaya mode terang/gelap
      // berganti dari satu tempat; format "R G B" agar /opacity tetap jalan.
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "fg-2": "rgb(var(--fg-2) / <alpha-value>)",
        "fg-3": "rgb(var(--fg-3) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        "primary-soft": "rgb(var(--primary-soft) / <alpha-value>)",
        "danger-soft": "rgb(var(--danger-soft) / <alpha-value>)",
        "danger-border": "rgb(var(--danger-border) / <alpha-value>)",
        "danger-strong": "rgb(var(--danger-strong) / <alpha-value>)",
        "warn-soft": "rgb(var(--warn-soft) / <alpha-value>)",
        "warn-border": "rgb(var(--warn-border) / <alpha-value>)",
        "warn-strong": "rgb(var(--warn-strong) / <alpha-value>)",
        "success-border": "rgb(var(--success-border) / <alpha-value>)",
        status: {
          overdue: "rgb(var(--status-overdue) / <alpha-value>)",
          "due-today": "rgb(var(--status-due-today) / <alpha-value>)",
          "due-soon": "rgb(var(--status-due-soon) / <alpha-value>)",
          "on-track": "rgb(var(--status-on-track) / <alpha-value>)",
          archived: "rgb(var(--status-archived) / <alpha-value>)"
        },
        // Warna merek Nexora (logo): hijau tua & emas.
        brand: { deep: "#082A21", gold: "#D9B26F" }
      },
      fontFamily: {
        sans: ["\"Plus Jakarta Sans\"", "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.03)"
      },
      borderRadius: {
        xl: "16px",
        lg: "14px",
        md: "10px",
        sm: "8px"
      }
    }
  },
  plugins: []
};

export default config;
