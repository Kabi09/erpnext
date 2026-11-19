# Conversion plan and one-day MVP

| Phase | Dependency and deliverable | Acceptance gate |
| --- | --- | --- |
| 0 | Pin both reference repositories | Branches and commit hashes recorded |
| 1 | Inventory, static signals, selected controller reviews and design | Extraction and validation are repeatable. Findings and gaps documented |
| 2 | Vite/MUI React client, Express API, Mongoose replica-set connection, authentication and authorization | Build, health/readiness, login, rotation and protected-route tests pass |
| 3 | Metadata registry, model mapping, validations, document service, lifecycle and authorization | Version conflicts, relation checks, field permissions, idempotency and rollback verified on approved sample types |
| 4 | Workspace shell, sidebar, dashboard surface, forms, tables and tabs | Keyboard navigation, six viewport classes and loading, empty and error states verified |
| 5 | Generate route and workspace coverage for applicable registered definitions | Module-by-module coverage matrix labels available, read-only, deferred and unsupported capabilities |
| 6 | Port specialized logic in dependency order | Golden fixtures reconcile downstream inventory, workflow and accounting effects |
| 7 | Cross-module flows, permission parity, reports and dashboards | Department scenarios and report totals verified |
| 8 | Functional, security, responsive and performance testing, fixes and restore drill | Signed workload, latency and concurrency targets met with recorded measurements |
| 9 | CRYO-specific overlays, branding, modules and settings | Client acceptance and repeatable migration |

Phase 6 dependency order begins with identity, Company, currency, calendar, UOM, Item, Warehouse, parties and account masters. Stage common accounting and stock posting primitives first, then procurement receipts and sales fulfillment, then BOM and Work Orders, reservation and production, returns and payments, subcontracting and remaining business modules. Review regional extensions, integrations and optional apps when their owners and data contracts are established. Platform utilities and settings can proceed in parallel once their authorization and registry contracts stabilize.

For the one-day MVP, prioritize the foundation, permission-filtered metadata navigation and read-only generated screens. If foundation and security checks pass, enable tested draft CRUD for a small explicitly registered master-data subset. Include a visible implementation state and real API-backed loading and error views. Disable unavailable action and report routes. Scope transactional posting, tax, valuation, report parity and CRYO configuration to later phases.

Phase 2 provides the client and server foundation. [Local development](15-LOCAL-DEVELOPMENT.md) covers installation, replica-set setup, bootstrap, startup and verification.

Phase 3 begins by compiling a versioned, deny-by-default registry from the existing source-ID loader. Select one non-submittable master DocType and document its approved fields and company policy. Map it to a Mongoose schema with version and index rules. Wire the first authenticated document endpoints through the existing HTTP and authorization middleware, and test unregistered types, field and company denial, valid writes, schema errors and stale versions. Add child rows, links, naming and lifecycle tests incrementally before turning on further types.

Later, verify translations, permissions, child layouts and action states from standard fixtures, and test parallel submits, duplicate retries and rollback across modules. Exercise typical and stress workloads for mixed reads, report exports and posting. Record latency, throughput, database contention and audit/outbox backlog before signing off 500-user operation.
