# Module inventory

Both `modules.txt` files declare 38 modules in total. The table shows shipped definitions with the module's explicit name or directory fallback. The last column shows up to three dependencies by observed field link, child table or report reference count. These edges can be cyclic and describe metadata relationships. Each module below is cataloged in Phase 1 and awaits application implementation. [ERPNext modules](../reference/erpnext/erpnext/modules.txt) · [Frappe modules](../reference/frappe/frappe/modules.txt) · [Module metadata](../metadata/modules.json)

| App | Module | Source directory | DocTypes | Reports | Largest observed outbound dependencies |
| --- | --- | --- | ---: | ---: | --- |
| erpnext | Accounts | [accounts](../reference/erpnext/erpnext/accounts/) | 191 | 57 | erpnext:Setup (125), frappe:Core (70), erpnext:Stock (54) |
| erpnext | CRM | [crm](../reference/erpnext/erpnext/crm/) | 28 | 9 | frappe:Core (13), erpnext:Setup (12), frappe:Website (6) |
| erpnext | Buying | [buying](../reference/erpnext/erpnext/buying/) | 19 | 10 | erpnext:Setup (33), erpnext:Accounts (29), erpnext:Stock (26) |
| erpnext | Projects | [projects](../reference/erpnext/erpnext/projects/) | 15 | 5 | erpnext:Setup (10), erpnext:Selling (3), erpnext:Accounts (3) |
| erpnext | Selling | [selling](../reference/erpnext/erpnext/selling/) | 20 | 23 | erpnext:Setup (44), erpnext:Accounts (30), erpnext:Stock (22) |
| erpnext | Setup | [setup](../reference/erpnext/erpnext/setup/) | 40 | 0 | erpnext:Accounts (50), erpnext:Stock (13), frappe:Core (12) |
| erpnext | Manufacturing | [manufacturing](../reference/erpnext/erpnext/manufacturing/) | 51 | 21 | erpnext:Stock (81), erpnext:Setup (42), erpnext:Selling (10) |
| erpnext | Stock | [stock](../reference/erpnext/erpnext/stock/) | 78 | 54 | erpnext:Setup (92), erpnext:Accounts (58), frappe:Contacts (22) |
| erpnext | Support | [support](../reference/erpnext/erpnext/support/) | 11 | 4 | erpnext:Setup (5), frappe:Contacts (3), frappe:Core (3) |
| erpnext | Utilities | [utilities](../reference/erpnext/erpnext/utilities/) | 4 | 1 | frappe:Core (2) |
| erpnext | Assets | [assets](../reference/erpnext/erpnext/assets/) | 26 | 3 | erpnext:Accounts (28), erpnext:Setup (18), erpnext:Stock (12) |
| erpnext | Portal | [portal](../reference/erpnext/erpnext/portal/) | 2 | 0 | erpnext:Stock (1) |
| erpnext | Maintenance | [maintenance](../reference/erpnext/erpnext/maintenance/) | 5 | 1 | erpnext:Setup (9), erpnext:Stock (5), frappe:Contacts (4) |
| erpnext | Regional | [regional](../reference/erpnext/erpnext/regional/) | 5 | 4 | erpnext:Accounts (8), erpnext:Setup (5), erpnext:Stock (2) |
| erpnext | ERPNext Integrations | [erpnext_integrations](../reference/erpnext/erpnext/erpnext_integrations/) | 1 | 0 | — |
| erpnext | Quality Management | [quality_management](../reference/erpnext/erpnext/quality_management/) | 16 | 1 | frappe:Core (2), erpnext:Setup (2) |
| erpnext | Communication | [communication](../reference/erpnext/erpnext/communication/) | 2 | 0 | erpnext:Setup (2), erpnext:Buying (1) |
| erpnext | Telephony | [telephony](../reference/erpnext/erpnext/telephony/) | 5 | 0 | frappe:Core (3), erpnext:Setup (2), erpnext:Selling (1) |
| erpnext | Bulk Transaction | [bulk_transaction](../reference/erpnext/erpnext/bulk_transaction/) | 2 | 0 | frappe:Core (2) |
| erpnext | Subcontracting | [subcontracting](../reference/erpnext/erpnext/subcontracting/) | 13 | 3 | erpnext:Stock (44), erpnext:Setup (15), erpnext:Accounts (9) |
| erpnext | EDI | [edi](../reference/erpnext/erpnext/edi/) | 2 | 0 | frappe:Core (1) |
| frappe | Core | [core](../reference/frappe/frappe/core/) | 115 | 7 | frappe:Email (7), frappe:Printing (3), frappe:Geo (2) |
| frappe | Website | [website](../reference/frappe/frappe/website/) | 39 | 1 | frappe:Core (11), frappe:Printing (1) |
| frappe | Workflow | [workflow](../reference/frappe/frappe/workflow/) | 10 | 0 | frappe:Core (8), frappe:Email (1) |
| frappe | Email | [email](../reference/frappe/frappe/email/) | 17 | 0 | frappe:Core (14), frappe:Integrations (2), frappe:Printing (1) |
| frappe | Custom | [custom](../reference/frappe/frappe/custom/) | 5 | 1 | frappe:Core (10), frappe:Printing (1), frappe:Email (1) |
| frappe | Geo | [geo](../reference/frappe/frappe/geo/) | 2 | 0 | — |
| frappe | Desk | [desk](../reference/frappe/frappe/desk/) | 66 | 1 | frappe:Core (64), frappe:Geo (3), frappe:Integrations (1) |
| frappe | Integrations | [integrations](../reference/frappe/frappe/integrations/) | 24 | 0 | frappe:Core (12) |
| frappe | Printing | [printing](../reference/frappe/frappe/printing/) | 8 | 0 | frappe:Core (11) |
| frappe | Contacts | [contacts](../reference/frappe/frappe/contacts/) | 7 | 1 | frappe:Core (3), frappe:Geo (2), frappe:Integrations (1) |
| frappe | Automation | [automation](../reference/frappe/frappe/automation/) | 16 | 0 | frappe:Core (14), frappe:Email (1), frappe:Printing (1) |
| frappe | System | [system](../reference/frappe/frappe/system/) | 0 | 0 | — |
| frappe | Build | [build](../reference/frappe/frappe/build/) | 0 | 0 | — |
| frappe | Data | [data](../reference/frappe/frappe/data/) | 0 | 0 | — |
| frappe | Users | [users](../reference/frappe/frappe/users/) | 0 | 0 | — |
| frappe | Studio | [studio](../reference/frappe/frappe/studio/) | 10 | 0 | frappe:Core (2) |
| frappe | Flow | [flow](../reference/frappe/frappe/flow/) | 20 | 0 | frappe:Core (9) |

The machine-readable module inventory records each immediate subarea discovered under its module folder, all counts by definition kind and the full outgoing dependency edges. It includes navigation-oriented modules with zero associated DocType definitions, such as System, Build, Data and Users. Their sidebar files link to capabilities whose schemas are defined in other modules. `source-index.json` covers source trees outside the module registry as well, including ERPNext Banking and Islands and the Frappe Desk UI, Studio, Flow and realtime tooling. [Source index](../metadata/source-index.json)

The dependency graph contains 204 grouped cross-module edges. For example, Manufacturing references Stock through item and warehouse links. Stock depends on Accounts for accounting context and Setup for company and related masters. Buying and Selling reuse both master data and Accounts definitions. Settings and administrator functionality span Setup, System, Core, Desk, Users and Custom. Frappe exposes framework functionality used by both references. [Dependency data](../metadata/dependencies.json)

HRMS and payroll, Payments, Webshop, Insights and Lending need separate requirements and source review when in scope. Existing ERPNext schemas such as Employee, Payment Request and Payment Gateway Account are evidence of overlapping or integration data and should be modeled only to the enabled extent. Some Insights, Webshop and Lending mentions come from fixtures, tests or patches. [Limitations and licensing](13-KNOWN-LIMITATIONS.md)
