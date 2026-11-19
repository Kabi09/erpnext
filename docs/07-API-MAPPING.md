# API mapping

## Phase 2 endpoints

All active routes use the `/api/v1` prefix. Auth mutation requests carry `X-CRYO-Request: 1` and browser origins must match `APP_ORIGINS`. Authenticated GETs use a bearer access JWT. Successful GETs and login/refresh responses use `data` and `meta.requestId`. Errors use `error` with code, message, details and request ID.

| Method and path | Input and result |
| --- | --- |
| `GET /health` | Liveness. Returns 200 with `status: ok` |
| `GET /ready` | Checks validated reference metadata, MongoDB connection and a writable transaction-capable topology. Returns 200 or 503 |
| `POST /auth/login` | Email and password. Returns safe user profile, access JWT and refresh cookie |
| `POST /auth/refresh` | Refresh cookie. Returns new access JWT and a rotated refresh cookie |
| `POST /auth/logout` | Refresh cookie or verified bearer session. Revokes the session, clears the cookie and returns 204 |
| `GET /auth/me` | Current user ID, name, email and active companies |
| `GET /companies/:companyId/access` | Requires active membership and company-read grant. Returns the company's ID, name and code |

Malformed JSON returns 400, invalid input 422, failed authentication 401, denied access 403 and rate limit 429. Responses carry `X-Request-Id`. All other routes in the proposal below are future contracts.

Frappe mounts v1 under `/api` and `/api/v1` and v2 under `/api/v2`. V1 exposes resource and whitelisted method routes. V2 has document, metadata, count and method routes, plus discovery and separate bulk operations. The source index records literal routes, decorator occurrences and observed client RPC references. A whitelist hit does not establish route exposure, HTTP verbs, auth behavior or the set of usable calls after hooks are applied. [API entry](../reference/frappe/frappe/api/__init__.py) · [V1 routes](../reference/frappe/frappe/api/v1.py#L150) · [V2 routes](../reference/frappe/frappe/api/v2.py#L674)

| Upstream capability | Proposed Express endpoint |
| --- | --- |
| Session and user context | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` |
| Desk metadata, workspace and navigation | `GET /api/v1/metadata/types`, `GET /api/v1/metadata/types/:type`, `GET /api/v1/workspaces/:id` |
| Resource list and create | `GET /api/v1/documents/:type`, `POST /api/v1/documents/:type` |
| Read, update and permitted draft deletion | `GET`, `PATCH`, `DELETE /api/v1/documents/:type/:id` |
| Workflow and document actions | `POST /api/v1/documents/:type/:id/actions/:action` |
| Specialized operations | `POST /api/v1/stock/material-requests/:id/issues`, receipt, delivery, billing and payment commands in their modules |
| Report list, run, export | `GET /api/v1/reports`, `POST /api/v1/reports/:id/runs`, `GET /api/v1/report-runs/:id` |
| Attachments, timeline and search | Instance-scoped attachment and timeline endpoints plus `GET /api/v1/search` |

Read endpoints accept an allowlisted field/operator filter shape, maximum page size and opaque cursor with a stable tie-break sort. Use a typed map for filters and updates. Scope queries before pagination and project permitted fields before serialization. Patches include a version precondition via `If-Match`. Critical commands require `Idempotency-Key` and store a canonical request fingerprint plus outcome. A new payload reusing a committed key returns a conflict. A matching retry returns the original outcome.

Use `{ "data": ..., "meta": { "requestId": "…", "nextCursor": "…" } }` and `{ "error": { "code": "…", "message": "…", "details": [], "requestId": "…" } }`. Return 201 when creating a result, 202 for queued work, and 204 for successful deletion. Use 401 for missing or invalid authentication, 403 for denied operations, 404 for unavailable record identities, 409 for state or key conflicts, 412 for stale version and 422 for invalid business input. Encode decimals as strings and timestamp values as UTC ISO strings. Restrict public routes to a reviewed list. Everything else goes through authentication, registration and authorization. Reference RPC maps to typed services, with no executable dotted-path dispatch or import from the posted payload.
