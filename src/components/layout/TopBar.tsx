import { GlobalSearchBar } from "./GlobalSearchBar";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function TopBar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <GlobalSearchBar />
      <div className="flex items-center gap-2">
        <NotificationBell />
        {session?.user && <UserMenu name={session.user.name ?? "User"} role={session.user.role} />}
      </div>
    </header>
  );
}
