# Known limitations and licensing

## Phase 3 boundaries

The registry classifies 875 types and exposes three reviewed company-scoped masters. Tree operations, posting, file handling, secret storage, generalized client conditions, runtime customizations and upstream sharing rules need separate implementations. See the [field coverage and lifecycle table](16-DOCUMENT-ENGINE.md#field-coverage-and-lifecycle) for adapter boundaries.

## Phase 2 boundaries at delivery

The foundation authorizes only the company-access resource. Effective document permissions, workflow rules, row and field policies, admin management screens, metadata-driven routes and dynamic models belong to later work. Rate limiting is local to the server process. A multi-instance deployment would need a shared limit strategy. Web Locks coordinate refresh across compatible browser tabs. Without Web Locks, simultaneous refreshes from separate tabs can cause a replay-triggered sign-out. Local test topology has one MongoDB member. Multi-member failover, deployed TLS behavior and 500-user workload capacity remain unverified.

| Finding | Status and consequence |
| --- | --- |
| Installed-site data | Custom fields, active workflows, runtime permissions, installed app fixtures and generated routes require a site export or stakeholder evidence |
| Heuristic code index | Line signals can miss aliases, dynamically assembled values and multi-line expressions and can match comments or examples. Trace controller and caller before implementation |
| Named external apps | Frappe HR (HRMS), Payments, Webshop, Insights and Lending appear in source and are absent from the supplied app trees. Some evidence is from tests or historical patches. Confirm requirements separately |
| Unresolved DocType link | Payment Gateway Account links to Payment Gateway, absent from the discovered DocTypes |
| Navigation drift | Eight unresolved legacy Workspace Sidebar targets and one repeated ERPNext purchase-order detail route |
| Field support | All observed field types are recognized by the upstream DocField schema. Nineteen observed types require target adapters beyond the initial MVP |
| Business logic | Selected controller and workflow behaviors were manually read. Full end-to-end parity, fiscal correctness, posting, job execution and integrations require implementation and fixtures |
| Deployment | Load and concurrency capacity, hosting, availability and operational recovery have yet to be tested |

The source index enumerates leftover JSON rather than assuming every JSON shape is a definition. See [extraction summary](../metadata/extraction-summary.json), [dependency findings](../metadata/dependencies.json) and [source inventory](../metadata/source-index.json). Phase 1 used Node and Git and did not run upstream code.

ERPNext declares GPL v3. Preserve existing copyright and notices where material is reused and provide the license when conveying covered source. For a covered adaptation, evaluate the applicable license requirements including modification notices and Corresponding Source for object-code conveyance under GPL v3. Treat copied definitions and generated derivatives as material requiring provenance and release review. A language port alone does not settle the licensing of a derivative. [ERPNext license](../reference/erpnext/license.txt) · [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html)

Frappe uses MIT and requires its copyright and permission notice in copies or substantial portions. Phase 1 metadata includes byte-identical copies of both upstream license files. Review per-file and bundled dependency notices before copying or distributing additional source and assets. Use CRYO styling and product identity, and apply the upstream trademark policy to ERPNext names and logos. [Copied upstream licenses](../metadata/licenses/) · [Frappe license](../reference/frappe/LICENSE) · [ERPNext trademark policy](../reference/erpnext/TRADEMARK_POLICY.md)
