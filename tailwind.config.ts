import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(220 13% 91%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(224 15% 15%)",
        muted: "hsl(220 14% 96%)",
        "muted-foreground": "hsl(220 9% 46%)",
        primary: "hsl(222 47% 20%)",
        "primary-foreground": "hsl(0 0% 100%)",
        status: {
          overdue: "hsl(0 72% 51%)",
          "due-today": "hsl(25 95% 53%)",
          "due-soon": "hsl(45 93% 47%)",
          "on-track": "hsl(142 71% 35%)",
          archived: "hsl(220 9% 60%)"
        }
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px"
      }
    }
  },
  plugins: []
};

export default config;
