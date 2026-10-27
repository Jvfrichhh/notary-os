import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissionKeys";
import { getUserPermissions } from "@/lib/permissions";
import { isAiEnabled, aiModel } from "@/lib/ai/client";
import { Card } from "@/components/ui/Card";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export const dynamic = "force-dynamic";
// Server action asisten boleh berjalan sampai 60 detik (beberapa putaran tool + model).
export const maxDuration = 60;

export default async function AssistantPage() {
  const user = await requirePermission(PERMISSIONS.VIEW_JOBS);
  const permissions = await getUserPermissions(user.id);

  // Contoh pertanyaan disesuaikan dengan hak akses user supaya tidak
  // menawarkan sesuatu yang pasti ditolak.
  const suggestions = [
    "Bagaimana kondisi kantor hari ini?",
    "Pekerjaan apa saja yang jatuh tempo minggu ini?",
    "Pekerjaan mana yang dokumennya belum lengkap?",
    "Ada unggahan klien yang belum diperiksa?",
    "Apa tugas saya yang belum selesai?",
    ...(permissions.has(PERMISSIONS.VIEW_CLIENTS) ? ["Siapa saja klien yang belum punya akses portal?"] : []),
    ...(permissions.has(PERMISSIONS.VIEW_FINANCE) ? ["Tagihan mana yang belum lunas?"] : [])
  ];

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Asisten AI</h1>
        <p className="text-sm text-muted-foreground">
          Tanya apa saja tentang data kantor. Asisten hanya membaca data yang memang boleh Anda lihat dan tidak pernah mengubah apa pun.
        </p>
      </div>
      {!isAiEnabled() ? (
        <Card>
          <p className="text-sm text-muted-foreground">Fitur AI belum diaktifkan di server (ANTHROPIC_API_KEY belum diset).</p>
        </Card>
      ) : (
        <AssistantChat suggestions={suggestions} userName={user.name ?? "Staf"} model={aiModel()} />
      )}
    </div>
  );
}
