# Pages and navigation

| Inventory layer | Discovered |
| --- | ---: |
| Workspace definitions | 24 |
| Workspace card breaks | 55 |
| Sidebar and Workspace Sidebar definitions, including legacy exports | 40 |
| Navigation edges from workspaces and navigation definitions | 1,213 |
| Desk Page definitions | 23 |
| Web Form definitions | 6 |
| Inferred portal file routes, grouped by app and path | 32 |
| Literal hook routes, including a repeated rule | 31 |
| Form tab and section fields | 309 tabs and 1,933 sections |

The Accounting workspace orders onboarding, cards, a Profit and Loss chart and number cards through JSON-encoded blocks. Its sidebar links to Accounting, the Accounts dashboard, Account and other records. Raw cards, blocks, label and role assignments are preserved. Build the target navigation from explicit registration and permission-filtered metadata. Resolve typed edges to canonical identifiers and keep external URLs separate. [Accounting workspace](../reference/erpnext/erpnext/accounts/workspace/accounting/accounting.json) · [Accounting sidebar](../reference/erpnext/erpnext/accounts/sidebar/accounts/accounts.json) · [Workspace catalog](../metadata/workspaces.json) · [Navigation graph](../metadata/navigation.json)

Frappe also ships legacy Workspace Sidebar exports. Its Desktop Icon controller documents that legacy links can refer to the old type while the current client uses sidebar payloads. Eight legacy targets fail the literal lookup: Accounts Setup, Banking, Budget, Organization, Share Management, Subcontracting, Subscription and Taxes. Treat them as migration review items and verify the current sidebar structure before assigning replacement routes. ERPNext declares the purchase-order detail route twice. The graph keeps both source locations. [Desktop Icon seeding](../reference/frappe/frappe/desk/doctype/desktop_icon/desktop_icon.py#L383) · [ERPNext route definitions](../reference/erpnext/erpnext/hooks.py#L162)

Use a distinct CRYO shell with proposed React Router paths such as `/w/:workspace`, `/d/:type`, `/d/:type/:id`, `/p/:page` and `/reports/:id`. Registry IDs own identity and URL aliases receive collision checks. Build list columns from `in_list_view`, filters from `in_standard_filter` and order form controls by `field_order`. Client scripts, route rewrites, data-driven pages and per-user config need explicit conversion. [Page catalog](../metadata/pages.json) · [Form catalog](../metadata/doctypes.json)
