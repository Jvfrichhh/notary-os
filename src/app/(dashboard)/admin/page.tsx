import Link from "next/link";
import { Users, ShieldCheck, ScrollText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/session";
import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";
import { ADMIN_PAGE_PERMISSIONS } from "@/lib/navigation";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAnyPermission(ADMIN_PAGE_PERMISSIONS);
  const perms = await getUserPermissions(user.id);

  const [userCount, activeUsers, roleCount, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.role.count(),
    prisma.auditLog.count()
  ]);

  const sections = [
    perms.has(PERMISSIONS.MANAGE_USERS) && {
      href: "/admin/users",
      icon: Users,
      title: "Users",
      desc: "Tambah staff, ubah role, reset password, nonaktifkan.",
      stat: `${activeUsers} aktif / ${userCount} total`
    },
    (perms.has(PERMISSIONS.MANAGE_ROLES) || perms.has(PERMISSIONS.MANAGE_USERS)) && {
      href: "/admin/roles",
      icon: ShieldCheck,
      title: "Roles & Permissions",
      desc: "Matriks izin tiap role (tampilan baca).",
      stat: `${roleCount} role`
    },
    perms.has(PERMISSIONS.VIEW_AUDIT_LOG) && {
      href: "/admin/audit-log",
      icon: ScrollText,
      title: "Audit Log",
      desc: "Jejak semua aksi: siapa, kapan, apa yang berubah.",
      stat: `${auditCount} catatan`
    }
  ].filter(Boolean) as { href: string; icon: typeof Users; title: string; desc: string; stat: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground">Users, Roles &amp; Audit Log</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <s.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              <p className="mt-3 text-xs font-medium text-foreground">{s.stat}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
