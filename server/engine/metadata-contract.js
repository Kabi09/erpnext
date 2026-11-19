import { actions } from './policies.js'
import { granted, readable } from './document-values.js'
export function describe(spec, grants, registry) {
  function descriptor(f, parent) {
    const resource = parent.fieldResource?.[f.fieldname]
    const field = { name: f.fieldname, label: f.label || f.fieldname, type: f.fieldtype, required: Boolean(f.reqd),
      readOnly: Boolean(f.read_only || f.fieldtype === 'Read Only' || (resource && !granted(grants, resource, 'update'))),
      immutableAfterCreate: Boolean(f.set_only_once || parent.naming?.field === f.fieldname), hidden: false,
      default: f.initial, list: Boolean(f.in_list_view) }
    if (f.visibleWhen) field.visibleWhen = f.visibleWhen
    if (f.fieldtype === 'Select') field.options = f.options.split('\n')
    if (f.fieldtype === 'Link') field.target = f.options
    if (f.fieldtype === 'Dynamic Link') {
      field.selector = f.options
      field.targets = f.targets.filter(name => granted(grants, registry.registered.get(name).resource, 'read'))
    }
    if (f.child) field.child = { type: f.options, maxRows: f.rule.maxRows, fields: f.child.map(child => descriptor(child, {})) }
    return field
  }
  const fields = spec.fields.filter(f => readable(f, spec, grants)).map(f => descriptor(f, spec))
  const order = spec.row.definition.field_order || spec.row.definition.fields.map(f => f.fieldname)
  const layout = order.flatMap(key => {
    const f = spec.row.definition.fields.find(item => item.fieldname === key)
    if (!f) return []
    if (['Section Break','Tab Break','Column Break','Heading','Fold'].includes(f.fieldtype))
      return [{ name: key, type: f.fieldtype, label: f.label || '' }]
    return fields.some(field => field.name === key) ? [{ name: key }] : []
  })
  return { name: spec.name, module: spec.row.module, scope: spec.scope, version: registry.version,
    sourceId: spec.row.id, fields, layout, listFields: fields.filter(f => f.list).map(f => f.name),
    actions: actions.filter(action => granted(grants,spec.resource,action) && (spec.scope !== 'global' || action === 'read')),
    unsupportedActions: ['submit','cancel','amend','print','export','import','report','share'],
    unsupportedConditions: [] }
}
