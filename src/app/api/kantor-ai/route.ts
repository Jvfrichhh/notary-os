import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasPermission, PERMISSIONS } from "@/lib/permissions";
import { getKantorAiSnapshot } from "@/lib/kantorAi";

// Data selalu terbaru; dipanggil halaman /kantor-ai tiap menit.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }
  // Sama dengan halaman /kantor-ai dan menu Pekerjaan lain (data job).
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_JOBS))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const snapshot = await getKantorAiSnapshot();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
