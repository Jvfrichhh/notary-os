import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { buildClientJobStatusDocx, buildClientJobStatusXlsx, gatherClientJobStatus, isYear } from "@/lib/reports/clientJobStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unduh laporan tahunan status pekerjaan klien: ?year=YYYY&format=docx|xlsx */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }
  // Laporan wajib Notaris: hak yang sama dengan laporan bulanan MPD.
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_REPERTORIUM))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const year = req.nextUrl.searchParams.get("year");
  const format = req.nextUrl.searchParams.get("format") ?? "docx";
  if (!isYear(year) || (format !== "docx" && format !== "xlsx")) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }

  const data = await gatherClientJobStatus(Number(year));
  const buffer = format === "xlsx" ? buildClientJobStatusXlsx(data) : buildClientJobStatusDocx(data);

  await writeAuditLog({
    userId: session.user.id,
    action: "annual_report_downloaded",
    entityType: "AnnualReport",
    entityId: `client-status:${year}`,
    newValue: { format, jobs: data.total, clients: data.clients.length }
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Laporan_Status_Pekerjaan_Klien_${year}.${format}"`,
      "Cache-Control": "no-store"
    }
  });
}
