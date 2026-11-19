# Frontend Metadata Engine (Phase 4)

CRYO ERP's Phase 4 frontend engine generates responsive Material UI views dynamically from authorized DocType metadata supplied by the Phase 3 backend registry. It eliminates manual per-DocType form and table coding while enforcing company multi-tenancy, field permissions, immutable naming rules, optimistic concurrency, and child table constraints.

## 1. Architectural Overview

The engine bridges the Phase 3 backend contract (`/api/v1/metadata/*` and `/api/v1/documents/*`) into interactive React 19 views. It operates strictly on authorized metadata, rendering functional controls only for registered, permitted capabilities while presenting explicit fallback states for unpermitted, unregistered, or unsupported fields and DocTypes.

```text
                           ┌──────────────────────────────┐
                           │      React Router v7         │
                           │  /documents/:doctype/*       │
                           │  /workspaces/:module         │
                           └──────────────┬───────────────┘
                                          │
                                          ▼
                           ┌──────────────────────────────┐
                           │         DynamicPage          │
                           │  Resolves authorized meta    │
                           │  and dispatches to subviews  │
                           └──────┬───────────────┬───────┘
                                  │               │
                  ┌───────────────┘               └───────────────┐
                  ▼                                               ▼
      ┌─────────────────────────┐                     ┌─────────────────────────┐
      │     DynamicListView     │                     │    DynamicDetailView    │
      │  FilterBar, Table,      │                     │  Actions, Timeline,     │
      │  Pagination, Confirm    │                     │  Relations, Conflict    │
      └───────────┬─────────────┘                     └───────────┬─────────────┘
                  │                                               │
                  ▼                                               ▼
      ┌─────────────────────────┐                     ┌─────────────────────────┐
      │      DynamicTable       │                     │       DynamicForm       │
      │  Sortable columns,      │                     │  Layout parser, Tabs,   │
      │  row navigation,        │                     │  Sections, Validation   │
      │  MUI TableContainer     │                     └───────────┬─────────────┘
      └─────────────────────────┘                                 │
                                                  ┌───────────────┴───────────────┐
                                                  ▼                               ▼
                                      ┌───────────────────────┐       ┌───────────────────────┐
                                      │     DynamicField      │       │      ChildTable       │
                                      │  Type renderers,      │       │  Ordered rows, keys,  │
                                      │  Autocomplete Link,   │       │  add/reorder/remove,  │
                                      │  declarative visible  │       │  container scroll     │
                                      └───────────────────────┘       └───────────────────────┘
```

## 2. Component Hierarchy and Responsibilities

All components follow the CRYO standard structure (`ComponentName/ComponentName.jsx` and `ComponentName.module.scss`) using standard layout containers (`.container > .wrapper > (.toprow, .middlerow, .bottomrow)`).

### Core Engine Components (`client/src/engine/`)

| Component | Purpose & Contract |
|---|---|
| `DynamicPage` | Top-level route controller. Dispatches between List (`/documents/:doctype`), Create (`/new`), and Detail/Edit (`/:id`, `/:id/edit`). Enforces registered DocType checks, displaying `DocType Unavailable` for unmapped or unauthorized models. |
| `DynamicListView` | Searchable, paginated document list. Coordinates `FilterBar`, server-side cursor pagination, metadata-driven `DynamicTable`, and deletion confirmation. |
| `DynamicDetailView` | View and edit controller for individual records. Renders document status, version badges, outgoing link relations, audit timeline, and triggers the `ConflictDialog` upon concurrency collisions. |
| `DynamicForm` | Metadata-driven form compiler. Parses `metadata.layout` into tabs and sections. Automatically filters out immutable naming fields (`immutableAfterCreate: true`) and read-only fields on edit payloads to adhere to backend PATCH validation. |
| `DynamicField` | Type-specific input dispatcher. Maps 22 Phase 3 field types to MUI controls. Evaluates safe declarative conditions (`visibleWhen`) without `eval` or dynamic code execution. Displays `UnsupportedField` badge for blocked types. |
| `DynamicTable` | Responsive MUI table for list views. Supports server-sorted columns, formatted date/time and currency cells, status badges, and row-level edit/delete actions governed by metadata capabilities. |
| `DynamicSection` | Layout section renderer with responsive multi-column grid layout (`grid-template-columns`). |
| `DynamicTabs` | Tab Break layout renderer using MUI `Tabs` and `TabPanel`. |
| `DynamicWorkspace` | Module landing dashboard displaying categorized cards for verified DocTypes and informational placeholders for unverified reference types. |
| `ChildTable` | Embedded table renderer for child DocTypes (e.g., `Quality Feedback Template Parameter`). Preserves stable React keys (`_clientKey`), allows adding, reordering (up/down), and removing rows, handles cell validation errors, and enforces container-only scrolling. |
| `LinkedDocumentSelector` | Debounced MUI `Autocomplete` fetching options from `/api/v1/documents/:doctype/options`. |
| `DocumentActions` | Uniform action bar rendering Save, Cancel, Edit, Delete, and Refresh buttons based on document state and server capabilities. |

### Supporting UI Components (`client/src/components/`)

| Component | Purpose |
|---|---|
| `FilterBar` | Search text input, field-specific filter dropdown, date-range inputs, and clear/refresh actions. |
| `Pagination` | Cursor-based page navigation (Previous / Next) with row-limit selector (10, 25, 50, 100). |
| `ConfirmDialog` | Accessible confirmation modal for destructive operations (e.g., document deletion). |
| `ConflictDialog` | Optimistic concurrency conflict dialog displayed on 412 `STALE_VERSION`. Shows side-by-side diff between submitted values and current server values with a "Reload Latest Version" action. |
| `ValidationSummary` | Form-level alert banner mapping field paths (including child table row and column paths such as `fields.parameters.0.parameter`) to human-readable labels. |
| `PermissionGuard` | Declarative wrapper hiding or disabling UI elements when the user's role lacks required capabilities. |
| `DocumentStatus` | Visual chip displaying lifecycle status (Draft) alongside document version (`v1`, `v2`). |
| `DocumentTimeline` | Audit panel displaying created timestamp, creator ID, last modified timestamp, and owner ID. |
| `UnsupportedField` | Informational chip alerting users when an upstream field type cannot be edited via generic forms. |

## 3. API Contract and Multi-Tenancy

Every request made by `documentApi.js` flows through the shared Axios client and strictly includes:
1. `Authorization: Bearer <token>`: Current session access JWT.
2. `X-Company-Id: <companyId>`: Active company identifier selected by the user.

### Company Synchronization
- `CompanyContext` centralizes active company selection, backing it to `sessionStorage` under `cryo_active_company`.
- The Axios request interceptor attaches the company header synchronously from memory or `sessionStorage` fallback, ensuring initial component mounts never issue un-scoped requests.
- Switching companies immediately invalidates cached document lists and resets navigation state to maintain strict tenant isolation.

## 4. Optimistic Concurrency & Conflict Recovery

The backend enforces optimistic concurrency via version integers and HTTP `ETag` / `If-Match` headers.
1. When a document is fetched via `GET /documents/:doctype/:id`, the engine extracts the version from the `ETag` header (e.g., `ETag: "2"`) or payload `version`.
2. When saving modifications via `PATCH /documents/:doctype/:id`, the engine sends `If-Match: "<version>"`.
3. If another user modified the record in the interim, the server returns `412 Precondition Failed` (`STALE_VERSION`).
4. `DynamicDetailView` catches the 412 error, fetches the current server version, and renders `ConflictDialog`. The user can inspect the concurrent edits and click "Reload Latest Version" to update their form state safely.

## 5. Field Validation & Error Handling

- **Pre-Submit Validation**: `DynamicForm` verifies all `required: true` fields before dispatching API calls, marking invalid inputs with helper text and focusing the first invalid control.
- **Server Validation (422 `INVALID_FIELD`)**: Server-returned validation errors are parsed and dispatched to two targets:
  - Form-level `ValidationSummary` alert banner detailing all validation errors.
  - Inline `error` and `helperText` properties on individual `DynamicField` and `ChildTable` cell inputs.
- **Child Table Error Pathing**: Errors returned on nested rows (e.g., `fields.parameters.1.parameter`) are parsed by `ValidationSummary` to format user-friendly labels (e.g., `Parameters row #2 (Parameter): Duplicate child value`).
- **Duplicate Value Errors (409 `DUPLICATE`)**: Handled by surfacing an alert identifying the conflicting unique field value.
- **Referential Integrity Guards (409 `REFERENCED`)**: When deleting a master linked by existing documents (e.g., deleting a `Quality Inspection Parameter Group` referenced by a `Quality Inspection Parameter`), the backend blocks deletion with 409. The engine surfaces the dependency error banner, preventing dangling records.

## 6. Immutable Fields and PATCH Payloads

In accordance with Phase 3 rules, fields designated as autoname sources or marked `set_only_once` (`immutableAfterCreate: true`) cannot be included in PATCH payloads. `DynamicForm` automatically prunes immutable and read-only fields when submitting update forms, preventing spurious 422 errors while allowing unrestricted creation.

## 7. Responsive Layout and Accessibility

All engine pages and components are styled with SCSS Modules and verified across 6 responsive viewport breakpoints (320x640 mobile, 390x844 modern mobile, 768x1024 tablet portrait, 1024x768 tablet landscape, 1440x900 desktop, 1920x1080 high-res monitor).
- Tables utilize internal scroll containers (`TableContainer`) to avoid page-level horizontal overflow.
- Inputs utilize accessible ARIA roles, labels, and helper texts compatible with screen readers and automated test locators.
