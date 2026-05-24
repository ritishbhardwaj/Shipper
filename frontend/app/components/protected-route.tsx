import { Navigate } from "react-router";
import { useAuth } from "~/lib/auth";
import type { UserRole } from "~/lib/api";

export function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { isAuthenticated, role: currentRole, ready } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== role) {
    return (
      <Navigate
        to={
          currentRole === "partner"
            ? "/partner/dashboard"
            : "/seller/dashboard"
        }
        replace
      />
    );
  }

  return <>{children}</>;
}
