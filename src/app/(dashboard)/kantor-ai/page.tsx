import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { getKantorAiSnapshot } from "@/lib/kantorAi";
import { KantorAiOffice } from "@/components/kantor-ai/KantorAiOffice";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function KantorAiPage() {
  const { tp } = await getT();
  await requirePermission(PERMISSIONS.VIEW_JOBS);
  const snapshot = await getKantorAiSnapshot();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Kantor AI")}</h1>
        <p className="text-sm text-muted-foreground">
          {tp("Kantor virtual 12 agen yang bekerja sesuai data pekerjaan di Nexora, diperbarui otomatis tiap menit")}
        </p>
      </div>
      <KantorAiOffice initial={snapshot} />
    </div>
  );
}
