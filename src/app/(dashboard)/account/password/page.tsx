import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { changeOwnPassword } from "./actions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AccountPasswordPage() {
  const { tp } = await getT();
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{tp("Ganti Password")}</h1>
        <p className="text-sm text-muted-foreground">{tp("Akun:")} {user.email}</p>
      </div>
      <Card>
        <ChangePasswordForm forced={false} action={changeOwnPassword} />
      </Card>
    </div>
  );
}
