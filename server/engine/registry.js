import { createHash } from 'node:crypto'
import { policies } from './policies.js'
import { defaultValue, fieldKind, safeKey } from './fields.js'

const contractRevision = 'cryo-documents-v1'

// A bare Check field is the supported subset of Frappe's depends_on syntax.
export function visibilityCondition(field, fields) {
  const key = field.depends_on
  if (typeof key !== 'string' || !safeKey(key)) return undefined
  const source = fields.find(f => f.fieldname === key)
  if (source?.fieldtype === 'Check') return { field: key, equals: true }
}

export function buildRegistry(metadata, reviewed = policies) {
  const all = new Map()
  const registered = new Map()
  const manifest = []
  const unresolved = new Map()
  const controllerSignals = new Set(metadata.catalogs['source-index'].flatMap(repo => repo.evidence
    .filter(file => file.signals.some(signal => ['business-method','lifecycle-method'].includes(signal.kind)))
    .map(file => file.source)))
  const externalApps = new Map()
  for (const app of metadata.catalogs.dependencies.unresolvedApps || []) {
    for (const evidence of app.evidence) {
      const names = externalApps.get(evidence.source) || new Set()
      names.add(app.app)
      externalApps.set(evidence.source,names)
    }
  }
  for (const edge of metadata.catalogs.dependencies.unresolvedRelationships || []) {
    const list = unresolved.get(edge.from) || []
    list.push({ field: edge.field, target: edge.target })
    unresolved.set(edge.from, list)
  }
  for (const row of metadata.catalogs.doctypes.filter(item => item.scope === 'shipped')) {
    if (all.has(row.name)) throw new Error('Duplicate DocType: ' + row.name)
    all.set(row.name, row)
  }
  function descriptors(row, names, policy = {}) {
    const fields = row.definition.fields || []
    if (!Array.isArray(names) || new Set(names).size !== names.length) throw new Error('Invalid approved fields')
    for (const field of fields) {
      if (field.reqd && !names.includes(field.fieldname)) throw new Error('Missing required field: ' + field.fieldname)
    }
    return names.map(name => {
      const matches = fields.filter(field => field.fieldname === name)
      if (!safeKey(name) || matches.length !== 1) throw new Error('Invalid approved field: ' + name)
      const field = { ...matches[0] }
      if (fieldKind(field.fieldtype) === 'unsupported' || field.hidden || field.permlevel ||
        field.mandatory_depends_on || field.read_only_depends_on || field.collapsible_depends_on) throw new Error('Field requires review: ' + name)
      if (field.depends_on) {
        field.visibleWhen = visibilityCondition(field, fields)
        if (!field.visibleWhen || !names.includes(field.visibleWhen.field) || policy.fieldResource?.[field.visibleWhen.field]) {
          throw new Error('Unsupported visibility condition: ' + name)
        }
      }
      if (fieldKind(field.fieldtype) === 'table') {
        const child = all.get(field.options)
        const rule = policy.children?.[name]
        if (!child?.flags.child || !Number.isInteger(rule?.maxRows) || rule.maxRows < 1 ||
          (field.fieldtype === 'Table MultiSelect' && !rule.uniqueBy)) throw new Error('Unapproved child table: ' + name)
        field.child = descriptors(child, rule.fields)
        if (rule.uniqueBy && !rule.fields.includes(rule.uniqueBy)) throw new Error('Invalid child uniqueness field')
        field.rule = rule
      }
      if (field.fieldtype === 'Dynamic Link') {
        field.targets = policy.dynamicTargets?.[name]
        if (!field.targets?.length || !names.includes(field.options)) throw new Error('Missing dynamic target policy or selector')
      }
      field.initial = defaultValue(field)
      return field
    })
  }
  for (const row of all.values()) {
    const unsupported = [...new Set(row.definition.fields.filter(f => fieldKind(f.fieldtype) === 'unsupported').map(f => f.fieldtype))]
    const sensitive = row.app === 'frappe' && ['Core','Users','System','Custom','Integrations','Automation','Flow','Studio'].includes(row.module) ||
      /(?:password|permission|session|audit log|^user$|^role$|^company$|token|credential|oauth|api key)/i.test(row.name)
    const controller = row.source.replace(/\.json$/,'.py')
    const customMethods = controllerSignals.has(controller)
    const business = row.flags.submittable || row.flags.tree || row.flags.single || customMethods
    const missing = unresolved.get(row.id) || []
    const blocked = sensitive || row.flags.virtual || missing.length > 0
    let status = 'Discovered'
    if (business) status = 'Requires Business Logic'
    if (unsupported.length) status = 'Unsupported'
    if (blocked) status = 'Blocked'
    const entry = { name: row.name, module: row.module, source: row.source, sourceId: row.id, flags: row.flags,
      sensitive, business, customMethods, unsupported, unresolved: missing,
      externalAppSignals: [...new Set(row.companions.flatMap(source => [...(externalApps.get(source) || [])]))],
      genericCandidate: !business && !blocked && !row.flags.child && !unsupported.length,
      stages: ['Discovered'], status, registered: false, crudEnabled: false }
    const conditionKeys = ['depends_on', 'mandatory_depends_on', 'read_only_depends_on', 'collapsible_depends_on']
    const unsupportedConditions = row.definition.fields.flatMap(field => conditionKeys
      .filter(key => field[key] && !(key === 'depends_on' && visibilityCondition(field, row.definition.fields)))
      .map(key => ({ field: field.fieldname, condition: key })))
    if (unsupportedConditions.length) entry.unsupportedConditions = unsupportedConditions
    if (unsupportedConditions.length || entry.externalAppSignals.length) entry.genericCandidate = false
    const policy = reviewed.find(item => item.name === row.name)
    if (policy) {
      if (!['company','global'].includes(policy.scope || 'company')) throw new Error('Unknown document scope')
      if (blocked || row.flags.tree || row.flags.single || row.flags.submittable || row.flags.child ||
        (customMethods && !policy.reviewedController) || registered.has(policy.name)) throw new Error('Unsafe registration: ' + row.name)
      const fields = descriptors(row, policy.fields, policy)
      const naming = policy.naming || { kind: 'field', field: row.definition.autoname?.replace(/^field:/, '') }
      if (naming.kind === 'field' && !fields.some(f => f.fieldname === naming.field)) throw new Error('Unsupported naming rule')
      entry.registered = true
      entry.status = policy.status || 'Registered'
      if (!['Registered','CRUD Enabled','Verified'].includes(entry.status)) throw new Error('Invalid registration status')
      entry.stages.push('Registered')
      if (entry.status !== 'Registered') {
        entry.crudEnabled = true
        registered.set(row.name, { ...policy, naming, fields, row })
        entry.stages.push('CRUD Enabled')
        if (entry.status === 'Verified') entry.stages.push('Verified')
      }
    }
    manifest.push(entry)
  }
  if (manifest.filter(item => item.registered).length !== reviewed.length) throw new Error('Missing or duplicate registered DocType')
  for (const spec of registered.values()) {
    function verifyLinks(fields) {
      for (const f of fields) {
        if (f.child) verifyLinks(f.child)
        const targets = f.fieldtype === 'Link' ? [f.options] : f.targets || []
        if (targets.some(name => !registered.has(name))) throw new Error('Unregistered link target')
      }
    }
    verifyLinks(spec.fields)
  }
  const version = createHash('sha256').update(contractRevision).update(metadata.checksum).update(JSON.stringify(reviewed)).digest('hex')
  return { registered, manifest, version, sourceChecksum: metadata.checksum }
}
