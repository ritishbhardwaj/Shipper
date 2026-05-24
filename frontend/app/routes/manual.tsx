import { Link } from "react-router";
import type { Route } from "./+types/manual";
import { SiteHeader, SignInButton } from "~/components/site-header";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "User manual — Shipper" },
    {
      name: "description",
      content: "How to use the Shipper portal as a seller or delivery partner",
    },
  ];
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
        {n}
      </span>
      <div className="space-y-1 pb-6">
        <p className="font-medium">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </li>
  );
}

export default function ManualPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader>
        <SignInButton />
      </SiteHeader>

      <main className="container mx-auto flex-1 px-4 py-10 max-w-3xl">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">How to use Shipper</h1>
          <p className="text-muted-foreground">
            This portal connects <strong>sellers</strong> who ship goods with{" "}
            <strong>delivery partners</strong> who deliver them. Status updates
            are stored on a timeline so both sides see the same progress.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Before you start</CardTitle>
            <CardDescription>Requirements that must match</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • The backend API must be running (default{" "}
              <code className="rounded bg-muted px-1">http://127.0.0.1:8001</code>
              ).
            </p>
            <p>
              • A <strong>delivery partner</strong> must serve the shipment’s{" "}
              <strong>destination zip code</strong> and have free capacity.
            </p>
            <p>• Each shipment can weigh at most <strong>25 kg</strong>.</p>
            <p>
              • Use <strong>Refresh</strong> on the seller dashboard after a
              partner updates status.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seller guide</CardTitle>
            <CardDescription>Create and track your shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-none">
              <Step n={1} title="Create an account">
                From the home page, choose <strong>Seller → Sign up</strong>.
                Enter name, email, password, and optionally your address and zip
                code (zip is used as the first timeline location).
              </Step>
              <Step n={2} title="Log in">
                Go to <Link to="/login" className="underline">Login</Link>, pick{" "}
                <strong>Seller</strong>, and sign in with your email and password.
              </Step>
              <Step n={3} title="Open your dashboard">
                After login you land on the seller dashboard. Use{" "}
                <strong>Refresh</strong> anytime to load the latest status from
                the server.
              </Step>
              <Step n={4} title="Create a shipment">
                Fill in <strong>Contents</strong>, <strong>Weight (kg)</strong>{" "}
                (max 25), and <strong>Destination zip</strong>. Click{" "}
                <strong>Create shipment</strong>. The system assigns a delivery
                partner who covers that zip and has capacity.
              </Step>
              <Step n={5} title="Track progress">
                Each shipment card shows the current status and a{" "}
                <strong>timeline</strong> (placed → in transit → out for delivery
                → delivered). New entries appear when the partner updates the
                shipment.
              </Step>
              <Step n={6} title="Delete a shipment">
                Click <strong>Delete</strong> on a card to remove it (you must
                confirm). This removes the shipment and its timeline from the
                system.
              </Step>
            </ol>
            <Link to="/signup/seller">
              <Button className="mt-2">Seller sign up</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Delivery partner guide</CardTitle>
            <CardDescription>Receive assignments and update status</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-none">
              <Step n={1} title="Create an account">
                Choose <strong>Delivery partner → Sign up</strong>. Enter your
                serviceable <strong>zip codes</strong> as a comma-separated list
                (e.g. <code className="rounded bg-muted px-1">10001, 10002</code>
                ) and your <strong>max handling capacity</strong> (how many
                active shipments you can carry at once).
              </Step>
              <Step n={2} title="Log in">
                On <Link to="/login" className="underline">Login</Link>, select{" "}
                <strong>Delivery partner</strong> and sign in.
              </Step>
              <Step n={3} title="View assigned shipments">
                The dashboard lists shipments assigned to you, active count, and
                remaining capacity. Each card shows content, weight, destination
                zip, current status, and timeline history.
              </Step>
              <Step n={4} title="Update shipment progress">
                Under <strong>Update progress</strong>, set{" "}
                <strong>Location (zip)</strong>, choose a new{" "}
                <strong>Status</strong> (in transit, out for delivery, or
                delivered), and optionally add a note. Click{" "}
                <strong>Save update</strong>. Each save adds a timeline event;
                the latest event is the current status.
              </Step>
              <Step n={5} title="When capacity is full">
                If no partner is available for a zip, sellers see an error when
                creating a shipment. Increase capacity or add zip codes via
                account setup (profile update API exists for partners).
              </Step>
            </ol>
            <Link to="/signup/partner">
              <Button className="mt-2">Partner sign up</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Status meanings</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium capitalize">Placed</dt>
                <dd className="text-muted-foreground">
                  Shipment created and assigned to a partner.
                </dd>
              </div>
              <div>
                <dt className="font-medium capitalize">In transit</dt>
                <dd className="text-muted-foreground">
                  Moving through the delivery network.
                </dd>
              </div>
              <div>
                <dt className="font-medium capitalize">Out for delivery</dt>
                <dd className="text-muted-foreground">
                  On the vehicle for final delivery to destination.
                </dd>
              </div>
              <div>
                <dt className="font-medium capitalize">Delivered</dt>
                <dd className="text-muted-foreground">
                  Completed; no further updates needed.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong>Cannot create shipment?</strong> Register a delivery
              partner whose zip list includes the destination zip and who has
              capacity below their maximum.
            </p>
            <p>
              <strong>Seller status looks old?</strong> Click Refresh on the
              seller dashboard after the partner saves an update.
            </p>
            <p>
              <strong>Login loops or errors?</strong> Hard-refresh the page (
              <kbd className="rounded border px-1">Ctrl+Shift+R</kbd>). Clear
              site data for localhost if needed, then log in again.
            </p>
            <p>
              For technical debugging history, see{" "}
              <code className="rounded bg-muted px-1">
                docs/DEBUGGING-AND-FIXES.md
              </code>{" "}
              in the project repository.
            </p>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
