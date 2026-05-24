import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { SiteHeader } from "~/components/site-header";
import { LoginForm } from "~/components/login-form";
import type { UserRole } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Login — Shipper" }];
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const initialRole = (params.get("role") === "partner" ? "partner" : "seller") as UserRole;
  const [role, setRole] = useState<UserRole>(initialRole);
  const { login: saveAuth, isAuthenticated, role: savedRole, ready } = useAuth();
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  // Already logged in — redirect once after auth is hydrated (no <Navigate> during render)
  useEffect(() => {
    if (!ready || didRedirect.current) return;
    if (isAuthenticated && savedRole) {
      didRedirect.current = true;
      navigate(
        savedRole === "partner" ? "/partner/dashboard" : "/seller/dashboard",
        { replace: true },
      );
    }
  }, [ready, isAuthenticated, savedRole, navigate]);

  function handleLoginSuccess(token: string) {
    saveAuth(token, role);
    navigate(
      role === "partner" ? "/partner/dashboard" : "/seller/dashboard",
      { replace: true },
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <SiteHeader>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          Home
        </Link>
      </SiteHeader>
      <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg mb-4 flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => setRole("seller")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            role === "seller"
              ? "bg-primary text-primary-foreground"
              : "bg-card border"
          }`}
        >
          Seller
        </button>
        <button
          type="button"
          onClick={() => setRole("partner")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            role === "partner"
              ? "bg-primary text-primary-foreground"
              : "bg-card border"
          }`}
        >
          Delivery partner
        </button>
      </div>
      <LoginForm role={role} onSuccess={handleLoginSuccess} />
      <p className="mt-4 text-sm text-muted-foreground">
        No account?{" "}
        <Link
          to={role === "seller" ? "/signup/seller" : "/signup/partner"}
          className="underline"
        >
          Sign up
        </Link>
        {" · "}
        <Link to="/manual" className="underline">
          Manual
        </Link>
        {" · "}
        <Link to="/" className="underline">
          Home
        </Link>
      </p>
      </div>
    </div>
  );
}
