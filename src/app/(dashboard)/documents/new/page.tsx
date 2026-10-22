import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { DocumentForm } from "@/components/documents/DocumentForm";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";
import { unwrapProps, type Async } from "@/lib/pageProps";

interface NewDocumentPageProps {
  searchParams: { clientId?: string; jobId?: string };
}

export default async function NewDocumentPage(props: Async<NewDocumentPageProps>) {
  const { searchParams } = await unwrapProps(props);
  await requirePermission(PERMISSIONS.UPLOAD_DOCUMENTS);

  const { clientId, jobId } = searchParams;

  // Kalau datang dari halaman Job, client-nya otomatis ikut job tsb (Job.clientId wajib).
  const lockedJobRecord = jobId
    ? await prisma.job.findUnique({ where: { id: jobId }, include: { client: true } })
    : null;
  const lockedClientRecord = !lockedJobRecord && clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : null;

  const [clients, jobs] = await Promise.all([
    lockedJobRecord || lockedClientRecord
      ? Promise.resolve([])
      : prisma.client.findMany({
          where: { status: "ACTIVE" },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, clientNumber: true }
        }),
    lockedJobRecord
      ? Promise.resolve([])
      : prisma.job.findMany({
          where: { recordStatus: "ACTIVE", ...(lockedClientRecord ? { clientId: lockedClientRecord.id } : {}) },
          orderBy: { createdAt: "desc" },
          select: { id: true, jobNumber: true, description: true },
          take: 200
        })
  ]);

  const cancelHref = lockedJobRecord ? `/jobs/${lockedJobRecord.id}` : lockedClientRecord ? `/clients/${lockedClientRecord.id}` : "/documents";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Unggah Dokumen</h1>
        <p className="text-sm text-muted-foreground">Versi awal (v1) akan otomatis dicatat.</p>
      </div>

      <Card>
        <DocumentForm
          action={uploadDocument}
          clients={clients}
          jobs={jobs}
          lockedClient={
            lockedJobRecord
              ? { id: lockedJobRecord.client.id, label: `${lockedJobRecord.client.clientNumber} — ${lockedJobRecord.client.fullName}` }
              : lockedClientRecord
                ? { id: lockedClientRecord.id, label: `${lockedClientRecord.clientNumber} — ${lockedClientRecord.fullName}` }
                : undefined
          }
          lockedJob={lockedJobRecord ? { id: lockedJobRecord.id, label: `${lockedJobRecord.jobNumber}` } : undefined}
          cancelHref={cancelHref}
        />
      </Card>
    </div>
  );
}
