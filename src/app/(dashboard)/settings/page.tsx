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
import { getT } from "@/lib/i18n/server";
import { LanguageSettings } from "@/components/settings/LanguageSettings";

export const dynamic = "force-dynamic";

/** Pengaturan akun: profil, tampilan, keamanan, info kantor & aplikasi. */
export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getT();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, lastLoginAt: true, createdAt: true } });
  const name = row?.name ?? user.name ?? "";
  const email = row?.email ?? user.email ?? "";
  const roleLabel = t(`roles.${user.role}`) === `roles.${user.role}` ? user.role : t(`roles.${user.role}`);
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
        <h2 className="text-base font-bold text-foreground">{t("settings.profile")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.profileHint")}</p>
        <ProfileForm name={name} email={email} roleLabel={roleLabel} />
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">{t("settings.appearance")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.appearanceHint")}</p>
        <AppearanceSettings />
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">{t("settings.language")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.languageHint")}</p>
        <LanguageSettings />
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">{t("settings.security")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {t("settings.securityHint", { last: row?.lastLoginAt ? formatDateTime(row.lastLoginAt) : "-", created: row?.createdAt ? formatDateTime(row.createdAt) : "-" })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/account/password" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <KeyRound className="h-4 w-4" /> {t("settings.changePassword")}
          </Link>
          <SignOutEverywhere />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">{t("settings.office")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.officeHint")}</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">{t("settings.notary")}</dt><dd className="font-medium text-foreground">{NOTARIS.namaSingkat}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("settings.seat")}</dt><dd className="font-medium text-foreground">{NOTARIS.kedudukan}, {NOTARIS.wilayah}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("settings.ppatDecree")}</dt><dd className="font-medium text-foreground">{PPAT.skNomor || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("settings.ppatArea")}</dt><dd className="font-medium text-foreground">{PPAT.daerahKerja}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">{t("settings.officeAddress")}</dt><dd className="font-medium text-foreground">{PPAT.alamatSurat}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("settings.phone")}</dt><dd className="font-medium text-foreground">{PPAT.telepon}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t("settings.email")}</dt><dd className="font-medium text-foreground">{PPAT.email}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-base font-bold text-foreground">{t("settings.app")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("settings.appHint", { version: (process.env.APP_VERSION ?? "dev").slice(0, 12) })}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-border p-4">
            <Monitor className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-bold text-foreground">{t("settings.installDesktop")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.installDesktopHint")}</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-border p-4">
            <Smartphone className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-bold text-foreground">{t("settings.installPhone")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.installPhoneHint")}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
