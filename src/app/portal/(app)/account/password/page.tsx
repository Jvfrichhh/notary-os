import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function PortalChangePasswordPage() {
  const principal = await requireClientAccount({ allowPendingPasswordChange: true });
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ganti Password</h1>
        <p className="text-sm text-muted-foreground">
          {principal.mustChangePassword
            ? "Anda masuk dengan password sementara dari kantor. Buat password baru untuk melanjutkan."
            : `Akun: ${principal.email}`}
        </p>
      </div>
      <Card>
        <ChangePasswordForm forced={principal.mustChangePassword} />
      </Card>
    </div>
  );
}
