import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { buildSimpleDocx } from "@/lib/office/simpleDocx";
import { NOTARIS } from "@/lib/deeds/common";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Formulir persetujuan pemrosesan data pribadi (UU PDP) untuk ditandatangani klien. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_CLIENTS))) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const c = await prisma.client.findUnique({ where: { id: params.id }, select: { fullName: true, nik: true, address: true, clientNumber: true } });
  if (!c) return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const tgl = `${now.getUTCDate()} ${BULAN[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const kota = NOTARIS.kota.replace(/^Kota |^Kabupaten /, "");
  const buffer = buildSimpleDocx(
    [
      { t: "p", text: "PERSETUJUAN PEMROSESAN DATA PRIBADI", bold: true, align: "center", size: 13, spaceAfter: 240 },
      { t: "p", text: "Saya yang bertanda tangan di bawah ini:", spaceAfter: 60 },
      {
        t: "table",
        header: ["", ""],
        noHeader: true,
        widths: [3, 7],
        rows: [
          ["Nama", c.fullName],
          ["NIK", c.nik ?? ".............................."],
          ["Alamat", c.address ?? ".............................."],
          ["No. Klien", c.clientNumber]
        ]
      },
      {
        t: "p",
        align: "both",
        text: `dengan ini menyatakan telah memperoleh penjelasan dan MENYETUJUI Kantor Notaris/PPAT ${NOTARIS.namaSingkat} untuk mengumpulkan, menyimpan, dan memproses data pribadi saya (termasuk KTP, Kartu Keluarga, NPWP, dokumen kepemilikan, dan data lain yang saya serahkan) untuk keperluan:`
      },
      { t: "p", text: "1. pembuatan akta dan pelaksanaan layanan yang saya minta;", spaceAfter: 0 },
      { t: "p", text: "2. pemenuhan kewajiban hukum Notaris/PPAT, termasuk penyimpanan protokol dan pelaporan kepada instansi yang berwenang;", spaceAfter: 0 },
      { t: "p", text: "3. komunikasi terkait layanan tersebut, termasuk melalui portal klien dan pesan elektronik.", spaceAfter: 120 },
      {
        t: "p",
        align: "both",
        text: "Saya memahami bahwa data saya disimpan secara aman, tidak dibagikan kepada pihak lain di luar keperluan di atas kecuali diwajibkan peraturan perundang-undangan, dan saya berhak meminta akses atau perbaikan atas data saya sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi. Protokol notaris yang wajib disimpan menurut undang-undang tidak dapat dihapus atas permintaan."
      },
      { t: "p", text: `${kota}, ${tgl}`, align: "right", spaceAfter: 0 },
      { t: "p", text: "Yang menyatakan,", align: "right", spaceAfter: 1200 },
      { t: "p", text: c.fullName, bold: true, align: "right" }
    ],
    { title: `Persetujuan Data Pribadi ${c.clientNumber}` }
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="Persetujuan_Data_Pribadi_${c.clientNumber}.docx"`,
      "cache-control": "no-store"
    }
  });
}
