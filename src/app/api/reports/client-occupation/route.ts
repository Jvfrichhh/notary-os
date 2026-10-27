import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { getJakartaToday } from "@/lib/format";
import { buildClientOccupationDocx, buildClientOccupationXlsx, gatherClientOccupation, parsePeriod } from "@/lib/reports/clientOccupation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unduh laporan tahunan pekerjaan/profesi klien: ?year=YYYY|all&format=docx|xlsx */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }
  // Laporan wajib Notaris: hak yang sama dengan laporan bulanan MPD.
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_REPERTORIUM))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const yearParam = req.nextUrl.searchParams.get("year");
  const format = req.nextUrl.searchParams.get("format") ?? "docx";
  if (!yearParam || !/^(all|\d{4})$/.test(yearParam) || (format !== "docx" && format !== "xlsx")) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }
  const period = parsePeriod(yearParam, getJakartaToday().getUTCFullYear());

  const data = await gatherClientOccupation(period);
  const buffer = format === "xlsx" ? buildClientOccupationXlsx(data) : buildClientOccupationDocx(data);

  await writeAuditLog({
    userId: session.user.id,
    action: "annual_report_downloaded",
    entityType: "AnnualReport",
    entityId: `client-occupation:${yearParam}`,
    newValue: { format, clients: data.total, missing: data.missing }
  });

  const name = `Laporan_Pekerjaan_Klien_${period === "all" ? "Semua" : period}.${format}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store"
    }
  });
}
