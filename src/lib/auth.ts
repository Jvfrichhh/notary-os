import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isAllowedRedirectHost } from "@/lib/hosts";
import {
  clientIp,
  comparePassword,
  isLoginLocked,
  LOGIN_LOCKED_ERROR,
  normalizeEmail,
  passwordVersion,
  recordLoginFailure
} from "@/lib/loginGuard";

/** Sesi berlaku 12 jam sejak aktivitas terakhir; setelah itu wajib login ulang. */
const SESSION_MAX_AGE = 12 * 60 * 60;

/** Nilai `role` yang ditulis ke session untuk akun portal klien (bukan Role RBAC). */
export const CLIENT_PORTAL_ROLE = "CLIENT";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },
  pages: {
    signIn: "/login"
  },
  providers: [
    // ------------------------------------------------------------------
    // 1) Akun INTERNAL (NOTARY / ADMIN / STAFF / VIEWER) — tidak berubah.
    // ------------------------------------------------------------------
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeEmail(credentials.email);
        const ip = clientIp(req?.headers);
        if (await isLoginLocked("staff", email, ip)) throw new Error(LOGIN_LOCKED_ERROR);

        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: true }
        });

        const isValid = await comparePassword(credentials.password, user?.passwordHash);
        if (!user || !user.isActive || !isValid) {
          await recordLoginFailure("staff", email, ip, !user ? "unknown_account" : !user.isActive ? "inactive" : "wrong_password");
          return null;
        }

        // Satu akun = satu sesi: login baru mengganti penanda sesi, sehingga
        // browser lain yang masih login otomatis dikeluarkan (lihat callback jwt).
        const sid = randomUUID();
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), activeSessionId: sid }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          kind: "staff" as const,
          sid
        };
      }
    }),

    // ------------------------------------------------------------------
    // 2) Akun PORTAL KLIEN — tabel client_accounts, terpisah dari users.
    //    Dipanggil dari /portal/login lewat signIn("client-credentials").
    //    Akun internal TIDAK bisa login lewat provider ini, dan sebaliknya.
    // ------------------------------------------------------------------
    CredentialsProvider({
      id: "client-credentials",
      name: "Portal Klien",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeEmail(credentials.email);
        const ip = clientIp(req?.headers);
        if (await isLoginLocked("client", email, ip)) throw new Error(LOGIN_LOCKED_ERROR);

        const account = await prisma.clientAccount.findUnique({
          where: { email },
          include: { client: { select: { id: true, fullName: true, status: true } } }
        });

        // Akun nonaktif, atau record Client-nya diarsipkan/dihapus -> tolak.
        // Pesan error ke user sengaja generik (lihat /portal/login).
        const isValid = await comparePassword(credentials.password, account?.passwordHash);
        if (!account || !account.isActive || account.client.status !== "ACTIVE" || !isValid) {
          await recordLoginFailure("client", email, ip, !account ? "unknown_account" : !isValid ? "wrong_password" : "inactive");
          return null;
        }

        await prisma.clientAccount.update({
          where: { id: account.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: account.id,
          name: account.name ?? account.client.fullName,
          email: account.email,
          role: CLIENT_PORTAL_ROLE,
          kind: "client" as const,
          clientId: account.client.id,
          pwv: passwordVersion(account.passwordHash)
        };
      }
    })
  ],
  events: {
    // Logout akun internal: hapus penanda sesi di database supaya token yang
    // mungkin masih tersimpan (mis. disalin dari browser) tidak bisa dipakai lagi.
    async signOut({ token }) {
      if (token?.kind === "staff" && token.id && token.sid) {
        await prisma.user.updateMany({ where: { id: token.id, activeSessionId: token.sid }, data: { activeSessionId: null } });
      }
    }
  },
  callbacks: {
    /**
     * Tujuan redirect setelah signIn/signOut. Default NextAuth hanya
     * mengizinkan origin NEXTAUTH_URL; dengan domain portal terpisah,
     * host portal/kantor yang terdaftar (lib/hosts.ts) juga diizinkan.
     * Host lain -> kembali ke baseUrl (anti open-redirect).
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl || isAllowedRedirectHost(u.host)) return url;
      } catch {
        /* url tidak valid -> fallback */
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.kind = user.kind;
        token.clientId = user.clientId;
        token.sid = user.sid;
        token.pwv = user.pwv;
        token.revoked = false;
        return token;
      }
      // Kompatibilitas: token lama (sebelum portal klien ada) tidak punya
      // `kind` -- semua token lama pasti akun internal.
      if (!token.kind) token.kind = "staff";
      // Akun internal: sesi ini masih yang berlaku? (dijalankan di server
      // setiap sesi dibaca; middleware Edge tidak memanggil callback ini).
      if (token.kind === "staff" && token.id && !token.revoked) {
        const u = await prisma.user.findUnique({ where: { id: token.id }, select: { activeSessionId: true, isActive: true } });
        if (!u || !u.isActive || !token.sid || u.activeSessionId !== token.sid) token.revoked = true;
      }
      // Akun portal: password diganti/di-reset kantor sejak login -> sesi lama gugur.
      if (token.kind === "client" && token.id && !token.revoked) {
        const a = await prisma.clientAccount.findUnique({ where: { id: token.id }, select: { passwordHash: true, isActive: true } });
        if (!a || !a.isActive || !token.pwv || passwordVersion(a.passwordHash) !== token.pwv) token.revoked = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.kind = token.kind;
        session.user.clientId = token.clientId;
        session.user.revoked = token.revoked === true;
      }
      return session;
    }
  }
};
