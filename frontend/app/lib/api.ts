/** Backend URL — use /api only if a dev proxy is configured; default is direct to FastAPI. */
const API_BASE =
  "https://shipper-f9kc.onrender.com" ?? "http://127.0.0.1:8001";

export type UserRole = "seller" | "partner";

export type ShipmentStatus =
  | "placed"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

export interface ShipmentEvent {
  id: string;
  location: number;
  status: ShipmentStatus;
  description: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  content: string;
  weight: number;
  destination: number;
  estimated_delivery: string;
  status: ShipmentStatus | null;
  timeline: ShipmentEvent[];
  seller: { name: string; email: string };
}

export interface Seller {
  id: string;
  name: string;
  email: string;
  address?: string | null;
  zip_code?: number | null;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  email: string;
  serviceable_zip_codes: number[];
  max_handling_capacity: number;
}

export interface PartnerDashboard {
  partner: DeliveryPartner;
  assigned_shipments: Shipment[];
  active_count: number;
  available_capacity: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(rest.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new ApiError(String(detail), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(
  role: UserRole,
  email: string,
  password: string,
): Promise<string> {
  const form = new FormData();
  form.append("username", email);
  form.append("password", password);
  const prefix = role === "seller" ? "/seller" : "/delivery_partner";
  const data = await request<{ access_token: string }>(`${prefix}/token`, {
    method: "POST",
    body: form,
  });
  return data.access_token;
}

export async function signupSeller(body: {
  name: string;
  email: string;
  password: string;
  address?: string;
  zip_code?: number;
}) {
  return request<Seller>("/seller/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function signupPartner(body: {
  name: string;
  email: string;
  password: string;
  serviceable_zip_codes: number[];
  max_handling_capacity: number;
}) {
  return request<DeliveryPartner>("/delivery_partner/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSellerDashboard(token: string) {
  return request<Seller>("/seller/dashboard", { token });
}

export async function getPartnerDashboard(token: string) {
  return request<PartnerDashboard>("/delivery_partner/dashboard", { token });
}

export async function listSellerShipments(token: string) {
  return request<Shipment[]>("/shipment/mine", { token });
}

export async function createShipment(
  token: string,
  body: { content: string; weight: number; destination: number },
) {
  return request<Shipment>("/shipment/", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateShipment(
  token: string,
  id: string,
  body: {
    location?: number;
    status?: ShipmentStatus;
    description?: string;
    estimated_delivery?: string;
  },
) {
  const params = new URLSearchParams({ id });
  return request<Shipment>(`/shipment/?${params}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function deleteShipment(token: string, id: string) {
  const params = new URLSearchParams({ id });
  return request<{ detail: string }>(`/shipment/?${params}`, {
    method: "DELETE",
    token,
  });
}

export async function logout(role: UserRole, token: string) {
  const prefix = role === "seller" ? "/seller" : "/delivery_partner";
  return request<{ detail: string }>(`${prefix}/logout`, { token });
}

export { ApiError };
