import { readNewPortalAccount } from "@/lib/portalAccounts";
import { ClearPortalCookie } from "@/components/clients/ClearPortalCookie";

/** Pemberitahuan hasil "Buatkan akses portal klien" saat Tambah Klien. */
export async function PortalAccountBanner({ status }: { status: string }) {
  if (status === "taken") {
    return (
      <div className="rounded-md border border-status-due-soon/40 bg-status-due-soon/10 px-3 py-2 text-sm text-foreground">
        Akses portal belum dibuat: email klien sudah dipakai akun portal lain. Buat dengan email lain di halaman klien.
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm text-foreground">
        Akses portal gagal dibuat. Coba lagi dari kartu &quot;Akses Portal Klien&quot; di halaman klien.
      </div>
    );
  }
  const acc = status === "created" ? await readNewPortalAccount() : null;
  if (!acc) return null;
  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground">
      Akses portal klien dibuat. Sampaikan ke klien — <strong>email:</strong> {acc.email} · <strong>password sementara:</strong>{" "}
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{acc.pw}</code>. Klien wajib menggantinya saat login pertama.
      Password ini hanya tampil sekali (hilang bila halaman dimuat ulang); bila terlewat, reset dari halaman klien.
      <ClearPortalCookie />
    </div>
  );
}
