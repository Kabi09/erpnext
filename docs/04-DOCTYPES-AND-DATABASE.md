# DocTypes and database

Phase 3 stores three company-scoped quality masters in compiled MongoDB collections. Quality Feedback Template embeds up to 100 parameter rows. An atomic counter supports reviewed naming series. The registry derives a stable model name from each original source ID. [Storage, adapters and migrations](16-DOCUMENT-ENGINE.md#registration-and-storage)

The catalog contains 875 shipped DocTypes and 14,719 declared fields, including layout fields. There are 375 child-table schemas, 474 Table or Table MultiSelect fields, 66 singleton DocTypes and 86 submittable DocTypes. It retains DocType flags, options, labels, required/default values, dependencies, permissions, child order and naming metadata. [DocType catalog](../metadata/doctypes.json) · [Relationships](../metadata/relationships.json)

| Source metadata | Target treatment |
| --- | --- |
| Data, Text, Select, Phone, Autocomplete | Validated strings. Preserve allowed choices, length, empty-string and null conventions |
| Int, Check, Rating, Duration | Bounded integer, boolean, bounded rating and normalized duration respectively |
| Float, Percent, Currency | Policy-scaled Decimal128, decimal strings over REST and reviewed decimal arithmetic. Round at documented business boundaries in the relevant currency or unit |
| Date, Datetime, Time | Date-only ISO string, UTC instant with site timezone context and time-only value respectively |
| Link, Dynamic Link | Reference by immutable internal ID and registered type. Dynamic targets need an allowlist and dependent-field validation |
| Table, Table MultiSelect | Ordered child rows with stable IDs, parent ownership and parent-scoped permission enforcement |
| Section, Tab, Column, Heading and Fold | Layout metadata with no stored field value |
| Attach, Image, Password, HTML, Code, Vue Component | Explicit adapters and safeguards. Unsupported controls render a clear read-only or unavailable state |
| Fetch expressions, defaults, naming series | Implement reviewed declarative rules or typed services. Keep expressions as inert source data |

Use a registry-owned discriminator or collection mapping for approved document types and effective field schemas. Give high-write, independently queried ledgers and balances their own collections. Embed bounded child aggregates. Use separately indexed child collections for large aggregates and independent history, keeping parent ID, order and ownership. Store immutable internal IDs, unique human-readable names scoped to type and organization, version, timestamps, actor IDs, status and company or site as applicable. Singleton settings use a unique scope and type key. Model edits use migrations and preserve old records.

| Collection pattern | Essential index or integrity rule |
| --- | --- |
| Documents | Unique scope/type/name, scoped list indexes by type, company, status and stable sort key |
| Journal and stock ledger | Unique source operation and line identity, query indexes over company/account/posting order and company/item/warehouse/posting order |
| Stock balance and request-row counters | Unique company, item, warehouse and inventory dimension or request-line key. Predicate updates enforce bounds |
| Sequences and idempotency | Unique scope and series. Unique actor/scope, operation and idempotency key, with canonical request hash |
| Audit and outbox | Index audit by subject and time. Index outbox by status and next attempt. Protect events from edit and duplicate delivery |

A critical command commits the document transition, counter changes, ledger rows, audit entry and outbox record in one MongoDB session. Use deterministic write order, optimistic versions and bounded transaction retry. Test uncertain commit outcomes using idempotency lookup. Use reconciliation of derived balances against the immutable ledger. Review backdating, cancellation and FIFO replay with separate fixture suites before enabling writes. [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/)
