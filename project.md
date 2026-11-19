# Project Documentation

## Project Overview

- Project purpose — Build CRYO ERP with functional coverage of the pinned ERPNext and Frappe references, followed by client-specific overlays.
- Technology stack — React, Vite, MUI, Google Material Icons, Google Fonts, SCSS Modules, React Router, Axios, Node.js, Express, REST, JWT, Mongoose and MongoDB with replica-set transactions.
- Main architecture — Versioned metadata registry and reusable rendering, with separate server services for lifecycle, permissions and domain commands.
- Target users — Approximately 500 registered users. Concurrent workload and capacity remain unmeasured.
- Important conventions — Preserve references and upstream notices. Follow [project rules](docs/14-PROJECT-RULES.md). Keep proposed behavior distinct from implementation status.
- Reference repositories — ERPNext `develop`, `04985378822020da230b7bf77ffc40c63c77a91a`. Frappe `develop`, `a9488f482626a9794457c89ad88b31a881cb79a9`. Both clean at review.
- Current development phase — Phase 3 backend engine complete. Phase 4 is the metadata-driven React MUI form, table, page and workspace engine.

## Project Structure

- Important folders — `client/` contains the Vite/MUI app. `server/engine/` and `server/routes/` contain the registry, compiled models, services and HTTP routes. `metadata/` holds the 14 Phase 1 JSON artifacts and the Phase 3 registration manifest. [Local development](docs/15-LOCAL-DEVELOPMENT.md)
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

- Authentication and authorization — Scrypt password hashes, ten-minute JWTs, seven-day refresh sessions, digest-only refresh storage and transactional rotation with replay revocation. The document engine resolves current role, company, action and field grants for each request.
- State management and API handling — React context restores the session. Axios holds access credentials in memory, coordinates refresh, retries a failed bearer request once and cancels obsolete company data requests.
- Business logic — Company access and three quality masters are live. Quality Feedback Template enforces unique parameter rows. Transactional ERP controller ports remain future work. [Business logic](docs/05-BUSINESS-LOGIC.md)
- Validation and error handling — Zod validates environment and request fields. API middleware standardizes errors, request IDs, restricted origins, security headers and rate limits.
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
- Implementation status — All 875 shipped DocTypes are classified. Three have verified document APIs. The reference catalog contains 14,719 fields, 375 child-table schemas, 24 workspaces, 29 page definitions, 207 reports, nine dashboards and 2,220 permission definitions.

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
- API dependencies — Authorized metadata, document CRUD, link options, relations and version preconditions are available. Domain actions require future services.
- Related components — DynamicField, DynamicTabs, ChildTable, LinkedDocumentSelector and DocumentActions. [Component design](docs/09-UI-COMPONENTS.md)

## Business Workflows

- Workflow — Procurement, material issuance and manufacture, delivery, billing and payment. The dependency diagrams are in [workflows](docs/06-WORKFLOWS.md).
- Related modules — Buying, Stock, Manufacturing, Selling, Accounts and Frappe Workflow.
- Status transitions — Proposed draft/submit/cancel lifecycle and domain rollups from ledger and fulfillment state.
- Validation rules — Commit only eligible transitions, check restrictions and approval conditions, cap issuance, protect stock, reconcile ledger totals and preserve audit history.

## Change History

### 2026-11-19

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

- Completed — Phases 0–2 established the references, inventory, running MERN foundation and authentication. Phase 3 delivered and tested the registered document engine, manifest and Phase 4 API contract.
- In Progress — None.
- Pending — Phases 4 through 9, beginning with metadata-driven React forms, tables, pages and workspaces.
- Blocked — No blocker for Phase 4 on the verified masters. Effective site-specific behavior requires site data or stakeholder evidence.
- Next implementation task — Carry the selected company through shared Axios document requests and render a metadata-driven list and form for Quality Inspection Parameter Group. Exercise create, reload, field validation and stale-version recovery before expanding to links and child rows.

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
- Tests executed — `npm test` passed all 24 backend tests on a real local replica set. `npm run test:ui` passed all three Chrome tests, including six viewport sizes. `npm run build` passed. Final run had zero test failures or skips. One intervening Playwright launch could not locate its default headless Chromium binary. Re-running with the installed Chrome executable via `CRYO_TEST_BROWSER` passed all three tests.
- Coverage — Registry rejection and model identity, schema and field validation, protected fields, live grants, cross-company denial, child row ordering and edits, selector options, pagination, concurrent names and edits, reference/delete races, stale versions, and atomic value-free document audits. Individual field adapters and prefix series have narrower tests than the three registered masters.

## Important Notes

Read the actual pinned source before translating a complex domain action. Static metadata and heuristics are inputs to implementation. Never load upstream scripts as executable code into the target. Keep source notices with reused material, and record scope and coverage before release.

## Agent Handover

- Current phase — Phase 3 complete. Next is Phase 4 – Metadata-Driven React MUI Form, Table, Page and Workspace Engine.
- First task — Supply the active company on document requests through shared Axios. Fetch authorized metadata for Quality Inspection Parameter Group, render its list and form, create and reload a record, and display field errors and stale-version recovery using the server contract. Then cover Quality Inspection Parameter link options and permissions, Quality Feedback Template child rows, and workspace routing.
- Required reading — [Project rules](docs/14-PROJECT-RULES.md), [document contract](docs/16-DOCUMENT-ENGINE.md), [registration manifest](metadata/registration-manifest.json), [UI components](docs/09-UI-COMPONENTS.md), [permissions](docs/08-AUTHENTICATION-PERMISSIONS.md) and [conversion plan](docs/12-CONVERSION-PLAN.md).
- Commands — Use `npm ci`, `npm test`, `npm run test:ui` and `npm run build`. Follow the [local development guide](docs/15-LOCAL-DEVELOPMENT.md) for replica setup and grants. Regenerate the Phase 3 manifest with `node scripts/classify-doctypes.mjs` after registry changes.
- Known blockers — None for the three verified masters. Live site exports, external app decisions and reviewed domain controllers gate wider coverage.
