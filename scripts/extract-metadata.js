const fs = require('node:fs')
const path = require('node:path')
const { root, scanRepository } = require('./scan-source')
const { extractDoctypes, extractRelationships, supportedMvp } = require('./extract-doctypes')
const { extractWorkspaces } = require('./extract-workspaces')
const { extractPages } = require('./extract-pages')
const { extractReports, extractDashboards } = require('./extract-reports')
const { extractDependencies } = require('./extract-dependencies')

const outputDir = path.join(root, 'metadata')
const apps = ['erpnext', 'frappe']
const shipped = items => items.filter(item => item.scope === 'shipped')

function countBy(items, key) {
  const counts = {}
  for (const item of items) {
    const name = key(item) ?? '(unknown)'
    counts[name] = (counts[name] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, 'en')))
}

function collisions(items, key) {
  const groups = new Map()
  for (const item of items) {
    const id = key(item)
    const entries = groups.get(id) || []
    entries.push(item)
    groups.set(id, entries)
  }
  return [...groups].filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({ key, entries }))
}

function buildMetadata() {
  const repositories = apps.map(scanRepository)
  const all = repositories.flatMap(repo => repo.definitions)
  const take = group => all.filter(item => item.group === group)
  const errors = repositories.flatMap(repo => repo.errors)
  const doctypes = extractDoctypes(take('doctypes'))
  const relationships = extractRelationships(shipped(doctypes))
  const workspaces = extractWorkspaces(take('workspaces'), errors)
  const pages = extractPages(take('pages'), repositories)
  const reports = extractReports(take('reports'), repositories)
  const dashboards = extractDashboards(take('dashboards'), repositories, errors)
  const modules = repositories.flatMap(repo => repo.modules)
  const navigationDefinitions = take('navigation')
  const configuration = take('configuration')
  const names = new Map(shipped(doctypes).map(item => [item.name, item]))
  const moduleEdges = new Map()
  const observeModuleEdge = (from, to, kind) => {
    if (!from?.module || !to?.module) return
    const origin = from.app + ':' + from.module
    const target = to.app + ':' + to.module
    if (origin === target) return
    const key = [origin, target, kind].join('::')
    if (!moduleEdges.has(key)) moduleEdges.set(key, { from: origin, to: target, kind, count: 0 })
    moduleEdges.get(key).count++
  }
  const byId = new Map(doctypes.map(item => [item.id, item]))
  for (const edge of relationships) {
    if (['link', 'child-table', 'table-multiselect'].includes(edge.kind)) {
      observeModuleEdge(byId.get(edge.from), names.get(edge.target), edge.kind)
    }
  }
  for (const report of shipped(reports)) observeModuleEdge(report, names.get(report.referenceDocType), 'report-reference')

  const navigationRecords = shipped([...doctypes, ...workspaces, ...pages.definitions, ...reports,
    ...dashboards.definitions, ...navigationDefinitions])
  const navigation = extractNavigation(navigationDefinitions, workspaces, navigationRecords)
  const dependencies = extractDependencies(repositories, shipped(doctypes), relationships, [...moduleEdges.values()], navigation.edges)
  const permissionItems = shipped([...doctypes, ...pages.definitions, ...reports, ...workspaces,
    ...dashboards.definitions, ...navigationDefinitions, ...configuration])
  const inline = permissionItems.flatMap(item => ['permissions', 'roles'].flatMap(key =>
    (Array.isArray(item.definition[key]) ? item.definition[key] : []).map((rule, index) => ({
      record: item.id, name: item.name, kind: item.kind, app: item.app, source: item.source, key, index, rule,
    })),
  ))
  const permissions = {
    inline,
    referencedRoles: [...new Set(inline.map(row => typeof row.rule === 'string' ? row.rule : row.rule?.role).filter(Boolean))].sort(),
    fixtures: take('permissions'),
    schemas: doctypes.filter(item => /^(?:Role|Has Role|Role Profile|DocPerm|Custom DocPerm|User Permission|Permission Type|User|User Role|DocShare)$/.test(item.name))
      .map(item => item.id),
    hooks: repositories.flatMap(repo => repo.evidence.flatMap(file => file.signals
      .filter(signal => signal.kind === 'hook-target' && /permission/.test(signal.name))
      .map(signal => ({ source: file.source, ...signal })))),
  }
  const workflows = {
    definitions: take('workflows'),
    schemas: doctypes.filter(item => item.module === 'Workflow' || /^Workflow(?: |$)/.test(item.name)).map(item => item.id),
    lifecycle: { docstatus: { draft: 0, submitted: 1, cancelled: 2 },
      documentSource: 'reference/frappe/frappe/model/document.py',
      workflowSource: 'reference/frappe/frappe/model/workflow.py' },
    notes: 'Workflow schemas and source signals do not identify activated workflows in a deployed site.',
  }

  for (const module of modules) {
    const matching = shipped(all.filter(item => item.app === module.app && item.module === module.name))
    module.counts = countBy(matching, item => item.kind)
    module.dependencies = dependencies.moduleEdges.filter(edge => edge.from === module.id)
  }

  const counts = tally(shipped(doctypes), shipped(workspaces), shipped(pages.definitions), shipped(reports),
    shipped(dashboards.definitions), permissions.inline, shipped(permissions.fixtures), navigation)
  const fieldTypes = countBy(shipped(doctypes).flatMap(item => item.definition.fields || []), field => field.fieldtype)
  const knownFieldTypes = new Set(shipped(doctypes).find(item => item.app === 'frappe' && item.name === 'DocField')
    ?.definition.fields.find(field => field.fieldname === 'fieldtype')?.options?.split('\n') || [])
  const moduleIds = new Set(modules.map(item => item.id))
  const summary = {
    schemaVersion: 1,
    repositories: repositories.map(repo => ({
      app: repo.app, branch: repo.branch, commit: repo.commit, dirty: repo.dirty, files: repo.files.length,
      parsedJson: repo.jsonRead, recognizedDefinitions: repo.documents, filesWithSignals: repo.evidence.length,
      extensions: repo.extensions,
      license: repo.app === 'erpnext' ? 'GPL-3.0 (see upstream notices)' : 'MIT',
    })),
    totals: { ...counts, modules: modules.length, portalFileRoutes: pages.portal.length, hookRoutes: pages.hookRoutes.length,
      workflowFixtures: shipped(workflows.definitions).length, workflowSchemas: workflows.schemas.length,
      referencedRoles: permissions.referencedRoles.length,
      doctypeDashboardControllers: dashboards.doctypeControllers.length, relationships: relationships.length,
      unresolvedDependencies: dependencies.unresolvedApps.length,
      unresolvedRelationships: dependencies.unresolvedRelationships.length,
      inconsistentChildTargets: dependencies.inconsistentChildTargets.length,
      unresolvedNavigation: dependencies.unresolvedNavigation.length, extractionErrors: errors.length,
      sampledDefinitions: all.filter(item => item.scope === 'sample').length },
    perApp: Object.fromEntries(apps.map(app => {
      const select = items => shipped(items).filter(item => item.app === app)
      return [app, { modules: modules.filter(item => item.app === app).length,
        ...tally(select(doctypes), select(workspaces), select(pages.definitions), select(reports),
          select(dashboards.definitions), permissions.inline.filter(row => row.app === app),
          select(permissions.fixtures), { definitions: select(navigation.definitions),
            edges: navigation.edges.filter(edge => edge.app === app) }) }]
    })),
    fieldTypes,
    unknownUpstreamFieldTypes: Object.keys(fieldTypes).filter(type => !knownFieldTypes.has(type)),
    fieldTypesOutsideProposedMvp: Object.keys(fieldTypes).filter(type => !supportedMvp.has(type)),
    duplicateDefinitions: collisions(shipped(all), item => item.kind + ':' + String(item.name).normalize('NFKC').toLowerCase())
      .map(group => ({ key: group.key, records: group.entries.map(item => item.id) })),
    duplicateFields: shipped(doctypes).flatMap(item => collisions(item.definition.fields || [], field => field.fieldname)
      .map(group => ({ record: item.id, field: group.key, count: group.entries.length }))),
    unlistedModuleNames: countBy(shipped(all).filter(item => item.module && !moduleIds.has(item.app + ':' + item.module)),
      item => item.app + ':' + item.module),
    duplicateRoutes: collisions(pages.hookRoutes, route => route.app + ':' + route.name),
    errors,
    notes: [
      'Discovery counts cover shipped definitions; test/sample records keep provenance and are excluded.',
      'Pages counts shipped Page, Web Form and Web Page definitions. Filesystem and hook route candidates are separate.',
      'Dashboards counts Dashboard documents only. Chart, number card and controller totals are separate.',
      'Permission definitions counts individual inline permission/role rows plus permission fixtures; schema and hook records are separately indexed.',
      'Unresolved dependencies counts distinct absent named apps. Unresolved relationship and navigation edges use separate denominators.',
    ],
  }
  return {
    modules, doctypes, workspaces, pages, reports, dashboards, permissions, workflows, relationships, dependencies,
    navigation, configuration,
    'source-index': repositories.map(({ app, files, evidence, jsonOther }) => ({ app, files, evidence, jsonOther })),
    'extraction-summary': summary,
  }
}

function tally(doctypes, workspaces, pages, reports, dashboard, permissionRows, permissionFixtures, navigation) {
  return {
    doctypes: doctypes.length,
    fields: doctypes.reduce((sum, item) => sum + (item.definition.fields || []).length, 0),
    childTables: doctypes.filter(item => item.flags.child).length,
    childTableFields: doctypes.reduce((sum, item) => sum + (item.definition.fields || [])
      .filter(field => ['Table', 'Table MultiSelect'].includes(field.fieldtype)).length, 0),
    singles: doctypes.filter(item => item.flags.single).length,
    submittable: doctypes.filter(item => item.flags.submittable).length,
    formTabs: doctypes.reduce((sum, item) => sum + (item.definition.fields || [])
      .filter(field => field.fieldtype === 'Tab Break').length, 0),
    formSections: doctypes.reduce((sum, item) => sum + (item.definition.fields || [])
      .filter(field => field.fieldtype === 'Section Break').length, 0),
    workspaces: workspaces.length,
    workspaceCards: workspaces.reduce((sum, item) => sum + item.cards.length, 0),
    navigationDefinitions: navigation.definitions.length,
    sidebars: navigation.definitions.filter(item => ['Sidebar', 'Workspace Sidebar'].includes(item.kind)).length,
    navigationEdges: navigation.edges.length,
    pages: pages.length,
    pageKinds: countBy(pages, item => item.kind),
    reports: reports.length,
    reportKinds: countBy(reports, item => item.reportType),
    dashboards: dashboard.filter(item => item.kind === 'Dashboard').length,
    dashboardComponents: countBy(dashboard, item => item.kind),
    permissionDefinitions: permissionRows.length + permissionFixtures.length,
    permissionRows: permissionRows.length,
    permissionFixtures: permissionFixtures.length,
  }
}

function extractNavigation(definitions, workspaces, lookups) {
  const catalog = new Map()
  for (const item of lookups) {
    for (const alias of [item.name, item.definition.title, item.definition.label, item.definition.route,
      item.definition.page_name].filter(Boolean)) {
      const key = item.kind + ':' + alias
      const ids = catalog.get(key) || new Set()
      ids.add(item.id)
      catalog.set(key, ids)
    }
  }
  const edges = []
  for (const item of shipped([...definitions, ...workspaces])) {
    const doc = item.definition
    const add = (field, label, kind, target) => {
      if (!target) return
      const matches = [...(catalog.get(kind + ':' + target) || [])]
      let status = kind ? 'unresolved' : 'untyped'
      if (matches.length === 1) status = 'resolved'
      if (matches.length > 1) status = 'ambiguous'
      if (['URL', 'Route', 'External URL', 'External'].includes(kind) || /^https?:\/\//i.test(target)) status = 'route-or-url'
      // Keep missing legacy sidebar targets visible for the migration review.
      if (!matches.length && item.kind === 'Desktop Icon' && kind === 'Workspace Sidebar') status = 'unresolved'
      edges.push({ from: item.id, app: item.app, source: item.source, field, label, kind: kind || null, target,
        status, matches })
    }
    add('parent_page', null, 'Workspace', doc.parent_page)
    add('link_to', doc.label, doc.link_type, doc.link_to)
    for (const field of ['items', 'links', 'shortcuts', 'quick_lists', 'charts', 'number_cards']) {
      if (!Array.isArray(doc[field])) continue
      for (const [index, row] of doc[field].entries()) {
        const inferred = { charts: ['Dashboard Chart', row.chart_name],
          number_cards: ['Number Card', row.number_card_name], quick_lists: ['DocType', row.document_type] }[field]
        add(field + '[' + index + ']', row.label, row.link_type || inferred?.[0] || row.type,
          row.link_to || inferred?.[1] || row.route || row.url)
      }
    }
  }
  return { definitions, edges }
}

function printGroup(group) {
  const artifact = buildMetadata()
  console.log(JSON.stringify(artifact[group], null, 2))
  if (artifact['extraction-summary'].errors.length) process.exitCode = 1
}

function writeMetadata() {
  const artifact = buildMetadata()
  fs.mkdirSync(outputDir, { recursive: true })
  for (const [name, value] of Object.entries(artifact)) {
    // Keep the line-oriented source index compact without minifying definition files.
    const indent = name === 'source-index' ? undefined : 2
    fs.writeFileSync(path.join(outputDir, name + '.json'), JSON.stringify(value, null, indent) + '\n')
  }
  const licenses = path.join(outputDir, 'licenses')
  fs.mkdirSync(licenses, { recursive: true })
  fs.copyFileSync(path.join(root, 'reference', 'erpnext', 'license.txt'), path.join(licenses, 'ERPNext-GPL-3.0.txt'))
  fs.copyFileSync(path.join(root, 'reference', 'frappe', 'LICENSE'), path.join(licenses, 'Frappe-MIT.txt'))
  const summary = artifact['extraction-summary']
  console.log(JSON.stringify({ totals: summary.totals, errors: summary.errors }, null, 2))
  if (summary.errors.length) process.exitCode = 1
}

module.exports = { outputDir, buildMetadata, printGroup, apps }
if (require.main === module) writeMetadata()
