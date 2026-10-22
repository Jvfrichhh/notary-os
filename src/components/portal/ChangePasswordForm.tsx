"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
export interface ChangePasswordState {
  error?: string;
  /**
   * Password berhasil diganti dan sesi lama otomatis gugur (lihat
   * lib/loginGuard.ts) -> form langsung login ulang dengan password baru.
   */
  relogin?: { provider: string; email: string; redirectTo: string };
}
type ChangePasswordAction = (prev: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>;

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

/**
 * Form ganti password generik (dipakai portal klien DAN akun internal).
 * `action` = server action yang memverifikasi password lama & menyimpan yang baru.
 */
export function ChangePasswordForm({ forced, action: serverAction }: { forced: boolean; action: ChangePasswordAction }) {
  const [state, action] = useFormState(serverAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [reloginFailed, setReloginFailed] = useState(false);

  useEffect(() => {
    const r = state.relogin;
    if (!r) return;
    const password = String(new FormData(formRef.current ?? undefined).get("newPassword") ?? "");
    signIn(r.provider, { email: r.email, password, redirect: false })
      .then((res) => {
        if (res?.error) setReloginFailed(true);
        else window.location.href = r.redirectTo;
      })
      .catch(() => setReloginFailed(true));
  }, [state.relogin]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field name="currentPassword" label={forced ? "Password sementara" : "Password saat ini"} autoComplete="current-password" />
      <Field name="newPassword" label="Password baru (min. 10 karakter, huruf & angka)" autoComplete="new-password" />
      <Field name="confirmPassword" label="Ulangi password baru" autoComplete="new-password" />
      {state.error && <p className="text-sm text-status-overdue">{state.error}</p>}
      {state.relogin && (
        <p className="text-sm text-muted-foreground">
          {reloginFailed ? "Password tersimpan. Silakan masuk lagi dengan password baru." : "Password tersimpan. Memuat ulang sesi..."}
        </p>
      )}
      <Submit />
    </form>
  );
}
