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
      colors: {
        border: "#EAECF0",
        background: "#FFFFFF",
        canvas: "#F6F7F9",
        foreground: "#101828",
        muted: "#F2F4F7",
        "muted-foreground": "#596172",
        primary: "#047857",
        "primary-foreground": "#FFFFFF",
        "primary-soft": "#ECFDF3",
        // Warna merek Nexora (logo): hijau tua & emas.
        brand: { deep: "#082A21", gold: "#D9B26F" },
        status: {
          overdue: "#B42318",
          "due-today": "#B54708",
          "due-soon": "#A15C07",
          "on-track": "#067647",
          archived: "#667085"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"]
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
