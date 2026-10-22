import { GlobalSearchBar } from "./GlobalSearchBar";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function TopBar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-background pl-14 pr-4 lg:px-8">
      <GlobalSearchBar />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        {session?.user && <UserMenu name={session.user.name ?? "User"} role={session.user.role} />}
      </div>
    </header>
  );
}
