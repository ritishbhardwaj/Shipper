import { useCallback, useEffect, useState } from "react";
import type { Route } from "./+types/partner-dashboard";
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
  getPartnerDashboard,
  updateShipment,
  type PartnerDashboard,
  type Shipment,
  type ShipmentStatus,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Partner dashboard — Shipper" }];
}

const STATUS_OPTIONS: ShipmentStatus[] = [
  "placed",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

function PartnerDashboardContent() {
  const { token } = useAuth();
  const [data, setData] = useState<PartnerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await getPartnerDashboard(token));
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

  async function handleUpdate(
    shipment: Shipment,
    form: FormData,
  ) {
    if (!token) return;
    setUpdatingId(shipment.id);
    try {
      await updateShipment(token, shipment.id, {
        location: Number(form.get("location")),
        status: form.get("status") as ShipmentStatus,
        description: String(form.get("description") || "") || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AppShell
      title={
        data
          ? `${data.partner.name} · ${data.available_capacity} slots free`
          : "Partner"
      }
    >
      {error && <p className="text-destructive mb-4">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Active: {data.active_count}</span>
            <span>
              Zips: {data.partner.serviceable_zip_codes.join(", ")}
            </span>
          </div>
          {data.assigned_shipments.length === 0 ? (
            <p className="text-muted-foreground">No assigned shipments.</p>
          ) : (
            data.assigned_shipments.map((s) => (
              <Card key={`${s.id}-${s.status}-${s.timeline.length}`}>
                <CardHeader>
                  <CardTitle className="text-base">{s.content}</CardTitle>
                  <CardDescription>
                    {s.weight} kg → zip {s.destination} ·{" "}
                    <span className="capitalize">
                      {s.status?.replaceAll("_", " ") ?? "—"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      </li>
                    ))}
                  </ul>
                  {s.status !== "delivered" && (
                    <form
                      className="border rounded-lg p-4 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(s, new FormData(e.currentTarget));
                      }}
                    >
                      <p className="text-sm font-medium">Update progress</p>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Location (zip)</FieldLabel>
                          <Input
                            name="location"
                            type="number"
                            defaultValue={s.destination}
                            required
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Status</FieldLabel>
                          <select
                            key={`status-${s.id}-${s.status}`}
                            name="status"
                            className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                            defaultValue={s.status ?? "in_transit"}
                          >
                            {STATUS_OPTIONS.filter(
                              (st) => st !== "placed",
                            ).map((st) => (
                              <option key={st} value={st}>
                                {st.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field>
                          <FieldLabel>Note</FieldLabel>
                          <Input name="description" placeholder="Optional" />
                        </Field>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={updatingId === s.id}
                        >
                          {updatingId === s.id ? "Saving…" : "Save update"}
                        </Button>
                      </FieldGroup>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

export default function PartnerDashboard() {
  return (
    <ProtectedRoute role="partner">
      <PartnerDashboardContent />
    </ProtectedRoute>
  );
}
