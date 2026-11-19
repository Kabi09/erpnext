# Module, Workspace, Page and Navigation Generation (Phase 5)

CRYO ERP's Phase 5 expands application coverage from the initial Phase 4 verified DocTypes into a comprehensive metadata-driven application framework. It dynamically discovers, catalogs, and navigates all 38 modules, 24 workspaces, 875 DocTypes, 208 reports, and 35 custom pages, while safely controlling registration and execution across 22 core master DocTypes, hierarchical tree structures, dynamic query reports, and an administrator coverage matrix.

---

## 1. Architectural Overview

Phase 5 introduces a three-tier architecture that separates **raw metadata extraction**, **dynamic catalog generation & indexing**, and **controlled master runtime execution**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Extracted Metadata (Phase 1)                         │
│  • 38 Modules  • 24 Workspaces  • 875 DocTypes  • 208 Reports  • 35 Pages │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Server Catalog & Navigation Engine                       │
│  • server/engine/navigation.js : Full catalog, search index & coverage  │
│  • server/engine/tree.js       : Hierarchical tree validation & graphs │
│  • server/engine/reports.js    : Master query handlers & CSV engine    │
│  • server/engine/pages.js      : Custom page registry & dispatch       │
│  • server/engine/registry.js   : 22 Controlled Master Registrations    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ DynamicWorkspaces     │ │ Global Search & Tree  │ │ Reports & Coverage    │
│ • 24 Standard Views   │ │ • Ctrl+K Search Modal │ │ • ReportViewer & CSV  │
│ • Synthesized Fallbacks│ │ • Recursive TreeView  │ │ • DynamicCustomPage   │
│ • Unregistered Modal  │ │ • List/Tree Toggle    │ │ • Coverage Dashboard  │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 2. Controlled Core Masters (Batch 5C)

To prevent runtime link resolution errors and maintain clean data integrity, 22 foundational master DocTypes were registered in strict **topological dependency order**. Each registered master underwent controller review for naming conventions, immutable fields, company-scoping policies, and child table bindings.

### Registered Master Catalog

| # | DocType | Module | Type / Hierarchy | Key Relations / Parent Link | Child Tables |
|---|---|---|---|---|---|
| 1 | `Quality Inspection Parameter Group` | Quality Management | Flat Master | `company` | — |
| 2 | `Quality Inspection Parameter` | Quality Management | Flat Master | `company`, `parameter_group` | — |
| 3 | `Quality Feedback Template` | Quality Management | Parent Master | `company` | `Quality Feedback Template Parameter` |
| 4 | `UOM` | Setup | Standalone Master | Global Master (all companies) | — |
| 5 | `UOM Conversion Factor` | Setup | Child-Like Master | `from_uom`, `to_uom` | — |
| 6 | `Currency` | Setup | Standalone Master | Global Master | — |
| 7 | `Currency Exchange` | Setup | Rate Master | `from_currency`, `to_currency` | — |
| 8 | `Territory` | Setup | **Tree Master** | `parent_territory` (Self) | — |
| 9 | `Customer Group` | Setup | **Tree Master** | `parent_customer_group` (Self) | — |
| 10 | `Supplier Group` | Setup | **Tree Master** | `parent_supplier_group` (Self) | — |
| 11 | `Item Group` | Setup | **Tree Master** | `parent_item_group` (Self) | — |
| 12 | `Sales Person` | Setup | **Tree Master** | `parent_sales_person` (Self) | — |
| 13 | `Warehouse` | Stock | **Tree Master** | `parent_warehouse`, `company` | — |
| 14 | `Department` | HR | **Tree Master** | `parent_department`, `company` | — |
| 15 | `Designation` | HR | Flat Master | `company` | — |
| 16 | `Employment Type` | HR | Flat Master | Global Master | — |
| 17 | `Branch` | Setup | Flat Master | `company` | — |
| 18 | `Terms and Conditions` | Setup | Content Master | `company` | — |
| 19 | `Item` | Stock | Master Entity | `item_group`, `stock_uom` | `UOM Conversion Detail`, `Item Reorder` |
| 20 | `Customer` | Selling | Master Entity | `customer_group`, `territory` | `Customer Credit Limit` |
| 21 | `Supplier` | Buying | Master Entity | `supplier_group`, `country` | — |
| 22 | `Price List` | Stock | Rate Master | `currency` | — |

---

## 3. Hierarchical Tree Engine (Batch 5D)

Many ERP masters are structured hierarchically (territories, item groups, cost centers, warehouses). The tree engine (`server/engine/tree.js`) guarantees structural validity and prevents database corruption:

1. **Self-Parenting Prevention**: Rejects any update attempting to assign a document's parent to itself (`422 Unprocessable Entity`).
2. **Circular Loop Detection**: Recursively traverses the ancestor chain (`while (currentParentId)`) and terminates with `422` if an ancestor matches the node being modified. It automatically normalizes Mongoose `ObjectId` instances to strings for reference checks.
3. **Child Deletion Guard**: Blocks deletion of any group node that has child records (`409 Conflict: Cannot delete node because it has child records`).
4. **Tree Node Aggregation (`getTreeNodes`)**: Returns a lightweight array of nodes formatted with `id`, `label`, `is_group`, `parent_id`, and `children_count` for rapid frontend rendering.

### Frontend Tree Integration

- `client/src/components/TreeView/`: A collapsible tree component with expand/collapse controls, inline search filtering, and an "Add Child" quick dialog that pre-fills the parent link.
- `client/src/engine/DynamicListView/`: DocTypes flagged with `metadata.tree = true` render a View Toggle Button (`List` vs `Tree`), allowing operators to alternate between tabular pagination and hierarchical navigation seamlessly.

---

## 4. Module Navigation & Global Search (Batch 5A & 5B)

### Complete Navigation Catalog

`server/engine/navigation.js` dynamically compiles all extracted metadata into a unified catalog:
- **38 Discovered Modules**: Grouped into logical categories (Core ERP, Supply Chain, Human Resources, Operations, Setup & Tools).
- **24 Dynamic Workspaces**: Mapped to standard routes (`/workspaces/:workspace`). Fallback synthesized workspaces are generated automatically for modules lacking custom Frappe workspace JSONs.
- **Controlled Master Links**: Workspaces display links to registered masters alongside legacy shortcuts. Clicking an unregistered DocType opens an informative modal detailing its classification and scheduled phase.

### Global Search Index (`Ctrl+K`)

`client/src/components/GlobalSearch/` provides immediate keyboard-driven search (`Ctrl+K` or `Cmd+K`) across the entire ERP platform:
- Indexes **875 DocTypes**, **24 Workspaces**, **208 Reports**, **35 Pages**, and **38 Modules**.
- Categorized chip filters (`All`, `DocType`, `Workspace`, `Report`, `Page`).
- Direct navigation on Enter or Click.

---

## 5. Reports & Custom Pages Engine (Batch 5E)

### Operational Report Registry & Runner

The reporting engine (`server/engine/reports.js` and `client/src/engine/ReportViewer/`) supports running operational tabular reports:
- **Operational Query Handlers**: Implements live aggregated query runners for registered masters:
  - `Item Summary`: Aggregates items by group, stock UOM, and active status.
  - `Customer Summary`: Aggregates customer directory by group and territory.
  - `Supplier Summary`: Aggregates supplier registry by supplier group.
  - `Quality Inspection Summary`: Aggregates parameters and feedback templates.
- **Dynamic Table & Filter Bar**: Renders query columns dynamically, supports quick search, date range filtering, and refresh.
- **Client-Side CSV Export**: Formats current tabular rows into standard RFC-4180 CSV with client download.
- **Transactional Report Prerequisites**: Transparently classifies the remaining 204+ Frappe reports (e.g., General Ledger, Stock Ledger, Trial Balance) as requiring Phase 6 accounting posting ledgers and domain services.

### Custom Pages & Coverage Dashboard

- `client/src/engine/DynamicCustomPage/`: Custom page handler that displays descriptive implementation roadmaps for extracted Frappe single-page apps (e.g. `pos`, `kanban`).
- `client/src/pages/CoverageDashboard/`: Dedicated administrative dashboard accessible at `/coverage`:
  - **KPI Metric Cards**: Total Modules (38), Workspaces (24), All DocTypes (875), Registered Masters (22), Extracted Reports (211), Custom Pages (36).
  - **Categorized Tabs**: Interactive filterable tables for Registered Masters, All DocTypes, Extracted Reports, and Custom Pages.

---

## 6. Verification and Test Evidence

### Backend Test Suite (`server/tests/`)
All **30 backend tests** pass with 0 failures:
- `server/tests/phase5.test.js`:
  - Navigation catalog generation across 38 modules and 24 workspaces.
  - Global search index contains > 500 catalog items.
  - Tree node aggregation and self-parenting / circular ancestor rejection (422).
  - Child deletion protection guard (409).
  - Operational report runner executes queries and returns dynamic columns and rows.
- `server/tests/documents.test.js`: 18 tests covering document engine, permissions, optimistic concurrency, and validation.
- `server/tests/auth.test.js`: 7 tests covering JWT lifecycle and company memberships.

### Browser End-to-End Suite (`client/tests/`)
All **9 Playwright end-to-end tests** pass across mobile, tablet, and desktop viewports:
- `client/tests/phase5.spec.js`:
  - Global Search modal (`Ctrl+K`), keyword filtering, and keyboard navigation.
  - Hierarchical Tree View with expand/collapse, search filter, and list/tree mode toggle.
  - Dynamic Workspace rendering with master cards, shortcuts, and pending status dialog.
  - Report Viewer execution, dynamic table rendering, and client-side CSV export.
  - Coverage Dashboard metrics and categorized tabs.
- `client/tests/documents.spec.js`: Complete vertical integration for Parameter Group, Parameter, Feedback Template, Child Tables, Conflict Dialog, and multi-company isolation.
- `client/tests/foundation.spec.js`: Authentication, session restoration, responsive navigation across 6 viewports without horizontal scroll overflow.

### Production Build
Client production build passes cleanly (`npm run build`) in ~6 seconds with zero errors or warnings.
