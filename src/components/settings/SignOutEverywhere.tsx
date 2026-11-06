"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { signOutEverywhere } from "@/app/(dashboard)/settings/actions";
import { useT } from "@/components/i18n/LocaleProvider";

export function SignOutEverywhere() {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!confirm ? (
        <button type="button" onClick={() => setConfirm(true)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          {t("settings.signOutAll")}
        </button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">{t("settings.signOutAllConfirm")}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await signOutEverywhere();
                await signOut({ callbackUrl: "/login" });
              })
            }
            className="rounded-md bg-status-overdue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t("common.processing") : t("settings.signOutAllYes")}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="text-sm text-muted-foreground hover:underline">
            {t("common.cancel")}
          </button>
        </>
      )}
    </div>
  );
}
