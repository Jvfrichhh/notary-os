import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          kind: "staff" as const
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.kind = user.kind;
        token.clientId = user.clientId;
      }
      // Kompatibilitas: token lama (sebelum portal klien ada) tidak punya
      // `kind` -- semua token lama pasti akun internal.
      if (!token.kind) token.kind = "staff";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.kind = token.kind;
        session.user.clientId = token.clientId;
      }
      return session;
    }
  }
};
