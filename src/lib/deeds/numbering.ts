import { prisma } from "@/lib/prisma";

/**
 * Nomor akta berikutnya untuk bulan tanggal `ymd` (YYYY-MM-DD). Nomor akta
 * berulang tiap bulan dan disimpan sebagai "nomor/MM/YYYY".
 */
export async function nextDeedNumber(ymd: string): Promise<string> {
  const [y, m] = ymd.split("-");
  if (!y || !m) return "";
  const rows = await prisma.deed.findMany({ where: { deedNumber: { endsWith: `/${m}/${y}` } }, select: { deedNumber: true } });
  const max = rows.reduce((acc, r) => Math.max(acc, Number(r.deedNumber.split("/")[0]) || 0), 0);
  return String(max + 1);
}
