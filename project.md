# Project Documentation

## Project Overview

- Project purpose — Build CRYO ERP with functional coverage of the pinned ERPNext and Frappe references, followed by client-specific overlays.
- Technology stack — React, Vite, MUI, Google Material Icons, Google Fonts, SCSS Modules, React Router, Axios, Node.js, Express, REST, JWT, Mongoose and MongoDB with replica-set transactions.
- Main architecture — Versioned metadata registry and reusable rendering, with separate server services for lifecycle, permissions and domain commands.
- Target users — Approximately 500 registered users. Concurrent workload and capacity remain unmeasured.
- Important conventions — Preserve references and upstream notices. Follow [project rules](docs/14-PROJECT-RULES.md). Keep proposed behavior distinct from implementation status.
- Reference repositories — ERPNext `develop`, `04985378822020da230b7bf77ffc40c63c77a91a`. Frappe `develop`, `a9488f482626a9794457c89ad88b31a881cb79a9`. Both clean at review.
- Current development phase — Phase 1 deliverables are in place. Phase 2 is the next implementation phase.

## Project Structure

- Important folders — `reference/` contains cloned inputs, `scripts/` contains Node and Git extraction tooling, `metadata/` contains generated definitions, and `docs/` contains 15 technical Markdown documents. No MERN client or server scaffolds exist.
- Important files — [AGENTS.md](AGENTS.md), [extract-metadata.js](scripts/extract-metadata.js), [validate-metadata.js](scripts/validate-metadata.js), [extraction summary](metadata/extraction-summary.json).
- Component structure — The planned client uses named component folders, JSX and colocated SCSS Modules. The architecture doc describes planned client and server paths.
- Shared utilities — The repo scanner supplies definitions, evidence and provenance to the focused extractors and shared orchestration. Focused extraction CLIs print one normalized catalog to stdout.
- Metadata structure — 14 JSON artifacts. The requested catalogs are supplemented by navigation edges, configuration definitions and the source index. Record IDs encode the repository-relative file path and array index. Samples retain provenance. Both upstream license texts are copied into `metadata/licenses/`. Future CRYO overlays live separately.

## UI & Styling Rules

- MUI usage — Standard MUI forms, tables, dialogs and layouts, combined in a distinct CRYO shell.
- Google Material Icons — Use Google Material Icons via MUI. Supply accessible action labels.
- SCSS Modules — Apply custom styles through each component's named module. Use shared tokens and relevant layout regions.
- Google Fonts — Inter is proposed. No font files or frontend assets have been added.
- Responsive approach — Six viewport classes. Test narrow screens, long values and overflowing tables inside the table container.
- Component structure — Shared rendering and domain overrides are described in [UI components](docs/09-UI-COMPONENTS.md).

## Application Logic

- Authentication and authorization — Planned access and refresh flow with JWT and rotating sessions, plus default-deny server policy scoped by document type, action, record, field and company.
- State management and API handling — Proposed context for session state, local draft state and a shared Axios client for request, cancellation, error and refresh handling.
- Business logic — No target domain code exists. Selected reference controller rules were read and documented in [business logic](docs/05-BUSINESS-LOGIC.md).
- Validation and error handling — Planned typed request schemas, revision preconditions, field allowlists, service validation and consistent error envelopes.
- Document lifecycle and workflow integration — Draft, submitted and cancelled are separate from workflow and domain state. Plan typed transitions, audited reversals and outbox side effects. Upstream definitions are evidence and stay inert.

## Database Architecture

- MongoDB collections and Mongoose schemas — Proposed registered type mappings, scoped settings, identities, ledgers, balances, idempotency, sequences, audit and outbox. No target schema is implemented.
- Document relationships — Embed bounded ordered child rows and link by immutable IDs. Independently updated or unbounded rows get dedicated indexed collections.
- Transactions and indexes — Use a replica set, scoped uniqueness, optimistic versions, balance predicates and deterministic posting keys. Commit ledger, state, counters, audit and outbox together.
- Data integrity and audit — Decimal128 with explicit scales and decimal-string transport. Enforce quantity and state bounds and preserve reversal history. [Database design](docs/04-DOCTYPES-AND-DATABASE.md)

## API / Backend Integration

- API endpoints and methods — Proposed `/api/v1` auth, metadata, document, action, attachment, search, timeline and reporting routes. No target routes are implemented.
- Payload structures and response handling — Typed input, stable cursor pagination, decimal strings, request IDs and a uniform error envelope. Critical writes carry version and idempotency preconditions.
- Authentication and authorization requirements — Server-executed auth, scoped queries and field filtering. Keep generic APIs behind registration and dedicated action handlers. [API mapping](docs/07-API-MAPPING.md)

## Module Inventory

- Modules and source references — 21 ERPNext modules and 17 Frappe modules. The [module inventory](docs/02-MODULE-INVENTORY.md) lists every module and its source directory. The [module catalog](metadata/modules.json) preserves discovered subareas and outgoing dependencies.
- Dependencies — 204 grouped cross-module edges, five absent named app references, one unresolved DocType link, eight unresolved legacy navigation targets and one duplicate portal hook route.
- Implementation status — Metadata only. 875 shipped DocTypes, 14,719 fields, 375 child-table schemas, 24 workspaces, 29 page definitions, 207 reports, nine dashboards and 2,220 permission definitions.

## Components

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

#### Phase 1 repository analysis and design

- What was changed — Initialized project memory and agent rules. Added automated inventory, normalization and validation for both references, copied licenses and documented the future MERN conversion.
- Files changed — `AGENTS.md`, `project.md`, 10 Node scripts in `scripts/`, 14 generated JSON files and two license texts under `metadata/`, and 15 documents under `docs/`.
- Logic changed — New Phase 1 tooling only. It reads source as data, indexes paths and syntax signals, distinguishes shipped and sample records and reports unresolved references.
- Reason — Provide reproducible input for a metadata-driven ERP engine and capture the areas that need authored domain services.
- Impact — Both reference trees remain clean. The pre-existing root change in `test.txt` was preserved. Application foundation work is pending.
- Verification — Regenerated and checked all JSON against both reference trees. Invalid summary total correctly failed the validator. See Testing Results.

## Current Progress

- Completed — Phase 0 local clones recorded. Phase 1 static inventory, generated metadata, selected manual source review, licenses, architecture, roadmap and handover.
- In Progress — None.
- Pending — Phases 2 through 9, including verified business implementations, integration choices and CRYO overlays.
- Blocked — None for Phase 2. Effective site-specific behavior requires site data or stakeholder evidence.
- Next implementation task — Start Phase 2 by scaffolding the approved Vite/MUI client and Express server and establishing a local MongoDB replica-set connection, health/readiness and JWT authentication with tested server-side role and company scope.

## Known Issues

- Static inventory covers files and recognized definitions. Runtime customization, permissions, workflows, route resolution and operational business behavior require separate verification.
- Five absent app references include HRMS/payroll, Payments, Webshop, Insights and Lending. Review relevance and license before enabling an integration.
- `Payment Gateway Account.payment_gateway` points to an absent `Payment Gateway` DocType. Eight legacy Desktop Icon targets and one repeated portal rule need migration review.
- Nineteen observed field types fall outside the proposed MVP adapter list. No unexplained upstream field types, duplicate shipped definition names or extraction errors were reported.

## Technical Decisions

- 2026-11-19 — Use Node and Git without package dependencies for read-only extraction. Use explicit discovery coverage and stable provenance, and treat code signals as candidates.
- 2026-11-19 — Plan a modular monolith and MongoDB transactional outbox for the initial deployment. Approve registry types explicitly. Use Decimal128 for financial and quantity values with explicit scales.
- 2026-11-19 — Use a visually distinct CRYO shell and propose Inter. The one-day MVP emphasizes navigation and reviewed draft master data, with operational posting and report parity in later phases.
- 2026-11-19 — Treat a strict material issuance cap as the CRYO default. Upstream material requests can allow overage through a setting. Any compatibility allowance needs approval.

## Testing Results

- Task — Phase 1 static extraction and handover.
- Tests executed — Both scanners, focused extractor CLI smoke tests, JavaScript syntax, full extraction and source-backed validation, corrupted-summary rejection, Markdown link and required deliverable checks, clean reference Git status.
- Result — 11,888 indexed files and 1,936 parsed JSON files. All 14 metadata JSON artifacts passed source-backed validation with zero extraction errors. Ten syntax checks, seven CLI smoke tests and 129 local Markdown link checks passed. The validator rejected a tampered count. Both copied licenses matched upstream byte for byte.
- Untested areas — Upstream runtime, target build, UI, API, transactions, security behavior, performance and full business parity. The target application does not exist yet.

## Important Notes

Read the actual pinned source before translating a complex domain action. Static metadata and heuristics are inputs to implementation. Never load upstream scripts as executable code into the target. Keep source notices with reused material, and record scope and coverage before release.

## Agent Handover

- Current phase — Phase 1 complete. Phase 2 pending.
- Last completed task — Cataloged and validated both reference trees and documented the architecture and follow-on dependencies.
- Next task — Choose and pin a Node LTS version for the application. Scaffold `client/` and `server/`. Add validated environment configuration and local MongoDB replica-set startup. Implement health/readiness, JWT login/refresh/logout and one protected endpoint. Test startup, transaction availability, refresh rotation and role/company denial before starting the registry.
- Required files to read — [AGENTS.md](AGENTS.md), this file, [project rules](docs/14-PROJECT-RULES.md), [MERN architecture](docs/11-MERN-ARCHITECTURE.md), [API mapping](docs/07-API-MAPPING.md), [permissions](docs/08-AUTHENTICATION-PERMISSIONS.md), [conversion plan](docs/12-CONVERSION-PLAN.md) and [extraction summary](metadata/extraction-summary.json).
- Commands to continue — Run `node scripts/validate-metadata.js --check-sources`. On reference or extractor changes, run `node scripts/extract-metadata.js` and validate again.
- Known blockers — None for the foundation. Live site exports and external app decisions are dependency gates for relevant later features.
