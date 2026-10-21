import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isAllowedRedirectHost } from "@/lib/hosts";

/** Nilai `role` yang ditulis ke session untuk akun portal klien (bukan Role RBAC). */
export const CLIENT_PORTAL_ROLE = "CLIENT";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true }
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const account = await prisma.clientAccount.findUnique({
          where: { email: credentials.email },
          include: { client: { select: { id: true, fullName: true, status: true } } }
        });

        // Akun nonaktif, atau record Client-nya diarsipkan/dihapus -> tolak.
        // Pesan error ke user sengaja generik (lihat /portal/login).
        if (!account || !account.isActive || account.client.status !== "ACTIVE") return null;

        const isValid = await bcrypt.compare(credentials.password, account.passwordHash);
        if (!isValid) return null;

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
          clientId: account.client.id
        };
      }
    })
  ],
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
