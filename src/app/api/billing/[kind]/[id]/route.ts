import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { getPortalPrincipal } from "@/lib/portalSession";
import { buildInvoiceDocx, buildReceiptDocx, loadBillingDoc } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unduh Tagihan (/api/billing/tagihan/<paymentId>) atau Kuitansi
 * (/api/billing/kuitansi/<receiptId>) dalam Word. Kantor: izin view_finance.
 * Portal klien: hanya tagihan/kuitansi miliknya sendiri.
 */
export async function GET(_req: NextRequest, { params }: { params: { kind: string; id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.revoked) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  let paymentId: string | null = null;
  let receipt: Awaited<ReturnType<typeof findReceipt>> = null;
  if (params.kind === "tagihan") paymentId = params.id;
  else if (params.kind === "kuitansi") {
    receipt = await findReceipt(params.id);
    paymentId = receipt?.paymentId ?? null;
  } else return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  const doc = paymentId ? await loadBillingDoc(paymentId) : null;
  if (!doc) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  let allowed: boolean;
  if (session.user.kind === "client") {
    // Klien: akun & data klien diperiksa ulang ke database; hanya tagihan aktif miliknya.
    const portal = await getPortalPrincipal();
    allowed =
      portal.ok &&
      !portal.principal.mustChangePassword &&
      portal.principal.clientId === doc.clientId &&
      !!(await prisma.payment.findFirst({ where: { id: paymentId!, clientId: doc.clientId, recordStatus: "ACTIVE" }, select: { id: true } })) &&
      // Kuitansi yang sudah dibatalkan tidak bisa diunduh klien.
      !(receipt && receipt.voidedAt);
  } else {
    allowed = await userHasPermission(session.user.id, PERMISSIONS.VIEW_FINANCE);
  }
  if (!allowed) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });

  let buffer: Buffer;
  let name: string;
  if (receipt) {
    // Sudah dibayar sebelum kuitansi ini = total dibayar sekarang dikurangi kuitansi sah sejak kuitansi ini.
    const later = await prisma.paymentReceipt.aggregate({
      where: { paymentId: receipt.paymentId, voidedAt: null, createdAt: { gte: receipt.createdAt } },
      _sum: { amount: true }
    });
    const paidBefore = Math.max(doc.paidAmount - Number(later._sum.amount ?? 0), 0);
    buffer = buildReceiptDocx(doc, { ...receipt, amount: Number(receipt.amount), receivedBy: receipt.receivedBy?.name ?? null, paidBefore });
    name = `Kuitansi_${receipt.receiptNumber.replace(/\//g, "-")}.docx`;
  } else {
    buffer = buildInvoiceDocx(doc);
    name = `Tagihan_${(doc.invoiceNumber ?? "draft").replace(/\//g, "-")}.docx`;
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store"
    }
  });
}

function findReceipt(id: string) {
  return prisma.paymentReceipt.findUnique({
    where: { id },
    select: {
      paymentId: true,
      receiptNumber: true,
      amount: true,
      paidAt: true,
      method: true,
      note: true,
      voidedAt: true,
      createdAt: true,
      receivedBy: { select: { name: true } }
    }
  });
}
