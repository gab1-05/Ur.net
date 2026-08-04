# Ur.net

Ur.net is a pnpm monorepo for a network diagnostics control center. It includes a React dashboard, an Express API, shared OpenAPI-generated clients, Zod schemas, and Drizzle database schema packages.

## Workspace Layout

| Path | Purpose |
| --- | --- |
| `artifacts/network-dash` | React 19 + Vite dashboard for diagnostics, history, interfaces, and settings. |
| `artifacts/api-server` | Express API that runs network commands, exposes health/system routes, and persists diagnostic runs when a database is configured. |
| `artifacts/mockup-sandbox` | Isolated Vite sandbox for UI mockups. |
| `lib/api-spec` | OpenAPI specification and client generation config. |
| `lib/api-client-react` | Generated React Query API client plus custom fetch wrapper. |
| `lib/api-zod` | Generated Zod schemas for API contracts. |
| `lib/db` | Drizzle schema and database connection helpers. |
| `scripts` | Utility scripts package. |

## Prerequisites

- Node.js 22 or newer is recommended.
- pnpm is required. The root `preinstall` script rejects npm and yarn lockfiles.
- PostgreSQL is optional for basic launch, but required for persisted diagnostic history.

## Setup

```powershell
pnpm install
```

Optional database configuration:

```powershell
$env:DATABASE_URL="postgres://user:password@localhost:5432/urnet"
```

Without `DATABASE_URL`, the API still starts and system/tool routes remain available. Persistence-backed routes return empty data or a clear 503 response depending on the endpoint.

## Development

Start the API:

```powershell
pnpm --filter @workspace/api-server run dev
```

Start the dashboard in another terminal:

```powershell
pnpm --filter @workspace/network-dash run dev
```

The dashboard defaults to `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000`. Override the proxy target when needed:

```powershell
$env:API_PROXY_TARGET="http://localhost:4000"
pnpm --filter @workspace/network-dash run dev
```

## Quality Checks

```powershell
pnpm run typecheck
pnpm run build
```

`pnpm run build` performs a full workspace typecheck, builds the API server, builds the dashboard, and builds the mockup sandbox.

## Production Build

Build all packages:

```powershell
pnpm run build
```

Run the API bundle:

```powershell
$env:PORT="3000"
pnpm --filter @workspace/api-server run start
```

Serve the dashboard output from:

```text
artifacts/network-dash/dist/public
```

In production, route `/api/*` to the API server and all other paths to the dashboard `index.html`.

## Current Improvements

- Fixed TypeScript route parsing issues in API export/history endpoints.
- Added safe query parsing and pagination caps for history routes.
- Added a Vite dev proxy so the dashboard can reach the API during local development.
- Made the mockup sandbox build without requiring manual `PORT` and `BASE_PATH` values.
- Improved dashboard overview hierarchy with operational summary metrics.
- Improved sidebar navigation, active states, branding, and API status context.
- Split large dashboard dependencies into cacheable chunks.

## Recommended Next Changes

1. Add Playwright smoke tests for dashboard navigation, API health, and diagnostics form submission.
2. Add database migration scripts and document the expected Drizzle migration flow.
3. Add authentication and role-based access before exposing diagnostics on a shared network.
4. Add request rate limits and command execution audit logs for safer operations.
5. Add route-level loading/error states for database-disabled mode so users understand what is unavailable.
6. Move generated API clients behind a repeatable `pnpm generate` script tied to the OpenAPI spec.
