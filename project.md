# Project Documentation

## Project Overview

- Project purpose — Build CRYO ERP with functional coverage of the pinned ERPNext and Frappe references, followed by client-specific overlays.
- Technology stack — React, Vite, MUI, Google Material Icons, Google Fonts, SCSS Modules, React Router, Axios, Node.js, Express, REST, JWT, Mongoose and MongoDB with replica-set transactions.
- Main architecture — Versioned metadata registry and reusable rendering, with separate server services for lifecycle, permissions and domain commands.
- Target users — Approximately 500 registered users. Concurrent workload and capacity remain unmeasured.
- Important conventions — Preserve references and upstream notices. Follow [project rules](docs/14-PROJECT-RULES.md). Keep proposed behavior distinct from implementation status.
- Reference repositories — ERPNext `develop`, `04985378822020da230b7bf77ffc40c63c77a91a`. Frappe `develop`, `a9488f482626a9794457c89ad88b31a881cb79a9`. Both clean at review.
- Current development phase — Phase 4 frontend engine complete. Phase 5 is Core DocType Rollout and Business Logic Engine.

## Project Structure

- Important folders — `client/` contains the Vite/MUI app. `client/src/engine/` and `client/src/components/` contain the dynamic metadata-driven UI engine. `server/engine/` and `server/routes/` contain the registry, compiled models, services and HTTP routes. `metadata/` holds the 14 Phase 1 JSON artifacts and the Phase 3 registration manifest. [Local development](docs/15-LOCAL-DEVELOPMENT.md)
- Important files — [AGENTS.md](AGENTS.md), [extract-metadata.js](scripts/extract-metadata.js), [validate-metadata.js](scripts/validate-metadata.js), [extraction summary](metadata/extraction-summary.json), [frontend metadata engine](docs/17-FRONTEND-METADATA-ENGINE.md).
- Component structure — JSX components use named folders and SCSS Modules. Frontend routes, pages, shell, shared view states, styles, context and the Axios service are in `client/src/`. Backend app composition, configuration, models, authentication, access middleware and the metadata loader are in `server/`.
- Shared utilities — The repo scanner supplies definitions, evidence and provenance to the focused extractors and shared orchestration. Focused extraction CLIs print one normalized catalog to stdout.
- Metadata structure — 14 Phase 1 artifacts retain their provenance and licenses. `server/engine/reference-metadata.js` validates the reference catalogs used by the runtime, checks summary counts, computes a SHA-256 checksum and preserves original source IDs. Future CRYO overlays live separately.

## UI & Styling Rules

- MUI usage — Standard MUI forms, tables, dialogs and layouts, combined in a distinct CRYO shell.
- Google Material Icons — Use Google Material Icons via MUI (`@mui/icons-material`). Supply accessible action labels.
- SCSS Modules — Apply custom styles through each component's named module (`ComponentName.module.scss`). Use shared tokens and relevant layout regions (`.container > .wrapper > (.toprow, .middlerow, .bottomrow)`).
- Google Fonts — Inter is bundled through Fontsource. The app has its own CRYO identity.
- Responsive approach — Six viewport classes (320x640, 390x844, 768x1024, 1024x768, 1440x900, 1920x1080). Test narrow screens, long values and overflowing tables inside the table container.
- Component structure — Shared rendering and domain overrides are described in [UI components](docs/09-UI-COMPONENTS.md).

## Application Logic

- Authentication and authorization — Scrypt password hashes, ten-minute JWTs, seven-day refresh sessions, digest-only refresh storage and transactional rotation with replay revocation. The document engine resolves current role, company, action and field grants for each request.
- State management and API handling — React context restores the session. `CompanyContext` tracks and synchronizes the active company ID with `sessionStorage` and synchronous Axios request headers (`X-Company-Id`). Axios holds access credentials in memory, coordinates refresh, retries a failed bearer request once and cancels obsolete company data requests.
- Business logic — Company access and three quality masters are live with full CRUD and optimistic concurrency handling. Quality Feedback Template enforces unique parameter rows. Transactional ERP controller ports remain future work. [Business logic](docs/05-BUSINESS-LOGIC.md)
- Validation and error handling — Zod validates environment and request fields. Pre-submit validation catches missing required fields. Server 422 errors map to inline helper texts and `ValidationSummary` banners (with child row path decoding). Concurrency conflicts (412 STALE_VERSION) open `ConflictDialog`. Referential integrity blocks (409 REFERENCED) and unique collisions (409 DUPLICATE) display explanatory alerts.
- Document lifecycle and workflow integration — Verified masters use server-owned Draft status. Mutations check the stored lifecycle. Submit, cancel and amend require a domain handler with permission checks, version, idempotency and audit. Workflow and business status belong to those domain services.

## Database Architecture

- MongoDB collections and Mongoose schemas — Six identity and audit models, three strict company-scoped master models and an atomic sequence collection. Registered fields live under `fields` and embedded children have stable row IDs. [Schema and migration rules](docs/16-DOCUMENT-ENGINE.md)
- Document relationships — Embed bounded ordered child rows and link by immutable IDs. Independently updated or unbounded rows get dedicated indexed collections.
- Transactions and indexes — The API requires a writable replica set or compatible cluster. Rotation, logout and bootstrap commit with audit events. Startup creates unique identity and grant indexes, a refresh expiration TTL and audit lookup indexes. Future posting uses scoped uniqueness, optimistic versions and deterministic keys.
- Data integrity and audit — Decimal128 with explicit scales and decimal-string transport. Enforce quantity and state bounds and preserve reversal history. [Database design](docs/04-DOCTYPES-AND-DATABASE.md)

## API / Backend Integration

- API endpoints and methods — Health, readiness, login, refresh, logout, current user and company access are active under `/api/v1`. Phase 3 adds GET module discovery, type discovery and type metadata, document list/create, record read/update/delete, selector options and outgoing relations. [Methods and paths](docs/16-DOCUMENT-ENGINE.md#active-routes)
- Payload structures and response handling — Typed fields, cursor pagination, decimal strings, request IDs and a uniform error envelope. Updates and deletes require a quoted version in `If-Match`. Idempotency keys for domain commands are planned.
- Authentication and authorization requirements — Auth mutations require the CRYO request header and configured browser origins. Document requests require a current bearer, active membership via `X-Company-Id` and current grants. [API mapping](docs/07-API-MAPPING.md)

## Module Inventory

- Modules and source references — 21 ERPNext modules and 17 Frappe modules. The [module inventory](docs/02-MODULE-INVENTORY.md) lists every module and its source directory. The [module catalog](metadata/modules.json) preserves discovered subareas and outgoing dependencies.
- Dependencies — 204 grouped cross-module edges, five absent named app references, one unresolved DocType link, eight unresolved legacy navigation targets and one duplicate portal hook route.
- Implementation status — All 875 shipped DocTypes are classified. Three have verified document APIs and complete metadata-driven UI frontend integration. The reference catalog contains 14,719 fields, 375 child-table schemas, 24 workspaces, 29 page definitions, 207 reports, nine dashboards and 2,220 permission definitions.

## Components

### Login, AppLayout and Dashboard (implemented)

- Locations — `client/src/pages/Login/`, `client/src/layouts/AppLayout/` and `client/src/pages/Dashboard/`.
- Purpose — Sign in, navigate protected workspace routes, select an assigned company, see server-confirmed access and sign out.
- State and logic — AuthContext owns identity and session restoration. Pages handle pending, failure and empty states. The shell owns the mobile drawer, company selector, dynamic module links, and account menu.
- API dependencies — Login, refresh, logout, current user and company access. Related components include ProtectedRoute, shared view states, NotFound and Unauthorized.

### DynamicPage, DynamicListView, DynamicDetailView, DynamicForm, DynamicTable, DynamicField, DynamicWorkspace and ChildTable (implemented)

- Locations — `client/src/engine/` and `client/src/components/`.
- Purpose and props — Dynamically render authorized DocType metadata, dynamic list views, dynamic create/detail/edit forms, responsive tables, linked document autocompletes, ordered child tables, module workspaces, and audit timelines without hardcoding per-DocType pages.
- State and logic — Route-based DocType dispatcher (`DynamicPage`), multi-condition FilterBar, cursor-based pagination, declarative condition evaluation (`visibleWhen`) without dynamic code execution, optimistic concurrency handling (`If-Match` with side-by-side diff reload dialog on 412 STALE_VERSION), exclusion of immutable/read-only naming fields on PATCH, inline and summary validation errors (422 INVALID_FIELD), foreign-key reference delete protection (409 REFERENCED), unique value collision alerts (409 DUPLICATE), and fallback cards for unregistered reference DocTypes.
- API dependencies — `/api/v1/metadata/modules`, `/api/v1/metadata/doctypes`, `/api/v1/metadata/doctypes/:doctype`, `/api/v1/documents/:doctype`, `/api/v1/documents/:doctype/options`, `/api/v1/documents/:doctype/:id`, `/api/v1/documents/:doctype/:id/relations`, and company context with synchronous `X-Company-Id` header delivery.
- Related components — FilterBar, Pagination, ConfirmDialog, ConflictDialog, ValidationSummary, PermissionGuard, DocumentStatus, DocumentTimeline, UnsupportedField, LinkedDocumentSelector, ChildTable, DynamicSection, DynamicTabs, and DocumentActions. [Technical reference](docs/17-FRONTEND-METADATA-ENGINE.md)

## Business Workflows

- Workflow — Procurement, material issuance and manufacture, delivery, billing and payment. The dependency diagrams are in [workflows](docs/06-WORKFLOWS.md).
- Related modules — Buying, Stock, Manufacturing, Selling, Accounts and Frappe Workflow.
- Status transitions — Proposed draft/submit/cancel lifecycle and domain rollups from ledger and fulfillment state.
- Validation rules — Commit only eligible transitions, check restrictions and approval conditions, cap issuance, protect stock, reconcile ledger totals and preserve audit history.

## Change History

### 2026-11-19

#### Phase 4 metadata-driven React MUI frontend engine

- Created complete reusable engine in `client/src/engine/`: `DynamicPage`, `DynamicListView`, `DynamicDetailView`, `DynamicForm`, `DynamicTable`, `DynamicField`, `DynamicSection`, `DynamicTabs`, `DynamicWorkspace`, `ChildTable`, `LinkedDocumentSelector`, and `DocumentActions`.
- Created supporting components in `client/src/components/`: `FilterBar`, `Pagination`, `ConfirmDialog`, `ConflictDialog`, `ValidationSummary`, `PermissionGuard`, `DocumentStatus`, `DocumentTimeline`, and `UnsupportedField`.
- Added services and context: `client/src/services/documentApi.js`, updated `client/src/services/api.js` with active company ID interceptors, and created `client/src/context/CompanyContext/CompanyContext.jsx` with sessionStorage fallback and synchronous API client header synchronization.
- Updated shell and routing: Modified `client/src/layouts/AppLayout/` to dynamically load registered navigation modules and verified DocTypes, and updated `client/src/App.jsx` with route paths for `/documents/:doctype`, `/documents/:doctype/new`, `/documents/:doctype/:id`, `/documents/:doctype/:id/edit`, `/workspaces/:module`, and `/app/` aliases.
- Concurrency & Validation: Implemented ETag parsing and `If-Match: "<version>"` concurrency preconditions on mutations, triggering `ConflictDialog` with live diff reload on 412 STALE_VERSION. Implemented field validation mapping for 422 INVALID_FIELD across both top-level and child table nested paths (`fields.<table_name>.<idx>.<col>`), 409 DUPLICATE handling, and 409 REFERENCED delete restriction handling.
- Implemented declarative safe condition evaluation for `visibleWhen` rules without `eval` or dynamic code execution. Excluded immutable naming fields (`immutableAfterCreate: true`) and read-only fields from PATCH payloads.
- Verified on all 3 Phase 3 verified masters (`Quality Inspection Parameter Group`, `Quality Inspection Parameter`, and `Quality Feedback Template`). Added comprehensive end-to-end integration test suite `client/tests/documents.spec.js`.
- Created technical documentation: [Frontend metadata engine](docs/17-FRONTEND-METADATA-ENGINE.md).

#### Phase 3 document engine

- Created `server/engine/registry.js`, `policies.js`, `fields.js`, `models.js`, `document-values.js`, `document-service.js`, `list-query.js` and `metadata-contract.js` in the engine directory. Added `server/routes/documents.js`, `server/config/seed-document-grants.js`, `server/tests/documents.test.js`, `scripts/classify-doctypes.mjs`, [registration manifest](metadata/registration-manifest.json) and [frontend contract](docs/16-DOCUMENT-ENGINE.md).
- Modified `server/engine/reference-metadata.js`, `server/app.js`, `server/server.js`, `server/config/bootstrap-admin.js`, `server/middlewares/access.js` and `server/models/identity.js` for catalog loading, routing, startup, live grants and audit. Updated this project record and technical docs 04, 07, 08, 11, 12, 13 and 15. The frontend and dependency lockfile are unchanged.
- Registration — Selected Quality Inspection Parameter Group first because the pinned definition has one required unique naming field and needs no hierarchy service. Quality Inspection Parameter adds a group Link and a separately granted description. Quality Feedback Template embeds and validates bounded, ordered Quality Feedback Template Parameter rows. Customer Group and Item Group depend on tree semantics.
- Classification — 875 discovered, 875 classified, three registered, CRUD-enabled and verified. Primary statuses are 285 Discovered, 244 Requires Business Logic, 136 Unsupported, 207 Blocked and three Verified. The manifest independently flags 41 generic candidates for review. Child, singleton, virtual, tree, system-sensitive and source signals remain visible in the manifest.
- Field coverage — Strings (Data, Small Text, Long Text, Text, Phone, Autocomplete), plain-text Text Editor, Read Only, Int, Check, Select, Float, Currency, Percent, Date, Datetime, Time, Link, Dynamic Link, Table, Table MultiSelect and JSON have adapters. Section Break, Column Break, Tab Break, Heading, Fold, HTML, Button and Image are presentation types. Attach, Attach Image, Password, Barcode, Code, Color, Duration, Geolocation, HTML Editor, Icon, Markdown Editor, Rating, Signature and Vue Component block generic persistence.
- Storage and integrity — Compile explicit overlays with stable source-based names, strict field shapes, scoped unique indexes, timestamps and audited actor IDs. Support field-based names, prompted names and atomic prefix series. Store lifecycle and version on the server. An update or delete requires the observed version. Mutation, reference checks and audit commit together. A competing write to a link target prevents racing deletes from creating orphans.
- Permission changes — Bootstrap grants create/read/update/delete on three reviewed resources and read/update on the description field to the company-administrator role. Existing installations use the additive grant seed. Queries, serialization and field writes enforce grants. Unsupported actions have no document routes.
- Runtime — Verified Node v26.13.0 against the repository pins and the Node 26 LTS release line. No version discrepancy observed. [Node release schedule](https://nodejs.org/en/about/previous-releases)

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

- Completed — Phases 0–2 established references, running MERN foundation and auth. Phase 3 delivered registered document engine and API contract. Phase 4 delivered metadata-driven React MUI frontend engine, full vertical integration on verified masters, multi-tenancy header synchronization, optimistic concurrency conflict recovery, child tables, and responsive UI across 6 viewports.
- In Progress — None.
- Pending — Phase 5 Core DocType Rollout and Business Logic Engine, followed by Phases 6 through 9.
- Blocked — None for verified masters. Phase 5 rollout gates remaining DocTypes on domain controllers and approval.
- Next implementation task — Phase 5: Classify and rollout the next batch of core ERPNext business DocTypes (e.g. Item, Customer, Supplier) with their domain logic, transaction controllers, and posting rules.

## Known Issues

- Static inventory covers files and recognized definitions. Runtime customization, permissions, workflows, route resolution and operational business behavior require separate verification.
- Five absent app references include HRMS/payroll, Payments, Webshop, Insights and Lending. Review relevance and license before enabling an integration.
- `Payment Gateway Account.payment_gateway` points to an absent `Payment Gateway` DocType. Eight legacy Desktop Icon targets and one repeated portal rule need migration review.
- Nineteen observed field types fall outside the proposed MVP adapter list. No unexplained upstream field types, duplicate shipped definition names or extraction errors were reported.
- The live batch exercises Data, Text Editor, Link, Table and Section Break. Select has adapter tests. Global-write policy, ERP posting, complex client conditions, dedicated file/secret services, multi-member failover, production HTTPS and 500-user load remain open. Rate limiting is per process. Without Web Locks, cross-tab refresh can trigger replay revocation.

## Technical Decisions

- 2026-11-19 — Use Node and Git without package dependencies for read-only extraction. Use explicit discovery coverage and stable provenance, and treat code signals as candidates.
- 2026-11-19 — Plan a modular monolith and MongoDB transactional outbox for the initial deployment. Approve registry types explicitly. Use Decimal128 for financial and quantity values with explicit scales.
- 2026-11-19 — Use a visually distinct CRYO shell and propose Inter. The one-day MVP emphasizes navigation and reviewed draft master data, with operational posting and report parity in later phases.
- 2026-11-19 — Treat a strict material issuance cap as the CRYO default. Upstream material requests can allow overage through a setting. Any compatibility allowance needs approval.
- 2026-11-19 — Pin Node.js 26.13.0 and use one npm-workspace lockfile. Use a native single-member MongoDB replica set for local verification, with optional Compose for local development.
- 2026-11-19 — Phase 2 scoped roles to company memberships, resolved grants live and provisioned the initial company-read grant. Use scrypt, fixed-lifetime refresh sessions, audited digest rotation and replay-triggered revocation.
- 2026-11-19 — Treat the approved masters as company-scoped CRYO data. The contract revision, source checksum and policy overlay determine the registry version. Cursor sorting uses document ID to resolve ties. Preserve upstream extraction artifacts when regenerating the registration manifest.
- 2026-11-19 — Synchronize active company ID to `sessionStorage` and include `X-Company-Id` header on all metadata and document operations. Fallback synchronously from storage on initial mount to prevent un-scoped API calls.
- 2026-11-19 — Enforce optimistic concurrency on update/delete via HTTP `ETag` and `If-Match: "<version>"`. Surface concurrent edit diff in `ConflictDialog` on 412 STALE_VERSION with live reload.
- 2026-11-19 — Automatically strip naming and immutable fields (`immutableAfterCreate: true`) and read-only fields on form update to adhere to backend PATCH validation rules.
- 2026-11-19 — Maintain child table row identity via temporary `_clientKey` in React UI, preserving row array order, and serializing `rowId` for persistent rows while stripping transient keys.
- 2026-11-19 — Execute declarative condition evaluation (`visibleWhen`) without dynamic code execution (`eval` or `Function`).

## Testing Results

- Task — Phase 1 static extraction and handover.
- Tests executed — Both scanners, focused extractor CLI smoke tests, JavaScript syntax, full extraction and source-backed validation, corrupted-summary rejection, Markdown link and required deliverable checks, clean reference Git status.
- Result — 11,888 indexed files and 1,936 parsed JSON files. All 14 metadata JSON artifacts passed source-backed validation with zero extraction errors. Ten syntax checks, seven CLI smoke tests and 129 local Markdown link checks passed. The validator rejected a tampered count. Both copied licenses matched upstream byte for byte.
- Untested areas at Phase 1 — Upstream runtime, the then-unimplemented target and full business parity.

- Task — Phase 2 MERN foundation.
- Tests executed — Clean `npm ci`, npm audit, Node HTTP/database tests, Chrome UI tests, Vite production build, Compose config validation, local documentation links and reference Git checks.
- Result — 13 Node tests passed against native MongoDB 8.0.4, including rollback, readiness loss, role and company denial, concurrent rotation, replay and logout. All three Playwright tests passed. The browser suite covered six viewports from 320 to 1920 pixels, company switching, two-tab restoration, navigation, empty, loading and retry states. Reviewed phone and desktop screenshots. The build passed and npm audit reported zero known vulnerabilities.
- Untested areas — Docker container startup because Docker Desktop was inactive, multi-member MongoDB failover, production HTTPS, full accessibility review, 500-user workload, ERP domain workflows and document parity.

- Task — Phase 3 backend implementation and regressions.
- Tests executed — `npm test` passed all 24 backend tests on a real local replica set. `npm run test:ui` passed all three Chrome tests, including six viewport sizes. `npm run build` passed. Final run had zero test failures or skips.
- Coverage — Registry rejection and model identity, schema and field validation, protected fields, live grants, cross-company denial, child row ordering and edits, selector options, pagination, concurrent names and edits, reference/delete races, stale versions, and atomic value-free document audits. Individual field adapters and prefix series have narrower tests than the three registered masters.

- Task — Phase 4 frontend metadata engine.
- Tests executed — `npm test` backend test suite (24 tests), Playwright UI foundation suite (3 tests across 6 viewports), Playwright document engine integration suite `tests/documents.spec.js` (complete vertical integration covering navigation, list view, create, reload persistence, duplicate check, autocomplete linked selectors, reference delete restriction, inline editing, stale-version concurrency conflict recovery, child table reorder/remove/validation, company data isolation, unregistered DocType handling, and responsive layout across 6 viewports), and production build `npm run build`.
- Result — All 24 backend tests passed. All 4 Playwright browser tests passed on native replica set with Chrome. Production build succeeded cleanly with zero errors.
- Untested areas — Phase 5 unverified DocTypes (872 remaining DocTypes), ledger posting, complex transaction workflows, production HTTPS, multi-member replica failover, and 500-user concurrency benchmarks.

## Important Notes

Read the actual pinned source before translating a complex domain action. Static metadata and heuristics are inputs to implementation. Never load upstream scripts as executable code into the target. Keep source notices with reused material, and record scope and coverage before release.

## Agent Handover

- Current phase — Phase 4 complete. Next is Phase 5 – Core DocType Rollout and Business Logic Engine.
- First task — Expand registration and domain controllers to core master DocTypes (Item, Customer, Supplier, Warehouse). Ensure hierarchical tree structures, pricing/tax templates, and ledger posting controllers are authored and verified.
- Required reading — [Project rules](docs/14-PROJECT-RULES.md), [document contract](docs/16-DOCUMENT-ENGINE.md), [frontend metadata engine](docs/17-FRONTEND-METADATA-ENGINE.md), [registration manifest](metadata/registration-manifest.json), [UI components](docs/09-UI-COMPONENTS.md), [permissions](docs/08-AUTHENTICATION-PERMISSIONS.md) and [conversion plan](docs/12-CONVERSION-PLAN.md).
- Commands — Use `npm ci`, `npm test`, `npm run test:ui` and `npm run build`. Follow the [local development guide](docs/15-LOCAL-DEVELOPMENT.md) for replica setup and grants. Regenerate the Phase 3 manifest with `node scripts/classify-doctypes.mjs` after registry changes.
- Known blockers — None for verified masters. Live site exports, external app decisions and reviewed domain controllers gate wider coverage.
