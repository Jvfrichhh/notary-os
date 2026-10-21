import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { buildMpdReport, buildWasiatReport, gatherMonth, isYm } from "@/lib/compliance/monthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unduh laporan bulanan (.docx): ?kind=mpd|wasiat&month=YYYY-MM */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_REPERTORIUM))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const kind = req.nextUrl.searchParams.get("kind");
  const month = req.nextUrl.searchParams.get("month");
  if ((kind !== "mpd" && kind !== "wasiat") || !isYm(month)) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }
  const data = await gatherMonth(month);
  const buffer = kind === "mpd" ? buildMpdReport(month, data) : buildWasiatReport(month, data);
  const name = kind === "mpd" ? `Laporan_Bulanan_MPD_${month}.docx` : `Laporan_Wasiat_${month}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store"
    }
  });
}
