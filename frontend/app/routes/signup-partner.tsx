import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/signup-partner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ApiError, signupPartner } from "~/lib/api";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Partner sign up — Shipper" }];
}

export default function SignupPartner() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const zips = String(fd.get("zip_codes"))
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean)
      .map(Number);
    try {
      await signupPartner({
        name: String(fd.get("name")),
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        serviceable_zip_codes: zips,
        max_handling_capacity: Number(fd.get("capacity")),
      });
      navigate("/login?role=partner");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create delivery partner account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="zip_codes">
                  Serviceable zip codes (comma-separated)
                </FieldLabel>
                <Input
                  id="zip_codes"
                  name="zip_codes"
                  placeholder="10001, 10002"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="capacity">Max handling capacity</FieldLabel>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  required
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating…" : "Sign up"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login?role=partner" className="underline">
                  Already have an account?
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
