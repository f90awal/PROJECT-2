# Auth Service

The auth service is responsible for user identity and access management across the mw platform. It is the only service that issues JWT tokens and manages user credentials.

**Port:** `3000`

---

## Overview

When a user logs in, the auth service verifies their credentials, issues a signed RS256 JWT token, and returns it to the client. That token is then presented to the gateway on every subsequent request — the gateway validates it using the corresponding public key and forwards user context downstream. No other service in the system handles token verification or password management.

---

## Responsibilities

- User registration and credential storage
- Login and JWT token issuance
- Profile reads and updates
- Enforcing role-based constraints (e.g., only `super` users can change affiliation)

---

## Data Model

### User

Stores core identity information. Each user has a `role` (`super` or `admin`) and an `affiliation` (`police`, `fire`, `hospital`, or `system`) that determines their access scope within the platform.

### AuthCredential

Passwords are stored separately from the user record and hashed with **Argon2**. This separation keeps credential data isolated from general user queries.

---

## JWT Tokens

Tokens are signed with an **RS256** private key held only by the auth service. The corresponding public key is shared with the gateway for verification. Tokens carry the user's `id` (as the `sub` claim) and `role`, and expire after **14 days**.

Because tokens are asymmetrically signed, no other service needs access to the private key — they only need the public key to verify authenticity.

---

## Access Control

- **Email** is immutable after registration.
- **Affiliation** can only be changed by users with the `super` role.
- `lastLogin` is updated on every successful login.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_PRIVATE_KEY` | Yes | RSA private key used to sign tokens |
| `PORT` | No | Defaults to `3000` |

---

## Interactive API Docs

Swagger UI is available at `/api/auth/ui`. The raw OpenAPI spec is at `/api/auth/doc`.

---

## Development

```bash
pnpm install
pnpm dev
```
