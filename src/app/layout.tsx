import type { Metadata } from "next";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/layout/ThemeToggle";

export const metadata: Metadata = {
  title: "Nexora — Sistem Manajemen Kantor Notaris",
  description: "Internal management system untuk kantor notaris"
};

// Font Plus Jakarta Sans dimuat langsung dari Google Fonts oleh browser (bukan
// diunduh saat build): build di Vercel tidak gagal bila Google Fonts sedang
// lambat. Bila font belum termuat, tampilan memakai font sistem.
const FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONT_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
