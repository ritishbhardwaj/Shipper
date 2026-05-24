import { useCallback, useEffect, useState } from "react";
import type { Route } from "./+types/seller-dashboard";
import { AppShell } from "~/components/app-shell";
import { ProtectedRoute } from "~/components/protected-route";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  ApiError,
  createShipment,
  deleteShipment,
  getSellerDashboard,
  listSellerShipments,
  type Seller,
  type Shipment,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Seller dashboard — Shipper" }];
}

function SellerDashboardContent() {
  const { token } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profile, list] = await Promise.all([
        getSellerDashboard(token),
        listSellerShipments(token),
      ]);
      setSeller(profile);
      setShipments(list);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const fd = new FormData(e.currentTarget);
    try {
      await createShipment(token, {
        content: String(fd.get("content")),
        weight: Number(fd.get("weight")),
        destination: Number(fd.get("destination")),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm("Delete this shipment?")) return;
    try {
      await deleteShipment(token, id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <AppShell title={seller ? `Hi, ${seller.name}` : "Seller"}>
      {error && <p className="text-destructive mb-4">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>New shipment</CardTitle>
              <CardDescription>Weight max 25 kg</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="content">Contents</FieldLabel>
                    <Input id="content" name="content" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="weight">Weight (kg)</FieldLabel>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      step="0.1"
                      max={25}
                      min={0.1}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="destination">
                      Destination zip
                    </FieldLabel>
                    <Input
                      id="destination"
                      name="destination"
                      type="number"
                      required
                    />
                  </Field>
                  <Button type="submit">Create shipment</Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your shipments</h2>
              <Button type="button" variant="outline" size="sm" onClick={load}>
                Refresh
              </Button>
            </div>
            {shipments.length === 0 ? (
              <p className="text-muted-foreground">No shipments yet.</p>
            ) : (
              shipments.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{s.content}</CardTitle>
                    <CardDescription>
                      {s.weight} kg → zip {s.destination} ·{" "}
                      <span className="capitalize">
                        {s.status?.replaceAll("_", " ") ?? "pending"}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="text-sm space-y-1 border-l-2 pl-3">
                      {[...s.timeline]
                        .sort(
                          (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime(),
                        )
                        .map((ev) => (
                        <li key={ev.id}>
                          <span className="font-medium capitalize">
                            {ev.status.replaceAll("_", " ")}
                          </span>
                          {" @ "}
                          {ev.location}
                          {ev.description ? ` — ${ev.description}` : ""}
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(s.id)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function SellerDashboard() {
  return (
    <ProtectedRoute role="seller">
      <SellerDashboardContent />
    </ProtectedRoute>
  );
}
