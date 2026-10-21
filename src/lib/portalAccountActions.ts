"use server";

import { cookies } from "next/headers";

/** Cookie "portal_new_account" berisi password sementara; dihapus begitu sudah ditampilkan. */
export async function clearNewPortalAccount(path: string) {
  const safePath = typeof path === "string" && path.startsWith("/") ? path.slice(0, 200) : "/";
  cookies().set("portal_new_account", "", { path: safePath, maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
