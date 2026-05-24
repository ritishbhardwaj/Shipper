import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/manual", "routes/manual.tsx"),
  route("/login", "routes/login.tsx"),
  route("/signup/seller", "routes/signup-seller.tsx"),
  route("/signup/partner", "routes/signup-partner.tsx"),
  route("/seller/dashboard", "routes/seller-dashboard.tsx"),
  route("/partner/dashboard", "routes/partner-dashboard.tsx"),
] satisfies RouteConfig;
