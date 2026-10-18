import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requirePermission(PERMISSIONS.MANAGE_USERS);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, email: true, phone: true, roleId: true, isActive: true, lastLoginAt: true, createdAt: true, role: { select: { name: true } } }
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Akun internal kantor (bukan akun portal klien — itu dikelola di halaman masing-masing klien).</p>
      </div>
      <UsersAdmin
        currentUserId={me.id}
        roles={roles}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          roleId: u.roleId,
          roleName: u.role.name,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          createdAt: u.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
