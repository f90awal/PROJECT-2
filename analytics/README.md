# Analytics Service

This service provides operational analytics for incidents, dispatch operations,
and hospital capacity snapshots.

## Run

```bash
pnpm install
pnpm --filter analytics db:generate
pnpm --filter analytics dev
```

Service base URL:

```text
http://localhost:4003/api/analytics
```

Swagger:

```text
GET /api/analytics/doc
GET /api/analytics/ui
```

## Prisma Schema

Core analytics fact tables:

- `IncidentFact`: incident dimensions and lifecycle timestamps.
- `DispatchFact`: dispatch lifecycle and responder deployment details.
- `HospitalCapacityFact`: point-in-time bed and ambulance capacity snapshots.

Run migrations:

```bash
pnpm --filter analytics db:migrate
```

## Endpoints

### `GET /api/analytics/response-times`

Average response time (`dispatchedAt -> arrivedAt`) overall and by emergency
service.

Query params:

- `from` (optional ISO datetime)
- `to` (optional ISO datetime)

### `GET /api/analytics/incidents-by-region`

Incident counts grouped by region and incident type.

Query params:

- `from` (optional ISO datetime)
- `to` (optional ISO datetime)

### `GET /api/analytics/resource-utilization`

Hospital bed usage summary and top deployed responders by emergency service.

Query params:

- `from` (optional ISO datetime)
- `to` (optional ISO datetime)
- `top` (optional, default `5`, min `1`, max `100`)
