import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { RepertoriumForm } from "@/components/notary-record/RepertoriumForm";
import { createRepertorium } from "@/app/(dashboard)/notary-record/actions";
import { formatDate } from "@/lib/format";

interface NewRepertoriumPageProps {
  searchParams: { deedId?: string };
}

export default async function NewRepertoriumPage({ searchParams }: NewRepertoriumPageProps) {
  await requirePermission(PERMISSIONS.EDIT_REPERTORIUM);

  // Hanya akta yang belum punya Repertorium yang boleh dipilih -- one-to-one.
  const deeds = await prisma.deed.findMany({
    where: { recordStatus: "ACTIVE", repertorium: null },
    orderBy: { deedDate: "desc" },
    include: { client: true }
  });

  const deedOptions = deeds.map((d) => ({
    id: d.id,
    deedNumber: d.deedNumber,
    deedType: d.deedType,
    deedDate: formatDate(d.deedDate),
    clientName: d.client.fullName
  }));

  // Kalau datang dari link "+ Catat Repertorium" di Deed detail tapi akta itu
  // ternyata sudah keburu dicatat orang lain (race), kasih pesan jelas
  // daripada nampilkan form yang bakal ditolak saat submit.
  if (searchParams.deedId && !deedOptions.some((d) => d.id === searchParams.deedId)) {
    const alreadyRecorded = await prisma.repertorium.findUnique({ where: { deedId: searchParams.deedId } });
    if (alreadyRecorded) {
      return (
        <div className="max-w-2xl space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Catat Repertorium</h1>
          <p className="text-sm text-muted-foreground">
            Akta ini sudah tercatat di Repertorium ({alreadyRecorded.year}/{String(alreadyRecorded.sequenceNumber).padStart(4, "0")}).
          </p>
          <Link href={`/notary-record/${alreadyRecorded.id}`} className="text-sm font-medium text-primary hover:underline">
            Lihat Repertorium
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Catat Repertorium</h1>
        <p className="text-sm text-muted-foreground">
          Nomor urut dibuat otomatis per tahun. Detail akta diambil dari Akta yang dipilih.
        </p>
      </div>

      <Card>
        <RepertoriumForm
          action={createRepertorium}
          deeds={deedOptions}
          lockedDeedId={searchParams.deedId}
          cancelHref={searchParams.deedId ? `/archive/deed/${searchParams.deedId}` : "/notary-record"}
        />
      </Card>
    </div>
  );
}
