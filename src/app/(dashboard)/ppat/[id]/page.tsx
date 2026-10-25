import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS, userHasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PpatForm } from "@/components/ppat/PpatForm";
import { submitPpatToBpn, updatePpatDeed } from "@/app/(dashboard)/ppat/actions";
import { classifyDeadline, formatDate, getJakartaToday, toDateInput } from "@/lib/format";
import { isSkmht, ppatDuty } from "@/lib/ppat";
import { unwrapProps, type Async } from "@/lib/pageProps";

export const dynamic = "force-dynamic";

const OK: Record<string, string> = {
  created: "Akta PPAT didaftarkan. Tugas penyampaian ke Kantor Pertanahan sudah dibuat.",
  updated: "Perubahan disimpan.",
  bpn: "Ditandai sudah disampaikan; tugas terkait selesai."
};
const ERR: Record<string, string> = { required: "Lengkapi tanggal, perbuatan hukum, dan kedua pihak.", year: "Tanggal harus pada tahun yang sama dengan nomor akta." };

const str = (v: { toString(): string } | null) => (v == null ? "" : v.toString().replace(/\.00$/, ""));

export default async function PpatDetailPage(props: Async<{ params: { id: string }; searchParams: { ok?: string; err?: string } }>) {
  const { params, searchParams } = await unwrapProps(props);
  const user = await requirePermission(PERMISSIONS.VIEW_REPERTORIUM);
  const canEdit = await userHasPermission(user.id, PERMISSIONS.EDIT_REPERTORIUM);
  const d = await prisma.ppatDeed.findUnique({ where: { id: params.id }, include: { job: { select: { id: true, jobNumber: true } } } });
  if (!d) notFound();
  const duty = ppatDuty(d.deedType, d.deedDate);
  const skmht = isSkmht(d.deedType);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/ppat" className="text-xs text-muted-foreground hover:text-foreground">
          ← Buku Daftar Akta PPAT
        </Link>
        <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground">
          Akta PPAT No. {d.deedNumber} — {d.deedType}
        </h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(d.deedDate)}
          {d.job && (
            <>
              {" · "}
              <Link href={`/jobs/${d.job.id}`} className="text-primary hover:underline">
                {d.job.jobNumber}
              </Link>
            </>
          )}
        </p>
      </div>
      {searchParams.ok && OK[searchParams.ok] && (
        <div className="rounded-md border border-status-on-track/40 bg-status-on-track/10 px-3 py-2 text-sm">{OK[searchParams.ok]}</div>
      )}
      {searchParams.err && ERR[searchParams.err] && (
        <div role="alert" className="rounded-md border border-status-overdue/40 bg-status-overdue/10 px-3 py-2 text-sm">
          {ERR[searchParams.err]}
        </div>
      )}

      <Card>
        <h2 className="mb-1 text-base font-bold text-foreground">{duty.title}</h2>
        <p className="mb-3 text-xs text-muted-foreground">Dasar: {duty.basis}. Hari kerja dihitung Senin–Jumat; periksa hari libur nasional.</p>
        {d.submittedToBpnAt ? (
          <p className="text-sm text-status-on-track">
            {skmht ? "APHT sudah dibuat" : "Sudah disampaikan"} pada {formatDate(d.submittedToBpnAt)}.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={classifyDeadline(duty.due, "OPEN")} label={`Tenggat ${formatDate(duty.due)}`} />
            {canEdit && (
              <form action={submitPpatToBpn.bind(null, d.id)} className="flex flex-wrap items-center gap-2">
                <input type="date" name="date" defaultValue={toDateInput(getJakartaToday())} className="rounded-md border border-border bg-background px-2 py-2 text-sm" />
                <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {skmht ? "Tandai APHT sudah dibuat" : "Tandai sudah disampaikan"}
                </button>
              </form>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-foreground">Data akta</h2>
        {canEdit ? (
          <PpatForm
            action={updatePpatDeed.bind(null, d.id)}
            submitLabel="Simpan perubahan"
            d={{
              deedDate: toDateInput(d.deedDate),
              deedType: d.deedType,
              partyFrom: d.partyFrom,
              partyTo: d.partyTo,
              rightType: d.rightType ?? "",
              location: d.location ?? "",
              landArea: d.landArea ?? "",
              buildingArea: d.buildingArea ?? "",
              transactionValue: str(d.transactionValue),
              njopValue: str(d.njopValue),
              nop: d.nop ?? "",
              sspDate: toDateInput(d.sspDate),
              sspAmount: str(d.sspAmount),
              sspdDate: toDateInput(d.sspdDate),
              sspdAmount: str(d.sspdAmount),
              notes: d.notes ?? ""
            }}
          />
        ) : (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Pihak yang mengalihkan</dt>
              <dd>{d.partyFrom}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pihak yang menerima</dt>
              <dd>{d.partyTo}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}
