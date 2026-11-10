import { requireClientAccount } from "@/lib/portalSession";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { changePortalPassword } from "./actions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PortalChangePasswordPage() {
  const { tp } = await getT();
  const principal = await requireClientAccount({ allowPendingPasswordChange: true });
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Ganti Password")}</h1>
        <p className="text-sm text-muted-foreground">
          {principal.mustChangePassword
            ? tp("Anda masuk dengan password sementara dari kantor. Buat password baru untuk melanjutkan.")
            : tp("Akun: {0}", [principal.email])}
        </p>
      </div>
      <Card>
        <ChangePasswordForm forced={principal.mustChangePassword} action={changePortalPassword} />
      </Card>
    </div>
  );
}
