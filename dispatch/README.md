# Dispatch Service

The dispatch service manages vehicles, drivers, stations, and hospitals. It automatically assigns the nearest available vehicle when a new incident is reported, tracks real-time locations, and streams live updates to connected clients.

**Port:** `4002`

---

## Overview

The dispatch service operates in two modes simultaneously:

1. **Request-response** — REST endpoints for registering resources, querying dispatch state, and updating capacity.
2. **Event-driven** — a background Redis stream consumer that listens for `IncidentCreated` events and triggers automatic vehicle assignment without any manual intervention.

Location updates flow through Redis pub/sub so that any client connected to the live SSE stream receives updates in real time without polling.

---

## Auto-Dispatch Pipeline

When the incident service publishes an `IncidentCreated` event to the `incident.events` Redis stream, the dispatch service:

1. Reads all vehicles with `status = available`.
2. Calculates the distance from each vehicle's last known location to the incident's center coordinate using the **Haversine formula**.
3. Selects the nearest vehicle.
4. Creates a `Dispatch` record and sets the vehicle status to `dispatched`.
5. Publishes a `VehicleDispatched` event to the outbox.

Steps 3–5 run in a single database transaction to ensure consistency. If no vehicles are available, the event is acknowledged without creating a dispatch.

---

## Real-Time Tracking

Location updates (vehicle or driver) are saved to the database and simultaneously published to a Redis pub/sub channel (`dispatch.tracking.live`). The SSE endpoint at `/api/dispatch/tracking/live` subscribes to this channel and streams updates to any connected browser client in real time.

This architecture decouples the update producer (IoT device / mobile app posting a location) from the update consumers (browser clients viewing the map) via Redis as the intermediary.

---

## Data Model

### Vehicle

Represents a dispatchable unit. Has a `callSign` (unique), a `type` (`ambulance`, `fire_truck`, `police_car`, `motorcycle`), and a `status` that tracks its current operational state.

**Vehicle status lifecycle:**
```
available → dispatched → en_route → on_scene → returning → available
                                              ↘ offline
```

### VehicleLocation

A time-series log of GPS coordinates for each vehicle, including optional `speed` (km/h) and `heading` (degrees). Used both for historical queries and for the Haversine distance calculation during auto-dispatch.

### Driver

Each vehicle can have at most one assigned driver. A driver can optionally have a phone number. Driver locations are tracked separately from vehicle locations.

### Station

The home base for vehicles. Each station has a `type` (`ambulance`, `fire`, `police`) and a location. Vehicles are associated with a station at registration time.

### Hospital

Tracks available capacity for routing decisions. Fields include `totalBeds`, `availableBeds`, `totalAmbulances`, and `availableAmbulances`. Updated externally via API.

### Dispatch

A record linking an incident (by `incidentId` string — no foreign key, since incidents live in a separate service and database) to a vehicle. Tracks the dispatch lifecycle: `active` → `arrived` → `cleared`, with corresponding timestamps.

### Outbox

Same pattern as the incident service — events are written here transactionally, then published to `dispatch.events` by a background poller.

---

## Event Publishing

The service publishes the following events to the Redis stream `dispatch.events`:

| Event | Trigger |
|---|---|
| `VehicleRegistered` | A new vehicle is registered |
| `DriverRegistered` | A new driver is registered |
| `VehicleDispatched` | Auto-dispatch assigns a vehicle to an incident |
| `VehicleArrived` | A dispatch is marked as arrived |

Like the incident service, events are delivered via the outbox pattern — written synchronously to the database, then published asynchronously to Redis with retry logic.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string (used for streams and pub/sub) |
| `PORT` | No | Defaults to `4002` |

---

## Interactive API Docs

Swagger UI is available at `/api/dispatch/ui`. The raw OpenAPI spec is at `/api/dispatch/doc`.

---

## Development

```bash
pnpm install
pnpm dev
```
