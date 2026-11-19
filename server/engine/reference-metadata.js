import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const metadataRoot = new URL('../../metadata/', import.meta.url)
const source = z.string().startsWith('reference/')
const record = z.looseObject({
  id: z.string().min(1), source, app: z.enum(['erpnext', 'frappe']),
  scope: z.enum(['shipped', 'sample']), name: z.string().min(1),
  kind: z.string(), definition: z.looseObject({}),
})
const catalog = z.array(record)
const schemas = {
  'source-index': z.array(z.object({ evidence: z.array(z.object({
    source, signals: z.array(z.object({ kind: z.string() })),
  })) })),
  'extraction-summary': z.looseObject({
    schemaVersion: z.literal(1),
    errors: z.array(z.unknown()).length(0),
    repositories: z.array(z.looseObject({ app: z.enum(['erpnext', 'frappe']), commit: z.string().regex(/^[a-f0-9]{40,64}$/) })).length(2),
    totals: z.looseObject({ modules: z.number().int(), doctypes: z.number().int(), workspaces: z.number().int(),
      pages: z.number().int(), reports: z.number().int(), dashboards: z.number().int() }),
  }),
  modules: z.array(z.looseObject({ id: z.string(), name: z.string(), source, app: z.enum(['erpnext', 'frappe']) })),
  doctypes: z.array(record.extend({
    kind: z.literal('DocType'),
    definition: z.looseObject({ fields: z.array(z.looseObject({ fieldtype: z.string() })).optional() }),
  })),
  workspaces: catalog,
  pages: z.looseObject({ definitions: catalog, portal: z.array(z.unknown()), hookRoutes: z.array(z.unknown()) }),
  reports: catalog,
  dashboards: z.looseObject({ definitions: catalog }),
  permissions: z.looseObject({ inline: z.array(z.looseObject({ record: z.string(), source })), fixtures: catalog }),
  workflows: z.looseObject({ definitions: catalog, schemas: z.array(z.string()) }),
  dependencies: z.looseObject({ moduleEdges: z.array(z.looseObject({ from: z.string(), to: z.string() })) }),
  relationships: z.array(z.looseObject({ source, from: z.string(), kind: z.string(), field: z.string() })),
  navigation: z.looseObject({ definitions: catalog, edges: z.array(z.looseObject({ source, from: z.string() })) }),
}

export async function loadReferenceMetadata(directory = metadataRoot) {
  const hash = createHash('sha256')
  const entries = await Promise.all(Object.entries(schemas).map(async ([name, schema]) => {
    const file = name + '.json'
    try {
      const bytes = await readFile(new URL(file, directory))
      return { name, bytes, value: schema.parse(JSON.parse(bytes.toString('utf8'))) }
    } catch {
      throw new Error('Invalid or missing reference metadata: ' + file)
    }
  }))
  const catalogs = Object.fromEntries(entries.map(({ name, bytes, value }) => {
    hash.update(name + '\0').update(createHash('sha256').update(bytes).digest())
    return [name, value]
  }))
  const summary = catalogs['extraction-summary']
  const shipped = items => items.filter(item => item.scope === 'shipped').length
  const counts = {
    modules: catalogs.modules.length, doctypes: shipped(catalogs.doctypes), workspaces: shipped(catalogs.workspaces),
    pages: shipped(catalogs.pages.definitions), reports: shipped(catalogs.reports),
    dashboards: shipped(catalogs.dashboards.definitions.filter(item => item.kind === 'Dashboard')),
  }
  for (const [name, count] of Object.entries(counts)) {
    if (count !== summary.totals[name]) throw new Error('Reference metadata count mismatch: ' + name)
  }
  const byId = new Map(catalogs.doctypes.map(item => [item.id, item]))
  if (byId.size !== catalogs.doctypes.length) throw new Error('Duplicate reference DocType source ID')
  return { schemaVersion: summary.schemaVersion, checksum: hash.digest('hex'),
    catalogs, getDocType: id => byId.get(id) }
}
