# CRYO ERP project overview

CRYO ERP targets functional coverage of the ERPNext and Frappe capabilities shipped by the pinned reference checkouts. The scope includes workspaces, navigation, forms, lists, settings, permissions, reports, dashboards and the operations users perform across departments. CRYO-specific branding, modules and business rules come after the base behavior is verified. The organization expects approximately 500 registered users. Peak concurrency and acceptable response times will be measured in Phase 8.

| Layer | Approved technology |
| --- | --- |
| Client | React, Vite, Material UI, MUI Material Icons, Google Fonts, React Router, Axios, SCSS and SCSS Modules |
| Server | Node.js, Express, REST, JWT, role- and record-based authorization, modular services |
| Data | MongoDB replica set or compatible managed service, Mongoose, Decimal128, indexes, transactions and audit events |
| Deployment | Environment configuration and Docker where applicable |

Phase 1 produced the searchable catalog and design. [Project memory](../project.md) records delivery status. [Conversion plan](12-CONVERSION-PLAN.md) defines future gates. A one-day implementation MVP covers navigation and a secured, explicitly enabled subset of master data. Operational ERP parity requires transactional ports, permission parity and reconciliation against signed-off examples.
