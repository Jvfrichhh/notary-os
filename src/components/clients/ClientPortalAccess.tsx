"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, UserPlus, Copy, Check } from "lucide-react";
import {
  createClientPortalAccount,
  resetClientPortalPassword,
  setClientPortalAccountActive,
  type PortalAccountActionState
} from "@/app/(dashboard)/clients/portal-actions";

type Account = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null; // ISO; dikirim dari server component
  createdAt: string;
};

const initial: PortalAccountActionState = {};

function Pending({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className + " disabled:opacity-60"}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

/** Kotak password sementara: tampil sekali, bisa disalin. */
function TemporaryPasswordBox({ state }: { state: PortalAccountActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state.temporaryPassword) return null;
  const text = `Akses Portal Klien Notary OS\nEmail: ${state.email}\nPassword sementara: ${state.temporaryPassword}\n(Wajib diganti saat login pertama)`;
  return (
    <div className="mt-3 rounded-md border border-status-due-today/40 bg-status-due-today/5 p-3 text-sm">
      <p className="text-foreground">{state.success}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="rounded bg-background px-2 py-1 font-mono text-base tracking-wider text-foreground">
          {state.temporaryPassword}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard tidak tersedia -> staff salin manual */
            }
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin pesan untuk klien"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Password ini tidak disimpan dan tidak bisa dilihat lagi setelah halaman ditutup. Jika hilang, gunakan Reset.
      </p>
    </div>
  );
}

function CreateForm({ clientId, defaultEmail }: { clientId: string; defaultEmail: string }) {
  const [state, action] = useFormState(createClientPortalAccount.bind(null, clientId), initial);
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          placeholder="Email klien untuk login"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          name="name"
          placeholder="Nama tampilan (opsional)"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Pending className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <UserPlus className="h-4 w-4" /> Buat Akses Portal
        </Pending>
      </div>
      {state.error && <p className="text-sm text-status-overdue">{state.error}</p>}
      <TemporaryPasswordBox state={state} />
    </form>
  );
}

function AccountRow({ account, canManage }: { account: Account; canManage: boolean }) {
  const [state, resetAction] = useFormState(resetClientPortalPassword.bind(null, account.id), initial);
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {account.email}
            {!account.isActive && (
              <span className="ml-2 rounded-full bg-status-archived/10 px-2 py-0.5 text-[11px] font-medium text-status-archived">
                nonaktif
              </span>
            )}
            {account.isActive && account.mustChangePassword && (
              <span className="ml-2 rounded-full bg-status-due-soon/10 px-2 py-0.5 text-[11px] font-medium text-status-due-soon">
                belum ganti password
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {account.name ?? "—"} · login terakhir:{" "}
            {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("id-ID") : "belum pernah"}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <form action={resetAction}>
              <Pending className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                <KeyRound className="h-3.5 w-3.5" /> Reset password
              </Pending>
            </form>
            <form action={setClientPortalAccountActive.bind(null, account.id, !account.isActive)}>
              <Pending
                className={
                  account.isActive
                    ? "rounded-md border border-status-overdue px-2.5 py-1.5 text-xs text-status-overdue hover:bg-status-overdue/10"
                    : "rounded-md border border-status-on-track px-2.5 py-1.5 text-xs text-status-on-track hover:bg-status-on-track/10"
                }
              >
                {account.isActive ? "Nonaktifkan" : "Aktifkan"}
              </Pending>
            </form>
          </div>
        )}
      </div>
      {state.error && <p className="mt-1 text-xs text-status-overdue">{state.error}</p>}
      <TemporaryPasswordBox state={state} />
    </li>
  );
}

export function ClientPortalAccess({
  clientId,
  clientEmail,
  clientActive,
  accounts,
  canManage
}: {
  clientId: string;
  clientEmail: string | null;
  clientActive: boolean;
  accounts: Account[];
  canManage: boolean;
}) {
  return (
    <div>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Klien ini belum memiliki akses portal.</p>
      ) : (
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} canManage={canManage} />
          ))}
        </ul>
      )}
      {canManage && clientActive && <CreateForm clientId={clientId} defaultEmail={clientEmail ?? ""} />}
      {canManage && !clientActive && (
        <p className="mt-2 text-xs text-muted-foreground">Klien diarsipkan — akses portal tidak dapat dibuat.</p>
      )}
    </div>
  );
}
