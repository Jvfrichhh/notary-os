import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { DEFAULT_GLASS, DEFAULT_THEME, GLASS_COOKIE, THEME_COOKIE, THEME_INIT_SCRIPT, isGlassLevel } from "@/lib/theme";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { UpdateNotice } from "@/components/pwa/UpdateNotice";

export const metadata: Metadata = {
  title: "Nexora — Sistem Manajemen Kantor Notaris",
  description: "Internal management system untuk kantor notaris",
  manifest: "/site.webmanifest",
  applicationName: "Nexora",
  appleWebApp: { capable: true, title: "Nexora", statusBarStyle: "default" }
};

export const viewport: Viewport = {
  themeColor: "#082A21"
};

// Font Plus Jakarta Sans dimuat langsung dari Google Fonts oleh browser (bukan
// diunduh saat build): build di Vercel tidak gagal bila Google Fonts sedang
// lambat. Bila font belum termuat, tampilan memakai font sistem.
const FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Mode terang/gelap dirender di server dari cookie supaya tidak berkedip dan
  // tidak "balik ke terang" setelah muat ulang.
  const jar = await cookies();
  const saved = jar.get(THEME_COOKIE)?.value;
  const theme = saved === "dark" || saved === "light" ? saved : DEFAULT_THEME;
  const savedGlass = jar.get(GLASS_COOKIE)?.value;
  const glass = isGlassLevel(savedGlass) ? savedGlass : DEFAULT_GLASS;
  const savedLang = jar.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(savedLang) ? savedLang : DEFAULT_LOCALE;
  return (
    <html lang={locale} data-skin="glass" data-glass={glass} className={theme === "dark" ? "dark" : undefined} style={{ colorScheme: theme }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONT_URL} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          {children}
          <RegisterServiceWorker />
          <UpdateNotice />
        </LocaleProvider>
      </body>
    </html>
  );
}
