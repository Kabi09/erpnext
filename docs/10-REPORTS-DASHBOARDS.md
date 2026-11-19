# Reports and dashboards

| Catalog item | Count |
| --- | ---: |
| Script reports | 190 |
| Query reports | 8 |
| Report Builder definitions | 9 |
| Dashboard documents | 9 |
| Dashboard charts and chart sources | 50 charts and 3 sources |
| Number cards | 57 |
| DocType dashboard controllers | 73 |

Reports retain type, reference DocType, columns, roles, raw configuration and companion files. Client filters may be declared in report JS and script-generated columns and summaries may be returned at runtime. Dashboards preserve widget references and decode JSON filter fields where available. Workspace widgets and per-document connections are cataloged independently. [Reports](../metadata/reports.json) · [Dashboards](../metadata/dashboards.json) · [Workspaces](../metadata/workspaces.json)

The source entry points are `query_report.run` and its report-result generator, and per-report implementations such as General Ledger and Stock Balance. Review filters, defaults, joins, currency and unit conversions, opening balances, time boundaries, totals and data scopes before porting. Map report-builder listings to safe typed filters and projections. Port query and script reports to named aggregation or service functions with test fixtures. Keep raw SQL and upstream JavaScript inert. [Report execution](../reference/frappe/frappe/desk/query_report.py#L124) · [General Ledger](../reference/erpnext/erpnext/accounts/report/general_ledger/general_ledger.py#L34) · [Stock Balance](../reference/erpnext/erpnext/stock/report/stock_balance/stock_balance.py#L49)

For critical reports, compare opening, movements and closing amounts to ledger fixtures and reconcile by company, fiscal period, currency, warehouse and dimensions. Persist long-run metadata, gate export and file retrieval, and key caches by policy, filter and data version. KPI widgets share report semantics and show freshness. Start with catalog views, then enable a report by reviewed implementation and permission tests.
