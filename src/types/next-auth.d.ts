import "next-auth";

/**
 * Dua jenis principal dalam satu NextAuth:
 *  - "staff"  : akun internal (tabel users, punya Role/Permission RBAC)
 *  - "client" : akun portal klien (tabel client_accounts, terikat ke satu Client)
 *
 * `kind` ditulis ke JWT oleh server saat login dan TIDAK bisa diubah browser
 * (JWT ditandatangani NEXTAUTH_SECRET). Semua guard server memakai `kind`
 * ini, lalu memverifikasi ulang ke database.
 */
export type SessionKind = "staff" | "client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      kind: SessionKind;
      /** Hanya terisi untuk kind === "client". */
      clientId?: string;
      /** true bila akun ini sudah login di browser lain (sesi ini tidak berlaku lagi). */
      revoked?: boolean;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    kind: SessionKind;
    clientId?: string;
    /** Penanda sesi login akun internal. */
    sid?: string;
    /** Sidik password akun portal (lihat lib/loginGuard.ts). */
    pwv?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    kind: SessionKind;
    clientId?: string;
    sid?: string;
    pwv?: string;
    revoked?: boolean;
  }
}
