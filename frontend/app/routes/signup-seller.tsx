import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/signup-seller";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ApiError, signupSeller } from "~/lib/api";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Seller sign up — Shipper" }];
}

export default function SignupSeller() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await signupSeller({
        name: String(fd.get("name")),
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        address: String(fd.get("address") || "") || undefined,
        zip_code: fd.get("zip_code")
          ? Number(fd.get("zip_code"))
          : undefined,
      });
      navigate("/login?role=seller");
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
          <CardTitle>Create seller account</CardTitle>
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
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input id="address" name="address" />
              </Field>
              <Field>
                <FieldLabel htmlFor="zip_code">Zip code</FieldLabel>
                <Input id="zip_code" name="zip_code" type="number" />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating…" : "Sign up"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                <Link to="/login?role=seller" className="underline">
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
