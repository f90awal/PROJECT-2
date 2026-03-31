# Gateway Service

The gateway is the single entry point for all client traffic in the mw platform. It authenticates requests, injects user context, and proxies traffic to the appropriate downstream service.

**Port:** `4000`

---

## Overview

Clients never talk directly to individual services. All requests go through the gateway, which:

1. Validates the Bearer JWT on protected routes using the auth service's public key.
2. Extracts the user's `id` and `role` from the token claims.
3. Forwards the request to the correct downstream service with two additional headers — `x-user-id` and `x-user-role`.
4. Streams the downstream response back to the client.

Downstream services trust these headers implicitly. They do not perform their own token validation.

---

## Routing

| Prefix | Target | Auth required |
|---|---|---|
| `/api/auth/*` | Auth service | No |
| `/api/incident/*` | Incident service | Yes |
| `/api/dispatch/*` | Dispatch service | Yes |
| `/api/analytics/*` | Analytics service | Yes |

Auth routes are excluded from JWT validation — the auth service manages its own authentication.

---

## Authentication

The gateway uses the RS256 public key (paired with the private key held by the auth service) to verify incoming tokens. If a token is missing, expired, or has an invalid signature, the request is rejected with `401` before it reaches any downstream service.

On success, the token claims are decoded and two headers are injected into the forwarded request:

- `x-user-id` — the `sub` claim (user ID)
- `x-user-role` — the `role` claim

---

## Request Logging

Every request is tracked with a request ID (taken from the incoming `x-request-id` header, or generated as a UUID if absent). Logs include the method, path, target service, response status, and duration. Upstream errors are also logged.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_PUBLIC_KEY` | Yes | RSA public key for verifying tokens issued by the auth service |
| `AUTH_SERVICE_URL` | Yes | URL of the auth service |
| `INCIDENTS_SERVICE_URL` | No | Defaults to `http://localhost:4001` |
| `DISPATCH_SERVICE_URL` | No | Defaults to `http://localhost:4002` |
| `ANALYTICS_SERVICE_URL` | No | Defaults to `http://localhost:4003` |
| `PORT` | No | Defaults to `4000` |

---

## Development

```bash
pnpm install
pnpm dev
```
