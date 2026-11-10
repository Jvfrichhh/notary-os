import Link from "next/link";
import { getT } from "@/lib/i18n/server";

// Dipakai saat job tidak ditemukan ATAU bukan milik klien yang login --
// keduanya sengaja menampilkan halaman yang sama.
export default async function PortalNotFound() {
  const { tp } = await getT();
  return (
    <div className="rounded-lg border border-border bg-background p-8 text-center">
      <h2 className="text-base font-semibold text-foreground">{tp("Halaman tidak ditemukan")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {tp("Pekerjaan yang Anda cari tidak tersedia di akun ini.")}
      </p>
      <Link
        href="/portal"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {tp("Kembali ke daftar pekerjaan")}
      </Link>
    </div>
  );
}
