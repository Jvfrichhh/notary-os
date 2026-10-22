import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { PpatForm } from "@/components/ppat/PpatForm";
import { createPpatDeed } from "@/app/(dashboard)/ppat/actions";
import { getJakartaToday, toDateInput } from "@/lib/format";
import { nextPpatSequence } from "@/lib/ppat";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  required: "Lengkapi tanggal, perbuatan hukum, dan kedua pihak.",
  job: "Pekerjaan tidak ditemukan.",
  number: "Nomor akta sudah terdaftar atau gagal dibuat. Periksa nomor urut lalu coba lagi."
};

export default async function NewPpatPage({ searchParams }: { searchParams: { jobId?: string; err?: string } }) {
  await requirePermission(PERMISSIONS.EDIT_REPERTORIUM);
  const today = getJakartaToday();
  const job = searchParams.jobId
    ? await prisma.job.findUnique({
        where: { id: searchParams.jobId },
        select: { id: true, jobNumber: true, description: true, client: { select: { fullName: true, address: true } }, serviceType: { select: { name: true } } }
      })
    : null;
  const ppatType = job ? SERVICE_CATALOG.find((c) => c.name === job.serviceType?.name)?.ppatType : undefined;
  const nextSeq = await nextPpatSequence(today.getUTCFullYear());

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={job ? `/jobs/${job.id}` : "/ppat"} className="text-xs text-muted-foreground hover:text-foreground">
          ← {job ? `${job.jobNumber} · ${job.client.fullName}` : "Buku Daftar Akta PPAT"}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Daftarkan Akta PPAT</h1>
        <p className="text-sm text-muted-foreground">
          Setelah akta ditandatangani. Sistem memberi nomor urut tahun berjalan, membuat tugas penyampaian ke Kantor Pertanahan (7 hari kerja)
          {job ? ", dan menyelesaikan pekerjaan ini" : ""}.
        </p>
      </div>
      {searchParams.err && ERR[searchParams.err] && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm">
          {ERR[searchParams.err]}
        </div>
      )}
      <Card>
        <PpatForm
          action={createPpatDeed}
          submitLabel="Daftarkan"
          hidden={job ? { jobId: job.id } : undefined}
          sequenceHint={`${nextSeq}/${today.getUTCFullYear()}`}
          d={{
            deedDate: toDateInput(today),
            deedType: ppatType,
            // Klien pemesan biasanya pihak penerima (pembeli/penerima hibah/debitur); sesuaikan bila berbeda.
            partyTo: job ? [job.client.fullName, job.client.address].filter(Boolean).join(", ") : undefined
          }}
        />
      </Card>
    </div>
  );
}
