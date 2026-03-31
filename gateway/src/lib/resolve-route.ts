import type { Context } from "hono";
import { SERVICE_ROUTES } from "./ingress.js";

export function resolveRoute(c: Context) {
  const path = new URL(c.req.url).pathname;
  const route = SERVICE_ROUTES.find((r) => path.startsWith(r.prefix));
  
  if (!route) return null;
  
  return route;
}
