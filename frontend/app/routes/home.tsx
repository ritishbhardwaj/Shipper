import { Link } from "react-router";
import type { Route } from "./+types/home";
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
    { title: "Shipper — Shipment at ease" },
    { name: "description", content: "Create and track shipments with ease" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader>
        <SignInButton />
      </SiteHeader>
      <section className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center gap-10">
        <div className="text-center max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Shipment at ease
          </h1>
          <p className="text-lg text-muted-foreground">
            Sellers create shipments. Delivery partners fulfill them. Track
            every step on a live timeline.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 w-full max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Seller</CardTitle>
              <CardDescription>
                Register, create shipments, and track delivery status.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link to="/signup/seller">
                <Button>Sign up</Button>
              </Link>
              <Link to="/login?role=seller">
                <Button variant="outline">Log in</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delivery partner</CardTitle>
              <CardDescription>
                Service zip codes, accept assignments, update shipment progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link to="/signup/partner">
                <Button>Sign up</Button>
              </Link>
              <Link to="/login?role=partner">
                <Button variant="outline">Log in</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
