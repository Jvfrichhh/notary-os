"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, UserPlus, Copy, Check } from "lucide-react";
import {
  changeInternalUserRole,
  createInternalUser,
  resetInternalUserPassword,
  setInternalUserActive,
  type UserAdminState
} from "@/app/(dashboard)/admin/users/actions";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
export type RoleOption = { id: string; name: string };

const initial: UserAdminState = {};

function Pending({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className + " disabled:opacity-60"}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

function TemporaryPasswordBox({ state }: { state: UserAdminState }) {
  const [copied, setCopied] = useState(false);
  if (!state.temporaryPassword) return null;
  const text = `Akun Notary OS\nEmail: ${state.email}\nPassword sementara: ${state.temporaryPassword}\nSegera ganti password lewat ikon kunci di pojok kanan atas.`;
  return (
    <div className="mt-3 rounded-md border border-status-due-today/40 bg-status-due-today/5 p-3 text-sm">
      <p className="text-foreground">{state.success}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="rounded bg-background px-2 py-1 font-mono text-base tracking-wider text-foreground">{state.temporaryPassword}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* salin manual */
            }
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin pesan"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function CreateUserForm({ roles }: { roles: RoleOption[] }) {
  const [state, action] = useFormState(createInternalUser, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input name="name" required placeholder="Nama lengkap" className={inputCls} />
        <input name="email" type="email" required placeholder="Email (untuk login)" className={inputCls} />
        <input name="phone" placeholder="No. HP (opsional)" className={inputCls} />
        <select name="roleId" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Pilih role
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Pending className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <UserPlus className="h-4 w-4" /> Tambah User
        </Pending>
        {state.error && <p className="text-sm text-status-overdue">{state.error}</p>}
      </div>
      <TemporaryPasswordBox state={state} />
    </form>
  );
}

function UserRow({ user, roles, isSelf }: { user: AdminUserRow; roles: RoleOption[]; isSelf: boolean }) {
  const [state, resetAction] = useFormState(resetInternalUserPassword.bind(null, user.id), initial);
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {user.name}
            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
            {!user.isActive && (
              <span className="ml-2 rounded-full bg-status-archived/10 px-2 py-0.5 text-[11px] font-medium text-status-archived">nonaktif</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ""} · login terakhir:{" "}
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "belum pernah"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={changeInternalUserRole.bind(null, user.id)} className="flex items-center gap-1">
            <select name="roleId" defaultValue={user.roleId} disabled={isSelf} className={inputCls + " py-1.5 text-xs"}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {!isSelf && (
              <Pending className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">Ubah role</Pending>
            )}
          </form>
          <form action={resetAction}>
            <Pending className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
              <KeyRound className="h-3.5 w-3.5" /> Reset password
            </Pending>
          </form>
          {!isSelf && (
            <form action={setInternalUserActive.bind(null, user.id, !user.isActive)}>
              <Pending
                className={
                  user.isActive
                    ? "rounded-md border border-status-overdue px-2.5 py-1.5 text-xs text-status-overdue hover:bg-status-overdue/10"
                    : "rounded-md border border-status-on-track px-2.5 py-1.5 text-xs text-status-on-track hover:bg-status-on-track/10"
                }
              >
                {user.isActive ? "Nonaktifkan" : "Aktifkan"}
              </Pending>
            </form>
          )}
        </div>
      </div>
      {state.error && <p className="mt-1 text-xs text-status-overdue">{state.error}</p>}
      <TemporaryPasswordBox state={state} />
    </li>
  );
}

export function UsersAdmin({ users, roles, currentUserId }: { users: AdminUserRow[]; roles: RoleOption[]; currentUserId: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-foreground">Tambah User Internal</h2>
        <CreateUserForm roles={roles} />
      </div>
      <div className="rounded-lg border border-border bg-background p-5 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-foreground">Daftar User ({users.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Akun Anda sendiri dan NOTARY aktif terakhir tidak bisa dinonaktifkan/diturunkan — supaya kantor tidak kehilangan akses.
        </p>
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <UserRow key={u.id} user={u} roles={roles} isSelf={u.id === currentUserId} />
          ))}
        </ul>
      </div>
    </div>
  );
}
