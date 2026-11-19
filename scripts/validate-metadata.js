const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { root } = require('./scan-source')
const { outputDir, buildMetadata, apps } = require('./extract-metadata')

const arrayFiles = ['modules', 'doctypes', 'workspaces', 'reports', 'relationships', 'configuration', 'source-index']
const objectFiles = ['pages', 'dashboards', 'permissions', 'workflows', 'dependencies', 'navigation', 'extraction-summary']

function validateMetadata(directory, checkSources = false) {
  const read = name => JSON.parse(fs.readFileSync(path.join(directory, name + '.json'), 'utf8'))
  const data = Object.fromEntries([...arrayFiles, ...objectFiles].map(name => [name, read(name)]))
  for (const key of arrayFiles) assert(Array.isArray(data[key]), key + ' must be an array')
  for (const key of objectFiles) assert(data[key] && !Array.isArray(data[key]) && typeof data[key] === 'object', key + ' must be an object')
  const summary = data['extraction-summary']
  assert.equal(summary.schemaVersion, 1)
  assert.deepEqual(summary.repositories.map(row => row.app), apps)
  assert.deepEqual(summary.errors, [], 'Extraction errors must be resolved')
  const shipped = rows => rows.filter(row => row.scope === 'shipped')
  const sum = (rows, value) => rows.reduce((total, row) => total + value(row), 0)
  const allFiles = new Set()
  for (const index of data['source-index']) {
    const repository = summary.repositories.find(repo => repo.app === index.app)
    assert(repository && /^[\da-f]{40,64}$/.test(repository.commit), 'Invalid reference provenance')
    assert.equal(index.files.length, repository.files, 'Source inventory count')
    assert.equal(index.evidence.length, repository.filesWithSignals, 'Source evidence count')
    assert.equal(index.files.length, new Set(index.files).size, 'Duplicate source path')
    for (const source of index.files) {
      assert(source.startsWith('reference/' + index.app + '/') && !source.split('/').includes('..'), source)
      allFiles.add(source)
    }
    for (const file of index.evidence) {
      assert(allFiles.has(file.source))
      for (const signal of file.signals) assert(Number.isInteger(signal.line) && signal.line > 0 && signal.kind, file.source)
    }
    for (const item of index.jsonOther) assert(allFiles.has(item.source), item.source)
  }
  assert.deepEqual(data['source-index'].map(row => row.app), apps)
  const records = [...data.doctypes, ...data.workspaces, ...data.pages.definitions, ...data.reports,
    ...data.dashboards.definitions, ...data.permissions.fixtures, ...data.workflows.definitions,
    ...data.navigation.definitions, ...data.configuration]
  const byId = new Map(records.map(record => [record.id, record]))
  assert.equal(byId.size, records.length, 'Duplicate source definition ID')
  for (const item of [...records, ...data.modules]) assert(allFiles.has(item.source), item.source)
  const expectedCategories = { DocType: data.doctypes, Workspace: data.workspaces, Report: data.reports }
  for (const [kind, rows] of Object.entries(expectedCategories)) {
    for (const row of rows) assert.equal(row.kind, kind, row.id)
  }
  for (const row of records) {
    assert(['shipped', 'sample'].includes(row.scope), row.id)
    assert.equal(typeof row.name, 'string', row.id)
    assert(row.definition && typeof row.definition === 'object', row.id)
    for (const source of row.companions) assert(allFiles.has(source), source)
  }
  const doctypes = shipped(data.doctypes)
  const fieldTypes = new Map()
  const fieldsByDoc = new Map()
  for (const row of doctypes) {
    const fields = row.definition.fields || []
    assert(Array.isArray(fields), row.id)
    assert.deepEqual(row.layout.map(field => field.fieldname),
      row.definition.field_order || fields.map(field => field.fieldname), row.id)
    for (const field of fields) {
      assert(typeof field.fieldname === 'string' && field.fieldname && field.fieldtype, row.id)
      fieldTypes.set(field.fieldtype, (fieldTypes.get(field.fieldtype) || 0) + 1)
    }
    fieldsByDoc.set(row.id, new Map(fields.map(field => [field.fieldname, field])))
  }
  for (const edge of data.relationships) {
    const field = fieldsByDoc.get(edge.from)?.get(edge.field)
    assert(field && edge.source === byId.get(edge.from).source, 'Invalid relationship ' + edge.from)
    assert.equal(edge.target, edge.kind === 'fetch-from' ? field.fetch_from : field.options || null, edge.from)
  }
  for (const row of data.permissions.inline) {
    const record = byId.get(row.record)
    assert(record && row.source === record.source, row.record)
    assert.deepEqual(record.definition[row.key]?.[row.index], row.rule, row.record)
  }
  for (const edge of data.navigation.edges) {
    assert.equal(byId.get(edge.from)?.source, edge.source, edge.from)
    assert(edge.matches.every(id => byId.has(id)), edge.from)
  }
  const workspaces = shipped(data.workspaces)
  const dashboards = shipped(data.dashboards.definitions)
  const computed = {
    modules: data.modules.length, doctypes: doctypes.length, fields: sum(doctypes, row => (row.definition.fields || []).length),
    childTables: doctypes.filter(row => row.flags.child).length, workspaces: workspaces.length,
    pages: shipped(data.pages.definitions).length, reports: shipped(data.reports).length,
    dashboards: dashboards.filter(row => row.kind === 'Dashboard').length,
    permissionDefinitions: data.permissions.inline.length + shipped(data.permissions.fixtures).length,
    unresolvedDependencies: data.dependencies.unresolvedApps.length,
    unresolvedRelationships: data.dependencies.unresolvedRelationships.length,
    inconsistentChildTargets: data.dependencies.inconsistentChildTargets.length,
    unresolvedNavigation: data.navigation.edges.filter(row => row.status === 'unresolved').length,
    relationships: data.relationships.length, sampledDefinitions: records.length - shipped(records).length,
    extractionErrors: summary.errors.length,
  }
  for (const [name, value] of Object.entries(computed)) assert.equal(summary.totals[name], value, 'Summary mismatch for ' + name)
  assert.deepEqual(summary.fieldTypes, Object.fromEntries(fieldTypes), 'Field type counts differ')
  if (checkSources) {
    const generated = buildMetadata()
    for (const [name, value] of Object.entries(generated)) {
      assert.equal(JSON.stringify(data[name]), JSON.stringify(value), name + '.json is stale or differs from the source build')
    }
    for (const [reference, filename] of [['erpnext/license.txt', 'ERPNext-GPL-3.0.txt'], ['frappe/LICENSE', 'Frappe-MIT.txt']]) {
      assert(fs.readFileSync(path.join(root, 'reference', reference))
        .equals(fs.readFileSync(path.join(directory, 'licenses', filename))), filename + ' differs from upstream')
    }
  }
  return { files: arrayFiles.length + objectFiles.length, checkSources,
    totals: computed, duplicateDefinitions: summary.duplicateDefinitions.length,
    duplicateRoutes: summary.duplicateRoutes.length, unsupportedMvpFieldTypes: summary.fieldTypesOutsideProposedMvp.length }
}

module.exports = { validateMetadata }
if (require.main === module) {
  try {
    const result = validateMetadata(outputDir, process.argv.includes('--check-sources'))
    console.log(JSON.stringify({ status: 'passed', ...result }, null, 2))
  } catch (error) {
    console.error('Metadata validation failed: ' + error.message)
    process.exitCode = 1
  }
}
