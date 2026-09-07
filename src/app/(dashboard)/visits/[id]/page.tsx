import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "-"}</p>
    </div>
  );
}

export default async function VisitDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.VIEW_VISITS);

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: { client: true, staff: true, jobs: { orderBy: { createdAt: "desc" } } }
  });

  if (!visit) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          {new Date(visit.visitDate).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" })}
        </p>
        <h1 className="text-xl font-semibold text-foreground">{visit.visitorName}</h1>
        {visit.client && (
          <Link href={`/clients/${visit.client.id}`} className="text-sm text-primary hover:underline">
            {visit.client.clientNumber} — lihat profil client
          </Link>
        )}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Detail Kunjungan</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoRow label="Telepon" value={visit.phone} />
          <InfoRow label="Asal / Referensi" value={visit.origin} />
          <InfoRow label="Kategori Layanan" value={visit.serviceCategory} />
          <InfoRow label="Ditangani Oleh" value={visit.staff?.name} />
        </div>
        <div className="mt-4">
          <InfoRow label="Keperluan" value={visit.purpose} />
        </div>
        {visit.notes && (
          <div className="mt-4">
            <InfoRow label="Catatan" value={visit.notes} />
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Job Terkait {visit.jobs.length > 0 && `(${visit.jobs.length})`}
          </h2>
          <Link
            href={`/jobs/new?visitId=${visit.id}${visit.clientId ? `&clientId=${visit.clientId}` : ""}`}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            + Buat Job
          </Link>
        </div>
        {visit.jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kunjungan ini belum dijadikan job.</p>
        ) : (
          <div className="divide-y divide-border">
            {visit.jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{job.jobNumber}</span>
                <span className="text-xs text-muted-foreground">{job.description ?? "-"}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
