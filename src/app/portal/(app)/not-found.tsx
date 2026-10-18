import Link from "next/link";

// Dipakai saat job tidak ditemukan ATAU bukan milik klien yang login --
// keduanya sengaja menampilkan halaman yang sama.
export default function PortalNotFound() {
  return (
    <div className="rounded-lg border border-border bg-background p-8 text-center">
      <h2 className="text-base font-semibold text-foreground">Halaman tidak ditemukan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pekerjaan yang Anda cari tidak tersedia di akun ini.
      </p>
      <Link
        href="/portal"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Kembali ke daftar pekerjaan
      </Link>
    </div>
  );
}
