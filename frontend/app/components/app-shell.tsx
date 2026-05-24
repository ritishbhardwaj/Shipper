import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { SiteHeader } from "~/components/site-header";
import { useAuth } from "~/lib/auth";
import { logout as apiLogout } from "~/lib/api";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { token, role, logout } = useAuth();

  async function handleLogout() {
    if (token && role) {
      try {
        await apiLogout(role, token);
      } catch {
        /* still clear local session */
      }
    }
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader>
        <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[12rem]">
          {title}
        </span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Log out
        </Button>
      </SiteHeader>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
