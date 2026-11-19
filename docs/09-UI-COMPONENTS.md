# UI components and metadata rendering

## Phase 2 interface

The MUI client uses self-hosted Inter and shared SCSS tokens. The login screen uses the real authentication API and supports password visibility and server errors. The protected shell provides a desktop sidebar, a mobile drawer, breadcrumbs, a profile menu and sign-out. Its route definitions can be replaced by registered screen data later. The dashboard loads company access from the protected backend and displays loading, empty, error and verified states. Not Found and Unauthorized have dedicated routes. Lazy route chunks cover the login, shell and dashboard.

Use a visually distinct CRYO workspace shell with MUI components, SCSS Modules and MUI Material Icons. Use shared CSS variables or SCSS tokens for spacing, color and breakpoints. Inter is the proposed Google Font pending foundation work. Group each React component in a folder with its named JSX and SCSS Module when it needs custom styling. Use the existing CSS class layout convention only where its regions are useful. [Project rules](14-PROJECT-RULES.md)

| Component | Proposed responsibility and inputs |
| --- | --- |
| DynamicPage and DynamicWorkspace | Resolve registered route or workspace ID, obtain authorized metadata and mount shared layouts |
| DynamicForm and DynamicTabs | Form value, metadata, errors and version. Render field order, sections, visible tabs and validation summaries |
| DynamicField | Field descriptor, permitted value and edit callback. Dispatch to MUI controls or approved adapters |
| DynamicTable | Schema, rows, filter/sort parameters and cursor. Use permission-filtered columns, keyboard-safe opening and local overflow |
| ChildTable and LinkedDocumentSelector | Stable ordered row IDs, parent-aware edits and debounced paginated link lookup. Announce validation errors |
| DocumentActions, DocumentTimeline and WorkflowStatus | Server-returned capabilities, expected version, status and audit events. Handle conflict and pending states |
| PermissionGuard | Match route or action capability and surface unavailable states |
| ReportViewer, DashboardWidgets and GlobalSearch | Typed report filters/results, authorized widget aggregates and permission-filtered grouped search |

Map boolean values to MUI Checkbox, dates to accessible input controls, enum choices to Select or Autocomplete and linked records to the shared selector. Keep draft state local to forms and session state in context. Centralize Axios auth, pagination, error handling and cancellation. Use React Router for the route shell, URL query state for shareable filters, accessible labeled icons and focus management for dialogs and errors.

Test small mobile through large desktop, portrait and landscape, very long labels, empty lists, delayed data, API errors, narrow tables and zoom. Keep scrolling within the table where required. Use wrapping and keyboard-accessible tooltips for labels and keep error fields reachable after tab navigation. Unsupported or restricted actions should visibly explain availability without presenting broken controls.
