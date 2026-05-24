import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function SiteHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b", className)}>
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-semibold shrink-0">
          Shipper
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/manual"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Manual
          </Link>
          {children}
        </nav>
      </div>
    </header>
  );
}

export function SignInButton() {
  return (
    <Link to="/login">
      <Button variant="outline" size="sm">
        Sign in
      </Button>
    </Link>
  );
}
