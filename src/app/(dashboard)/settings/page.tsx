import Link from "next/link";
import { KeyRound, Monitor, Smartphone } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { SignOutEverywhere } from "@/components/settings/SignOutEverywhere";
import { NOTARIS, PPAT } from "@/lib/deeds/common";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { NOTARY: "Notaris", ADMIN: "Admin", STAFF: "Staf", VIEWER: "Pengamat" };

/** Pengaturan akun: profil, tampilan, keamanan, info kantor & aplikasi. */
export default async function SettingsPage() {
  const user = await requireUser();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, lastLoginAt: true, createdAt: true } });
  const name = row?.name ?? user.name ?? "";
  const email = row?.email ?? user.email ?? "";
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-extrabold text-primary">{initials || "?"}</span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {roleLabel} · {email}
          </p>
        </div>
      </div>

      <Card>
        <h2 className="text-base font-bold text-foreground">Profil</h2>
        <p className="mb-4 text-xs text-muted-foreground">Data akun Anda di Nexora.</p>
        <ProfileForm name={name} email={email} roleLabel={roleLabel} />
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">Tampilan</h2>
        <p className="mb-4 text-xs text-muted-foreground">Pilihan diingat di perangkat ini.</p>
        <AppearanceSettings />
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">Keamanan</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Masuk terakhir: {row?.lastLoginAt ? formatDateTime(row.lastLoginAt) : "-"} · Akun dibuat: {row?.createdAt ? formatDateTime(row.createdAt) : "-"}. Satu akun hanya aktif di satu perangkat pada satu waktu.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/account/password" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <KeyRound className="h-4 w-4" /> Ganti password
          </Link>
          <SignOutEverywhere />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">Kantor</h2>
        <p className="mb-4 text-xs text-muted-foreground">Identitas yang dicetak pada akta dan surat. Perubahan dilakukan lewat pengembang.</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Notaris</dt><dd className="font-medium text-foreground">{NOTARIS.namaSingkat}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Kedudukan</dt><dd className="font-medium text-foreground">{NOTARIS.kedudukan}, {NOTARIS.wilayah}</dd></div>
          <div><dt className="text-xs text-muted-foreground">SK PPAT</dt><dd className="font-medium text-foreground">{PPAT.skNomor || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Daerah kerja PPAT</dt><dd className="font-medium text-foreground">{PPAT.daerahKerja}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Alamat kantor</dt><dd className="font-medium text-foreground">{PPAT.alamatSurat}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Telepon</dt><dd className="font-medium text-foreground">{PPAT.telepon}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="font-medium text-foreground">{PPAT.email}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">Aplikasi</h2>
        <p className="mb-4 text-xs text-muted-foreground">Versi {(process.env.APP_VERSION ?? "dev").slice(0, 12)} · pembaruan dipasang otomatis.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-border p-4">
            <Monitor className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-bold text-foreground">Pasang di laptop/PC</p>
              <p className="text-xs text-muted-foreground">Chrome/Edge: klik ikon Install di ujung kanan address bar, atau menu ⋮ › Install Nexora.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-border p-4">
            <Smartphone className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-bold text-foreground">Pasang di HP</p>
              <p className="text-xs text-muted-foreground">Android: menu ⋮ › Tambahkan ke layar utama. iPhone: Bagikan › Tambah ke Layar Utama.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
