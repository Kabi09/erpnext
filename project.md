# Project Documentation

## Project Overview

- Project purpose — Build CRYO ERP with functional coverage of the pinned ERPNext and Frappe references, followed by client-specific overlays.
- Technology stack — React, Vite, MUI, Google Material Icons, Google Fonts, SCSS Modules, React Router, Axios, Node.js, Express, REST, JWT, Mongoose and MongoDB with replica-set transactions.
- Main architecture — Versioned metadata registry and reusable rendering, with separate server services for lifecycle, permissions and domain commands.
- Target users — Approximately 500 registered users. Concurrent workload and capacity remain unmeasured.
- Important conventions — Preserve references and upstream notices. Follow [project rules](docs/14-PROJECT-RULES.md). Keep proposed behavior distinct from implementation status.
- Reference repositories — ERPNext `develop`, `04985378822020da230b7bf77ffc40c63c77a91a`. Frappe `develop`, `a9488f482626a9794457c89ad88b31a881cb79a9`. Both clean at review.
- Current development phase — Phase 2 core foundation is complete. Phase 3 is pending.

## Project Structure

- Important folders — `client/` is the Vite/MUI app and `server/` is the Express/Mongoose API. `reference/`, `scripts/` and `metadata/` retain Phase 1 inputs and extraction. `docs/` includes the new [local setup guide](docs/15-LOCAL-DEVELOPMENT.md).
- Important files — [AGENTS.md](AGENTS.md), [extract-metadata.js](scripts/extract-metadata.js), [validate-metadata.js](scripts/validate-metadata.js), [extraction summary](metadata/extraction-summary.json).
- Component structure — JSX components use named folders and SCSS Modules. Frontend routes, pages, shell, shared view states, styles, context and the Axios service are in `client/src/`. Backend app composition, configuration, models, authentication, access middleware and the metadata loader are in `server/`.
- Shared utilities — The repo scanner supplies definitions, evidence and provenance to the focused extractors and shared orchestration. Focused extraction CLIs print one normalized catalog to stdout.
- Metadata structure — 14 Phase 1 artifacts retain their provenance and licenses. `server/engine/reference-metadata.js` validates the reference catalogs used by the runtime, checks summary counts, computes a SHA-256 checksum and preserves original source IDs. Future CRYO overlays live separately.

## UI & Styling Rules

- MUI usage — Standard MUI forms, tables, dialogs and layouts, combined in a distinct CRYO shell.
- Google Material Icons — Use Google Material Icons via MUI. Supply accessible action labels.
- SCSS Modules — Apply custom styles through each component's named module. Use shared tokens and relevant layout regions.
- Google Fonts — Inter is bundled through Fontsource. The app has its own CRYO identity.
- Responsive approach — Six viewport classes. Test narrow screens, long values and overflowing tables inside the table container.
- Component structure — Shared rendering and domain overrides are described in [UI components](docs/09-UI-COMPONENTS.md).

## Application Logic

- Authentication and authorization — Scrypt password hashes, ten-minute JWTs, seven-day refresh sessions, digest-only refresh storage and transactional rotation with replay revocation. Deny-by-default company policy reads current role grants. Document and field policies follow in Phase 3.
- State management and API handling — React context restores the session. Axios holds access credentials in memory, coordinates refresh, retries a failed bearer request once and cancels obsolete company data requests.
- Business logic — The company-access check is live. ERP controller ports remain future work. Source review is in [business logic](docs/05-BUSINESS-LOGIC.md).
- Validation and error handling — Zod validates environment and request fields. API middleware standardizes errors, request IDs, restricted origins, security headers and rate limits.
- Document lifecycle and workflow integration — Draft, submitted and cancelled are separate from workflow and domain state. Plan typed transitions, audited reversals and outbox side effects. Upstream definitions are evidence and stay inert.

## Database Architecture

- MongoDB collections and Mongoose schemas — User, Role, Permission, Company, RefreshSession and AuditLog are implemented with timestamps, scoped memberships and indexes. Dynamic type mappings, ledger and posting collections remain planned.
- Document relationships — Embed bounded ordered child rows and link by immutable IDs. Independently updated or unbounded rows get dedicated indexed collections.
- Transactions and indexes — The API requires a writable replica set or compatible cluster. Rotation, logout and bootstrap commit with audit events. Startup creates unique identity and grant indexes, a refresh expiration TTL and audit lookup indexes. Future posting uses scoped uniqueness, optimistic versions and deterministic keys.
- Data integrity and audit — Decimal128 with explicit scales and decimal-string transport. Enforce quantity and state bounds and preserve reversal history. [Database design](docs/04-DOCTYPES-AND-DATABASE.md)

## API / Backend Integration

- API endpoints and methods — Active under `/api/v1`: GET `/health`, GET `/ready`, POST `/auth/login`, POST `/auth/refresh`, POST `/auth/logout`, GET `/auth/me` and GET `/companies/:companyId/access`. Metadata, documents, lifecycle and reports remain future routes.
- Payload structures and response handling — Typed input, stable cursor pagination, decimal strings, request IDs and a uniform error envelope. Critical writes carry version and idempotency preconditions.
- Authentication and authorization requirements — Auth mutations require the CRYO request header and configured browser origins. Protected reads require a current bearer and, for company data, a matching membership and grant. Keep future generic APIs behind registration. [API mapping](docs/07-API-MAPPING.md)

## Module Inventory

- Modules and source references — 21 ERPNext modules and 17 Frappe modules. The [module inventory](docs/02-MODULE-INVENTORY.md) lists every module and its source directory. The [module catalog](metadata/modules.json) preserves discovered subareas and outgoing dependencies.
- Dependencies — 204 grouped cross-module edges, five absent named app references, one unresolved DocType link, eight unresolved legacy navigation targets and one duplicate portal hook route.
- Implementation status — Metadata only. 875 shipped DocTypes, 14,719 fields, 375 child-table schemas, 24 workspaces, 29 page definitions, 207 reports, nine dashboards and 2,220 permission definitions.

## Components

### Login, AppLayout and Dashboard (implemented)

- Locations — `client/src/pages/Login/`, `client/src/layouts/AppLayout/` and `client/src/pages/Dashboard/`.
- Purpose — Sign in, navigate protected workspace routes, select an assigned company, see server-confirmed access and sign out.
- State and logic — AuthContext owns identity and session restoration. Pages handle pending, failure and empty states. The shell owns the mobile drawer and account menu.
- API dependencies — Login, refresh, logout, current user and company access. Related components include ProtectedRoute, shared view states, NotFound and Unauthorized.

### DynamicForm (proposed)

- Location — `client/src/engine/DynamicForm/`.
- Purpose and props — Render authorized metadata, initial values, field errors and submit capabilities.
- State and logic — Local draft, current document version, visible validation state and server-returned capabilities.
- API dependencies — Proposed metadata read, document read/write and typed action routes.
- Related components — DynamicField, DynamicTabs, ChildTable, LinkedDocumentSelector and DocumentActions. [Component design](docs/09-UI-COMPONENTS.md)

## Business Workflows

- Workflow — Procurement, material issuance and manufacture, delivery, billing and payment. The dependency diagrams are in [workflows](docs/06-WORKFLOWS.md).
- Related modules — Buying, Stock, Manufacturing, Selling, Accounts and Frappe Workflow.
- Status transitions — Proposed draft/submit/cancel lifecycle and domain rollups from ledger and fulfillment state.
- Validation rules — Commit only eligible transitions, check restrictions and approval conditions, cap issuance, protect stock, reconcile ledger totals and preserve audit history.

## Change History

### 2026-11-19

#### Phase 2 implementation

- Changes — Added npm workspace configuration, Node version files, lockfile, environment examples, Docker Compose configuration, the client and server packages, real-backend tests and [local development instructions](docs/15-LOCAL-DEVELOPMENT.md). Updated the API, auth, UI, architecture and limitations docs.
- Dependencies — Client runtime uses React, React DOM, MUI, MUI icons, Emotion internals, React Router, Axios and Fontsource Inter. Dev tools are Vite, its React plugin, Sass and Playwright. Server uses Express, Mongoose, JSON Web Token, Helmet, CORS, cookie-parser, express-rate-limit, Zod and pino-http. Packages are pinned in manifests and the root lockfile.
- Logic — Added liveness and readiness, environment and input validation, database/index lifecycle, transactional auth and bootstrap, company policy, request logging, an internal metadata loader, the sign-in and protected app routes, and responsive shared UI.
- Verification — Clean lockfile install, production build, 13 Node tests and three browser tests passed on the native MongoDB replica set. Both reference trees and the Phase 1 extraction inputs and outputs were preserved.

#### Phase 1 repository analysis and design

- What was changed — Initialized project memory and agent rules. Added automated inventory, normalization and validation for both references, copied licenses and documented the future MERN conversion.
- Files changed — `AGENTS.md`, `project.md`, 10 Node scripts in `scripts/`, 14 generated JSON files and two license texts under `metadata/`, and 15 documents under `docs/`.
- Logic changed — New Phase 1 tooling only. It reads source as data, indexes paths and syntax signals, distinguishes shipped and sample records and reports unresolved references.
- Reason — Provide reproducible input for a metadata-driven ERP engine and capture the areas that need authored domain services.
- Impact — Both reference trees remain clean. The pre-existing root change in `test.txt` was preserved. Application foundation work is pending.
- Verification — Regenerated and checked all JSON against both reference trees. Invalid summary total correctly failed the validator. See Testing Results.

## Current Progress

- Completed — Phase 0 local clones recorded. Phase 1 static inventory, generated metadata, selected manual source review, licenses, architecture, roadmap and handover. Phase 2 verified client, API, MongoDB, identity, company authorization and metadata-loading foundation.
- In Progress — None.
- Pending — Phases 3 through 9, including document engine, functional ERP implementation, integrations and CRYO overlays.
- Blocked — None for Phase 3. Effective site-specific behavior requires site data or stakeholder evidence.
- Next implementation task — Build the explicit type registry over the Phase 2 metadata loader. Select one safe master DocType, map its fields to a Mongoose model, and expose typed, company-scoped document endpoints with validation and negative authorization tests.

## Known Issues

- Static inventory covers files and recognized definitions. Runtime customization, permissions, workflows, route resolution and operational business behavior require separate verification.
- Five absent app references include HRMS/payroll, Payments, Webshop, Insights and Lending. Review relevance and license before enabling an integration.
- `Payment Gateway Account.payment_gateway` points to an absent `Payment Gateway` DocType. Eight legacy Desktop Icon targets and one repeated portal rule need migration review.
- Nineteen observed field types fall outside the proposed MVP adapter list. No unexplained upstream field types, duplicate shipped definition names or extraction errors were reported.
- Phase 2 authorizes the company-access resource. Rate limiting is per process. Without Web Locks, simultaneous refreshes from separate tabs can trigger replay revocation. Multi-member failover, production HTTPS and 500-user load are still unverified.

## Technical Decisions

- 2026-11-19 — Use Node and Git without package dependencies for read-only extraction. Use explicit discovery coverage and stable provenance, and treat code signals as candidates.
- 2026-11-19 — Plan a modular monolith and MongoDB transactional outbox for the initial deployment. Approve registry types explicitly. Use Decimal128 for financial and quantity values with explicit scales.
- 2026-11-19 — Use a visually distinct CRYO shell and propose Inter. The one-day MVP emphasizes navigation and reviewed draft master data, with operational posting and report parity in later phases.
- 2026-11-19 — Treat a strict material issuance cap as the CRYO default. Upstream material requests can allow overage through a setting. Any compatibility allowance needs approval.
- 2026-11-19 — Pin Node.js 26.13.0 and use one npm-workspace lockfile. Use a native single-member MongoDB replica set for local verification, with optional Compose for local development.
- 2026-11-19 — Scope roles to company memberships. Resolve grants live and provision only the tested company-read grant. Use scrypt, fixed-lifetime refresh sessions, audited digest rotation and replay-triggered revocation.

## Testing Results

- Task — Phase 1 static extraction and handover.
- Tests executed — Both scanners, focused extractor CLI smoke tests, JavaScript syntax, full extraction and source-backed validation, corrupted-summary rejection, Markdown link and required deliverable checks, clean reference Git status.
- Result — 11,888 indexed files and 1,936 parsed JSON files. All 14 metadata JSON artifacts passed source-backed validation with zero extraction errors. Ten syntax checks, seven CLI smoke tests and 129 local Markdown link checks passed. The validator rejected a tampered count. Both copied licenses matched upstream byte for byte.
- Untested areas at Phase 1 — Upstream runtime, the then-unimplemented target and full business parity.

- Task — Phase 2 MERN foundation.
- Tests executed — Clean `npm ci`, npm audit, Node HTTP/database tests, Chrome UI tests, Vite production build, Compose config validation, local documentation links and reference Git checks.
- Result — 13 Node tests passed against native MongoDB 8.0.4, including rollback, readiness loss, role and company denial, concurrent rotation, replay and logout. All three Playwright tests passed. The browser suite covered six viewports from 320 to 1920 pixels, company switching, two-tab restoration, navigation, empty, loading and retry states. Reviewed phone and desktop screenshots. The build passed and npm audit reported zero known vulnerabilities.
- Untested areas — Docker container startup because Docker Desktop was inactive, multi-member MongoDB failover, production HTTPS, full accessibility review, 500-user workload, ERP domain workflows and document parity.

## Important Notes

Read the actual pinned source before translating a complex domain action. Static metadata and heuristics are inputs to implementation. Never load upstream scripts as executable code into the target. Keep source notices with reused material, and record scope and coverage before release.

## Agent Handover

- Current phase — Phase 2 complete. Phase 3 is Dynamic Metadata, Mongoose Model and Document API Engine.
- Last completed task — Verified the running client and API, transactional auth, company policy, pinned metadata intake and database bootstrap.
- Next task — Extend the [reference metadata loader](server/engine/reference-metadata.js) with an explicit deny-by-default registry that preserves source IDs and version. Register one non-submittable master type with a reviewed field and company policy. Compile its Mongoose schema, add validated list/read/write APIs with optimistic versions, and test unregistered types, invalid input, stale versions, field scope and company denial. Add child rows, links, naming and lifecycle incrementally.
- Required files to read — [AGENTS.md](AGENTS.md), this file, [project rules](docs/14-PROJECT-RULES.md), [MERN architecture](docs/11-MERN-ARCHITECTURE.md), [database design](docs/04-DOCTYPES-AND-DATABASE.md), [API mapping](docs/07-API-MAPPING.md), [permissions](docs/08-AUTHENTICATION-PERMISSIONS.md), [conversion plan](docs/12-CONVERSION-PLAN.md) and [extraction summary](metadata/extraction-summary.json).
- Commands to continue — Use `npm ci`, `npm test`, `npm run test:ui` and `npm run build`. Start a local replica set and bootstrap using the [local development guide](docs/15-LOCAL-DEVELOPMENT.md). Regenerate Phase 1 metadata only when the references or extractor change.
- Known blockers — None for the Phase 3 registry. Live site exports and external app decisions are dependency gates for later features.
