import Link from "next/link";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

// Tampilan BACA SAJA. Mengubah izin lewat UI sengaja belum disediakan:
// salah klik bisa mengunci akses kantor sendiri. Perubahan izin dilakukan
// lewat seed/migrasi yang ditinjau.
export default async function AdminRolesPage() {
  await requireAnyPermission([PERMISSIONS.MANAGE_ROLES, PERMISSIONS.MANAGE_USERS]);

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, permissions: { select: { permissionId: true } }, _count: { select: { users: true } } }
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true } })
  ]);

  const has = new Map<string, Set<string>>(
    roles.map((r) => [r.id, new Set<string>(r.permissions.map((p) => p.permissionId))] as [string, Set<string>])
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Roles &amp; Permissions</h1>
        <p className="text-sm text-muted-foreground">Matriks izin saat ini (baca saja). Perubahan izin dilakukan lewat kode yang ditinjau.</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-4 py-3 text-center">
                  {r.name}
                  <div className="text-[10px] font-normal normal-case">{r._count.users} user</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {permissions.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-mono text-xs text-foreground">{p.key}</td>
                {roles.map((r) => (
                  <td key={r.id} className="px-4 py-2 text-center">
                    {has.get(r.id)?.has(p.id) ? <Check className="mx-auto h-4 w-4 text-status-on-track" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
