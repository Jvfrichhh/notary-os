import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { NOTARIS, PPAT } from "@/lib/deeds/common";
import { formatDate, getJakartaToday } from "@/lib/format";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tanda Terima Dokumen Asli (Word) untuk satu pekerjaan: yang diterima & yang sudah dikembalikan. */
export async function GET(_req: NextRequest, ctx: Async<{ params: { id: string } }>) {
  const { params } = await unwrapProps(ctx);
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.revoked || session.user.kind === "client") return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_JOBS))) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { jobNumber: true, description: true, serviceType: { select: { name: true } }, client: { select: { fullName: true, clientNumber: true, address: true } } }
  });
  if (!job) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  const rows = await prisma.originalDocument.findMany({ where: { jobId: params.id }, orderBy: { receivedAt: "asc" } });

  const kota = NOTARIS.kota.replace(/^Kota |^Kabupaten /, "");
  const blocks: DocBlock[] = [
    { t: "p", text: `**KANTOR NOTARIS ${NOTARIS.namaSingkat}**`, align: "center", spaceAfter: 0, size: 13 },
    { t: "p", text: `${NOTARIS.kedudukan} · PPAT daerah kerja ${PPAT.daerahKerja}`, align: "center", spaceAfter: 0 },
    { t: "p", text: `${PPAT.alamatSurat} · Telp. ${PPAT.telepon}`, align: "center", spaceAfter: 240, size: 10 },
    { t: "p", text: "TANDA TERIMA DOKUMEN ASLI", bold: true, align: "center", size: 14, spaceAfter: 240 },
    { t: "p", text: `Klien: **${job.client.fullName}** (${job.client.clientNumber})`, spaceAfter: 0 },
    ...(job.client.address ? [{ t: "p" as const, text: job.client.address, spaceAfter: 0 }] : []),
    { t: "p", text: `Pekerjaan: ${job.jobNumber}${job.serviceType?.name ? ` — ${job.serviceType.name}` : ""}`, spaceAfter: 240 },
    { t: "p", text: "Telah diterima dan disimpan di kantor dokumen asli sebagai berikut:", spaceAfter: 120 },
    {
      t: "table",
      header: ["No.", "Dokumen", "Diterima", "Dikembalikan"],
      widths: [0.6, 5, 2.2, 2.2],
      rows: rows.length
        ? rows.map((r, i) => [
            String(i + 1),
            `${r.description}${r.notes ? `\n(${r.notes})` : ""}`,
            `${formatDate(r.receivedAt)}${r.receivedFrom ? `\ndari ${r.receivedFrom}` : ""}`,
            r.returnedAt ? `${formatDate(r.returnedAt)}${r.returnedTo ? `\nkepada ${r.returnedTo}` : ""}` : "-"
          ])
        : [["-", "Belum ada dokumen asli yang dicatat", "", ""]]
    },
    { t: "p", text: "Dokumen asli akan dikembalikan kepada klien atau pihak yang berhak setelah pekerjaan selesai, dengan menandatangani tanda terima ini.", spaceAfter: 360 },
    { t: "p", text: `${kota}, ${formatDate(getJakartaToday())}`, align: "right", spaceAfter: 120 },
    {
      t: "table",
      noHeader: true,
      borderless: true,
      header: ["", ""],
      widths: [5, 5],
      rows: [
        ["Yang menyerahkan / menerima kembali,", "Yang menerima,"],
        ["\n\n\n", "\n\n\n"],
        [`(${job.client.fullName})`, `(${session.user.name ?? "Petugas kantor"})`]
      ]
    }
  ];
  const buffer = buildSimpleDocx(blocks, { title: `Tanda Terima Dokumen Asli ${job.jobNumber}` });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Tanda_Terima_Dokumen_Asli_${job.jobNumber}.docx"`,
      "Cache-Control": "no-store"
    }
  });
}
