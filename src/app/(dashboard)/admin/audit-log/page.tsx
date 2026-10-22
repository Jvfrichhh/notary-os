import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: { entity?: string; action?: string; q?: string; page?: string };
}

/** Ringkas objek JSON audit jadi "key: a → b" yang terbaca manusia. */
function summarizeChange(prev: unknown, next: unknown): string {
  const p = (prev && typeof prev === "object" ? prev : {}) as Record<string, unknown>;
  const n = (next && typeof next === "object" ? next : {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(p), ...Object.keys(n)]));
  if (keys.length === 0) return "";
  return keys
    .slice(0, 6)
    .map((k) => {
      const a = p[k];
      const b = n[k];
      const fmt = (v: unknown) => (v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
      return a !== undefined && b !== undefined && JSON.stringify(a) !== JSON.stringify(b)
        ? `${k}: ${fmt(a)} → ${fmt(b)}`
        : `${k}: ${fmt(b !== undefined ? b : a)}`;
    })
    .join(" · ");
}

/** Label pelaku: user internal, atau "Klien (portal)" untuk aksi dari portal. */
function actorLabel(userName: string | null | undefined, action: string): string {
  if (userName) return userName;
  if (action.startsWith("client_")) return "Klien (portal)";
  return "Sistem";
}

export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  await requirePermission(PERMISSIONS.VIEW_AUDIT_LOG);

  const page = Math.max(1, Number(searchParams.page) || 1);
  const entity = searchParams.entity?.trim() || "";
  const action = searchParams.action?.trim() || "";
  const q = searchParams.q?.trim() || "";

  const where = {
    ...(entity ? { entityType: entity } : {}),
    ...(action ? { action } : {}),
    ...(q ? { OR: [{ entityId: { contains: q } }, { user: { name: { contains: q, mode: "insensitive" as const } } }] } : {})
  };

  const [total, logs, entityTypes, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, action: true, entityType: true, entityId: true, previousValue: true, newValue: true, timestamp: true, user: { select: { name: true } } }
    }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { entity, action, q, page: String(page), ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && !(k === "page" && String(v) === "1")) params.set(k, String(v));
    });
    const s = params.toString();
    return `/admin/audit-log${s ? `?${s}` : ""}`;
  };

  const selectCls = "rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted-foreground hover:text-foreground">
          ← Admin
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Catatan append-only: tidak bisa diubah atau dihapus dari aplikasi. {total} catatan cocok.</p>
      </div>

      <Card>
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select name="entity" defaultValue={entity} className={selectCls}>
            <option value="">Semua entitas</option>
            {entityTypes.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
          <select name="action" defaultValue={action} className={selectCls}>
            <option value="">Semua aksi</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Cari nama pelaku / ID entitas" className={selectCls + " flex-1"} />
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Filter
          </button>
          {(entity || action || q) && (
            <Link href="/admin/audit-log" className="text-xs text-muted-foreground hover:text-foreground">
              Reset
            </Link>
          )}
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        {logs.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Tidak ada catatan yang cocok." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pelaku</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{formatDateTime(l.timestamp)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-foreground">{actorLabel(l.user?.name, l.action)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-foreground">{l.action}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {l.entityType}
                    <span className="block font-mono text-[10px]">{l.entityId}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{summarizeChange(l.previousValue, l.newValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs({ page: page - 1 })} className="text-primary hover:underline">
              ← Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            Halaman {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={qs({ page: page + 1 })} className="text-primary hover:underline">
              Berikutnya →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
