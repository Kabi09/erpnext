# Document engine and Phase 4 client contract

The registry classifies the 875 shipped DocTypes from the pinned catalogs. Three company-scoped masters have verified CRUD. Quality Inspection Parameter Group uses its required unique group name. Quality Inspection Parameter links to an accessible group and accepts a plain-text description. Quality Feedback Template embeds ordered parameter rows and enforces the controller's unique parameter rule. Each master uses field-based naming. Company scope is a CRYO policy choice. Customer Group and Item Group require nested-set tree behavior.

## Registration and storage

The generated manifest records source ID, module, source path, upstream flags, registration stages, unsupported types, unresolved edges and external-app signals from companion files. A generic candidate requires review of upstream controllers, hooks and dependencies. The manifest includes child-only and layout information without granting endpoints. Source heuristics can miss dynamically registered behavior. Regenerate from the existing catalogs with `node scripts/classify-doctypes.mjs`. [Manifest](../metadata/registration-manifest.json) · [Policy overlay](../server/engine/policies.js)

Approved fields compile into strict Mongoose subdocuments under `fields`. A source-ID digest gives each master a stable collection and model name. Unique names and reviewed field indexes include company. The compiler caches models per connection and refuses a second definition version on that connection. A separate sequence collection supports atomic per-type, scope and prefix counters. Naming supports prompt, field value and an explicitly configured prefix and digit width. Date tokens, controller methods, expression-based naming and arbitrary upstream series need reviewed ports.

The contract revision, reference checksum and policy overlay determine the metadata version. Before changing an active policy or compiler representation, compare schemas and unique indexes with deployed data, write a migration and backfill, validate relationships, and deploy compatible clients. Refresh metadata caches when the version changes. Startup creates indexes. Renames, index removal, data conversion and migration of existing rows require an explicit release operation.

## Active routes

All routes below require a current access JWT and an `X-Company-Id` header identifying an active membership. Use URL-encoded original DocType names. New administrator bootstraps get the reviewed grants. For an existing Phase 2 installation, run `node --env-file-if-exists=.env config/seed-document-grants.js` from `server/` to grant the company-administrator role access to these three masters. The seed is additive and records an audit event.

| Method and path under /api/v1 | Response and requirements |
| --- | --- |
| GET /metadata/modules | Module names containing readable registered types |
| GET /metadata/doctypes | Readable types with module and registry version |
| GET /metadata/doctypes/:doctype | Ordered layout, permitted field descriptors, list fields, child metadata, available and unsupported actions |
| GET /documents/:doctype | Company- and permission-scoped document list |
| POST /documents/:doctype | Body with `fields`. Returns 201, document and ETag |
| GET /documents/:doctype/options | Compact paginated ID and name pairs for a linked selector |
| GET /documents/:doctype/:id | Document, current version and ETag |
| GET /documents/:doctype/:id/relations | Accessible outgoing links with field, type, ID and target name |
| PATCH /documents/:doctype/:id | Partial `fields` and quoted numeric `If-Match`. Returns the updated document |
| DELETE /documents/:doctype/:id | Quoted numeric `If-Match`. Returns 204. A referenced record returns 409 |

Metadata field descriptors contain `name`, `label`, `type`, `required`, `readOnly`, `hidden`, `immutableAfterCreate`, and `list`. A literal default, select options, link target or child descriptor is included where applicable. Form order comes from `layout`. The feedback template contains a Section Break and the `parameters` descriptor contains the child type, permitted fields and row limit. For a bare Check dependency, the server translates visibility to a declarative `visibleWhen` value such as `{"field":"enabled","equals":true}`. The controlling field must be approved and readable to all readers of the master. Other conditional approved fields fail registration. The manifest records the affected fields and unsupported condition kinds. HTML, scripts and raw upstream permissions stay outside the client contract.

For Quality Inspection Parameter Group, an administrator receives the following field, layout and action properties inside the metadata response's `data` object. The group name is set at creation and stays immutable. The parameter master’s description is an editable field for testing version conflicts between editors.

```json
{
  "name": "Quality Inspection Parameter Group",
  "module": "Stock",
  "scope": "company",
  "fields": [
    {
      "name": "group_name",
      "label": "Parameter Group Name",
      "type": "Data",
      "required": true,
      "readOnly": false,
      "immutableAfterCreate": true,
      "hidden": false,
      "list": true
    }
  ],
  "layout": [{"name": "group_name"}],
  "listFields": ["group_name"],
  "actions": ["read", "create", "update", "delete"]
}
```

An example creation payload for Quality Feedback Template follows.

```json
{"fields":{"template":"Delivery review","parameters":[{"parameter":"Accuracy"},{"parameter":"Timeliness"}]}}
```

The group options endpoint returns ID and display-name pairs. Example IDs and request IDs below are illustrative.

```json
{"data":[{"id":"65b000000000000000000001","name":"Dimensions"}],"meta":{"requestId":"example-request","nextCursor":null}}
```

Document responses include `id`, human-readable `name`, `doctype`, company, owner, creator, last modifier, timestamps, `lifecycle`, numeric `version` and permitted `fields`. A returned child row has an additional `rowId`. To edit rows, send the complete ordered array with existing row IDs. Omit the ID for a new row and omit a row to remove it. Foreign or repeated IDs fail validation. The template limit is 100 rows within the API's 16 KB body limit. Large or transaction-sensitive tables need an independently indexed, parent-authorized service.

For Quality Inspection Parameter, a successful record read returns a response of this shape and the header `ETag: "2"`.

```json
{
  "data": {
    "id": "65b000000000000000000002",
    "name": "Diameter",
    "doctype": "Quality Inspection Parameter",
    "company": "65b000000000000000000010",
    "owner": "65b000000000000000000011",
    "createdBy": "65b000000000000000000011",
    "modifiedBy": "65b000000000000000000011",
    "createdAt": "2026-11-19T08:00:00.000Z",
    "updatedAt": "2026-11-19T09:00:00.000Z",
    "version": 2,
    "lifecycle": "Draft",
    "fields": {
      "parameter": "Diameter",
      "description": "Measure the outer diameter.",
      "parameter_group": "65b000000000000000000001"
    }
  },
  "meta": {"requestId": "example-request"}
}
```

List and options accept `limit` (1–100, default 25), `cursor`, `sort` (name or createdAt, with optional minus prefix), literal case-insensitive prefix `search`, and a comma-separated `fields` list of permitted business fields. Use `filter` and `value` for exact equality on an approved readable Data, Date or Select list field. `from` and `to` filter creation timestamps by UTC date with inclusive start and exclusive end. Use the returned cursor with the same scope, sort and filters. ID breaks sort ties. The envelope includes `meta.nextCursor` or null.

A 422 response includes `error.details` with field paths and messages, such as `fields.parameters.0.parameter`. Duplicate names and inbound-reference restrictions return 409. Missing version preconditions return 428. Stale writes return 412 with the current version when available. Reload and reconcile the draft before retrying. Company and field grants control discovery, projection, selection, linked reads and writes. The parameter description uses a separate read/update resource. Document audit entries store actor, company, type, ID, time, changed top-level field names and request ID.

## Field coverage and lifecycle

| Field types | Treatment |
| --- | --- |
| Data, Small Text, Long Text, Text, Phone, Autocomplete | Bounded strings |
| Read Only, Text Editor | Server-controlled string and plain-text-only editor respectively |
| Int, Check, Select | Safe integer with bounds, strict boolean, enumerated option |
| Float, Currency, Percent | Fixed-point decimal strings, Decimal128 storage, explicit precision or default of nine fractional digits |
| Date, Datetime, Time | Validated calendar date string, UTC BSON date, time-of-day string |
| Link, Dynamic Link | Explicit registered target, ID and permission checks. Dynamic targets require a policy allowlist and agreement with the type selector |
| Table, Table MultiSelect | Reviewed bounded embedded row schemas. Multi-select registration requires a unique child key |
| JSON | Bounded nesting, recursively checked keys and structured data |
| Section Break, Tab Break, Column Break, Heading, Fold, HTML, Button, Image | Presentation only. Raw HTML and executable actions are excluded |
| Attach, Attach Image, Password | Blocked pending a scoped file service or dedicated secret storage policy |
| Barcode, Code, Color, Duration, Geolocation, HTML Editor, Icon, Markdown Editor, Rating, Signature, Vue Component | Unsupported pending a reviewed adapter |

The live batch exercises Data, Text Editor, Link, Table and Section Break. Other mapped types require compatibility testing for each registration. Global read scope and owner predicates are available in the engine. This batch exposes only company-scoped records. Upstream record sharing, field permlevel semantics and distributed load remain future work.

Draft is a server-owned lifecycle value. The domain service checks the stored state before update or delete. Changes, link validation and audit writes share a transaction. A target write serializes new references against deletion, and delete checks inbound IDs in the registered collections. Future submit, cancel and amend handlers must accept an authenticated actor, scoped document, expected version, idempotency key and transaction session, enforce domain invariants, and write audit and domain effects together. Business status belongs to the relevant specialized service.
