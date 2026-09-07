import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notary OS — Sistem Manajemen Kantor Notaris",
  description: "Internal management system untuk kantor notaris"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
