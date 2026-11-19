# Target MERN architecture

## Phase 2 runtime

The npm workspace contains separate client and server packages with one lockfile and a pinned Node.js version. Express startup loads and checks the required Phase 1 catalogs, computes a SHA-256 checksum over their names and file digests, preserves original source IDs, checks the MongoDB topology and creates declared indexes. The loader is internal and exposes a source-ID lookup for Phase 3. Reference data remains separated from future overlays.

The Phase 2 backend introduced User, Role, Permission, Company, RefreshSession and AuditLog collections. Browser requests go through the shared Axios gateway. Refresh rotation and audit recording use MongoDB transactions. Phase 3 compiles registered models at startup and routes document requests through shared grant resolution, validated fields and transactional mutation services. Ledger posting and the outbox remain planned. [Document engine](16-DOCUMENT-ENGINE.md) [Local setup](15-LOCAL-DEVELOPMENT.md) · [Active API](07-API-MAPPING.md)

The Phase 2 foundation is a modular Express API and Vite app backed by a single MongoDB deployment. Keep business modules in one server and use a transactional outbox for jobs. This gives the 500-registered-user deployment a small operational footprint. Benchmark actual concurrent traffic and long-running reports before scaling.

```text
CRYO-ERP/
  AGENTS.md
  project.md
  reference/{erpnext,frappe}/
  scripts/
  metadata/
  docs/
  client/src/
    assets/  components/  engine/  layouts/  modules/  pages/
    hooks/  context/  routes/  services/  styles/  utils/
  server/
    config/  controllers/  models/  routes/  services/
    engine/  modules/  workflows/  middlewares/  validators/  utils/  tests/
```

Create folders when the first implementation needs them. Keep extraction artifacts tied to upstream commits. Build an effective versioned registry from reviewed upstream inputs, explicit allowlists and a separate CRYO overlay. Entries include canonical ID, source, field definitions, permissions, available actions, feature status and model or service adapter. Client registry responses include only the metadata required and permitted for the caller.

```mermaid
flowchart LR
    Ref[Pinned JSON inputs] --> Registry[Reviewed metadata registry]
    Overlay[CRYO overlay] --> Registry
    Browser[React and MUI] --> API[Express REST with JWT]
    API --> Policy[Type registration and permissions]
    Registry --> Policy
    Policy --> Services[Document and domain services]
    Services --> DB[(MongoDB replica set)]
    DB --> Worker[Outbox worker]
```

Controllers parse typed requests and delegate. The metadata registry compiles approved descriptors. Document services implement validated CRUD, optimistic versions, naming sequences, lifecycle and workflow. Specialized modules implement order mapping, stock and reservations, manufacturing, accounting and reconciliation. Attachments, timeline, notifications and reporting are shared services with scoped access. Begin with a separately enabled registry for read-only definitions and a reviewed allowlist of editable master types. A transactional DocType remains unavailable until its domain service is verified.

Use environment-specific configuration for JWT, MongoDB and allowed origins, and Docker where it makes local and deployment paths repeatable. Provide health and readiness endpoints, MongoDB replica-set validation, controlled migrations, connection pooling and request IDs. Configure backups and test restore, keep auditing and job retries observable, and index the list and posting paths. Use explicit client/server build scripts and pin approved dependency versions during implementation. [Database plan](04-DOCTYPES-AND-DATABASE.md) · [API contract](07-API-MAPPING.md) · [Conversion plan](12-CONVERSION-PLAN.md)
