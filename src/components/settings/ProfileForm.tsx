"use client";

import { useActionState } from "react";
import { updateOwnProfile, type ProfileState } from "@/app/(dashboard)/settings/actions";
import { useT } from "@/components/i18n/LocaleProvider";

export function ProfileForm({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateOwnProfile, {});
  const t = useT();
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
            {t("settings.displayName")}
          </label>
          <input
            id="name"
            name="name"
            defaultValue={name}
            maxLength={80}
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.displayNameHint")}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{t("settings.emailLogin")}</label>
          <input value={email} readOnly className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
          <p className="mt-1 text-xs text-muted-foreground">{t("settings.roleHint", { role: roleLabel })}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {pending ? t("common.saving") : t("common.save")}
        </button>
        {state.ok && <span className="text-sm text-status-on-track">{t(state.ok)}</span>}
        {state.error && <span className="text-sm text-status-overdue">{t(state.error)}</span>}
      </div>
    </form>
  );
}
