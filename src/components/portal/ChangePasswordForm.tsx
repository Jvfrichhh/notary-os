"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { changePortalPassword, type ChangePasswordState } from "@/app/portal/(app)/account/password/actions";

const initial: ChangePasswordState = {};

function Field({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          name={name}
          required
          autoComplete={autoComplete}
          className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Sembunyikan" : "Tampilkan"}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Password Baru"}
    </button>
  );
}

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action] = useFormState(changePortalPassword, initial);
  return (
    <form action={action} className="space-y-4">
      <Field name="currentPassword" label={forced ? "Password sementara" : "Password saat ini"} autoComplete="current-password" />
      <Field name="newPassword" label="Password baru (min. 8 karakter, huruf & angka)" autoComplete="new-password" />
      <Field name="confirmPassword" label="Ulangi password baru" autoComplete="new-password" />
      {state.error && <p className="text-sm text-status-overdue">{state.error}</p>}
      <Submit />
    </form>
  );
}
