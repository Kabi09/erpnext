const supportedMvp = new Set([
  'Autocomplete', 'Check', 'Column Break', 'Currency', 'Data', 'Date', 'Datetime', 'Duration',
  'Float', 'Fold', 'Heading', 'Int', 'Link', 'Long Text', 'Percent', 'Phone', 'Read Only',
  'Section Break', 'Select', 'Small Text', 'Tab Break', 'Table', 'Text', 'Time',
])

function extractDoctypes(definitions) {
  return definitions.map(item => {
    const doc = item.definition
    const fields = doc.fields || []
    const types = ['Tab Break', 'Section Break', 'Column Break', 'Fold', 'Heading']
    return {
      ...item,
      flags: { child: Boolean(doc.istable), single: Boolean(doc.issingle), submittable: Boolean(doc.is_submittable),
        tree: Boolean(doc.is_tree), virtual: Boolean(doc.is_virtual), custom: Boolean(doc.custom) },
      layout: (doc.field_order || fields.map(field => field.fieldname)).map(fieldname => {
        const fieldtype = fields.find(field => field.fieldname === fieldname)?.fieldtype
        return types.includes(fieldtype) ? { fieldname, fieldtype } : { fieldname }
      }),
      list: { columns: fields.filter(field => field.in_list_view).map(field => field.fieldname),
        standardFilters: fields.filter(field => field.in_standard_filter).map(field => field.fieldname),
        searchFields: doc.search_fields || null, sortField: doc.sort_field || null,
        sortOrder: doc.sort_order || null, titleField: doc.title_field || null,
        controllers: item.companions.filter(source => /_list\.[cm]?js$/.test(source)) },
      naming: { rule: doc.naming_rule || null, autoname: doc.autoname || null,
        series: fields.filter(field => field.fieldname === 'naming_series').map(field => field.options ?? null) },
    }
  })
}

function extractRelationships(doctypes) {
  return doctypes.flatMap(item => (item.definition.fields || []).flatMap(field => {
    const kinds = { Link: 'link', 'Dynamic Link': 'dynamic-link', Table: 'child-table',
      'Table MultiSelect': 'table-multiselect' }
    const entries = []
    if (kinds[field.fieldtype]) entries.push({ kind: kinds[field.fieldtype], target: field.options || null })
    if (field.fetch_from) entries.push({ kind: 'fetch-from', target: field.fetch_from })
    return entries.map(edge => ({ ...edge, from: item.id, doctype: item.name, field: field.fieldname, source: item.source }))
  }))
}

module.exports = { supportedMvp, extractDoctypes, extractRelationships }
if (require.main === module) require('./extract-metadata').printGroup('doctypes')
