import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { getFileStorage } from "@/lib/storage";
import { isArchiveKey } from "@/lib/compliance/backup";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unduh file backup / ekspor protokol (khusus pemegang manage_users = Notaris). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }
  if (!(await userHasPermission(session.user.id, PERMISSIONS.MANAGE_USERS))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!isArchiveKey(key)) return NextResponse.json({ error: "File tidak valid." }, { status: 400 });
  await writeAuditLog({ userId: session.user.id, action: "archive_downloaded", entityType: "Backup", entityId: key });
  const url = await getFileStorage().getSignedUrl(key, 300);
  return NextResponse.redirect(url);
}
