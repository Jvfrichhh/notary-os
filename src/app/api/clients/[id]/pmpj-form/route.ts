import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { buildSimpleDocx, type DocBlock } from "@/lib/office/simpleDocx";
import { NOTARIS } from "@/lib/deeds/common";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const TITIK = "..............................................";
const kotak = (on: boolean) => (on ? "[X]" : "[  ]");

/**
 * Formulir Customer Due Diligence / Prinsip Mengenali Pengguna Jasa (PMPJ)
 * untuk ditandatangani pengguna jasa. Terisi awal dari data klien; yang
 * kosong diisi tangan.
 */
export async function GET(_req: Request, ctx: Async<{ params: { id: string } }>) {
  const { params } = await unwrapProps(ctx);
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.kind === "client" || session.user.revoked) return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  if (!(await userHasPermission(session.user.id, PERMISSIONS.VIEW_CLIENTS))) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const c = await prisma.client.findUnique({ where: { id: params.id } });
  if (!c) return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });

  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const tgl = `${now.getUTCDate()} ${BULAN[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const kota = NOTARIS.kota.replace(/^Kota |^Kabupaten /, "");
  const badan = c.clientType === "Perusahaan";
  const isi = (v: string | null | undefined) => (v && v.trim() ? v : TITIK);
  const risiko = c.riskLevel ?? "";

  const blocks: DocBlock[] = [
    { t: "p", text: `**KANTOR NOTARIS / PPAT ${NOTARIS.namaSingkat}**`, align: "center", spaceAfter: 0, size: 12 },
    { t: "p", text: "FORMULIR PENGENALAN PENGGUNA JASA", bold: true, align: "center", size: 13, spaceAfter: 0 },
    { t: "p", text: "(Customer Due Diligence — Prinsip Mengenali Pengguna Jasa)", align: "center", spaceAfter: 240, size: 10 },
    { t: "p", text: `A. IDENTITAS PENGGUNA JASA (${badan ? "KORPORASI" : "ORANG PERSEORANGAN"})`, bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3.5, 6.5],
      rows: badan
        ? [
            ["Nama korporasi", isi(c.companyName ?? c.fullName)],
            ["NPWP", isi(c.npwp)],
            ["Alamat kedudukan", isi([c.address, c.city].filter(Boolean).join(", "))],
            ["Bidang usaha", TITIK],
            ["Nomor & tanggal akta pendirian / perubahan terakhir", TITIK],
            ["Nomor izin usaha / NIB", TITIK],
            ["Pengurus / kuasa yang bertindak (nama & jabatan)", isi(c.representative)],
            ["NIK pengurus / kuasa", isi(c.nik)],
            ["Telepon / email", isi([c.phone, c.email].filter(Boolean).join(" / "))]
          ]
        : [
            ["Nama lengkap", isi(c.fullName)],
            ["NIK / nomor paspor", isi(c.nik)],
            ["Tempat & tanggal lahir", TITIK],
            ["Kewarganegaraan", TITIK],
            ["Alamat sesuai identitas", isi([c.address, c.city].filter(Boolean).join(", "))],
            ["Alamat tempat tinggal (bila berbeda)", TITIK],
            ["Pekerjaan", isi(c.occupation)],
            ["Status perkawinan", isi(c.maritalStatus)],
            ["NPWP", isi(c.npwp)],
            ["Telepon / email", isi([c.phone, c.email].filter(Boolean).join(" / "))]
          ]
    },
    { t: "p", text: "B. TRANSAKSI", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3.5, 6.5],
      rows: [
        ["Jenis transaksi / jasa yang diminta", TITIK],
        ["Tujuan transaksi", isi(c.transactionPurpose)],
        ["Nilai transaksi (Rp)", TITIK],
        ["Sumber dana", isi(c.sourceOfFunds)],
        ["Bertindak untuk", `${kotak(!c.beneficialOwner)} diri sendiri    ${kotak(!!c.beneficialOwner)} pihak lain / pemilik manfaat`]
      ]
    },
    { t: "p", text: "C. PEMILIK MANFAAT (BENEFICIAL OWNER) — diisi bila bertindak untuk pihak lain atau korporasi", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3.5, 6.5],
      rows: [
        ["Nama pemilik manfaat", isi(c.beneficialOwner)],
        ["NIK / nomor identitas", TITIK],
        ["Alamat", TITIK],
        ["Hubungan dengan pengguna jasa", TITIK]
      ]
    },
    { t: "p", text: "D. PERNYATAAN", bold: true, spaceAfter: 60 },
    {
      t: "p",
      align: "both",
      text: `Apakah Anda, keluarga, atau pihak terkait Anda merupakan pejabat publik / orang yang populer secara politis (Politically Exposed Person)?   ${kotak(c.isPep)} Ya    ${kotak(!c.isPep)} Tidak. Bila ya, sebutkan jabatannya: ${TITIK}`
    },
    {
      t: "p",
      align: "both",
      text: "Saya menyatakan bahwa seluruh keterangan di atas benar dan dokumen yang saya serahkan adalah sah, dana yang digunakan dalam transaksi ini tidak berasal dari dan tidak ditujukan untuk tindak pidana pencucian uang atau pendanaan terorisme, dan saya bersedia memberikan keterangan atau dokumen tambahan bila diminta.",
      spaceAfter: 240
    },
    { t: "p", text: `${kota}, ${tgl}`, align: "right", spaceAfter: 0 },
    { t: "p", text: "Pengguna jasa,", align: "right", spaceAfter: 1000 },
    { t: "p", text: `(${badan ? isi(c.representative) : c.fullName})`, bold: true, align: "right", spaceAfter: 360 },
    { t: "p", text: "E. DIISI KANTOR", bold: true, spaceAfter: 60 },
    {
      t: "table",
      header: ["", ""],
      noHeader: true,
      widths: [3.5, 6.5],
      rows: [
        ["Nomor klien", c.clientNumber],
        ["Dokumen identitas diperiksa & difotokopi", `${kotak(false)} Ya    ${kotak(false)} Belum`],
        ["Profil risiko", `${kotak(risiko === "RENDAH")} Rendah    ${kotak(risiko === "SEDANG")} Sedang    ${kotak(risiko === "TINGGI")} Tinggi`],
        ["Catatan / tindak lanjut", TITIK],
        ["Petugas & paraf", TITIK]
      ]
    }
  ];
  const buffer = buildSimpleDocx(blocks, { title: `Formulir PMPJ ${c.clientNumber}` });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="Formulir_PMPJ_${c.clientNumber}.docx"`,
      "cache-control": "no-store"
    }
  });
}
