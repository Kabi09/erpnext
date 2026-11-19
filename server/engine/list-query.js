import { invalid, scalar, validId } from './fields.js'
import { readable } from './document-values.js'

const allowed = new Set(['limit','cursor','sort','search','fields','from','to','filter','value'])
export function listQuery(spec, query, grants) {
  for (const [key,value] of Object.entries(query)) if (!allowed.has(key) || typeof value !== 'string') invalid(key,'Invalid query parameter')
  const limit = Number(query.limit || 25)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) invalid('limit','Expected 1–100')
  const sort = query.sort || 'name'
  const direction = sort.startsWith('-') ? -1 : 1
  const field = direction < 0 ? sort.slice(1) : sort
  if (!['name','createdAt'].includes(field)) invalid('sort','Unsupported sort')
  const visible = spec.fields.filter(f => readable(f,spec,grants))
  const select = query.fields?.split(',')
  if (select?.some(key => !visible.some(f => f.fieldname === key))) invalid('fields','Unknown field selection')
  const criteria = {}
  if (query.search) {
    if (query.search.length > 100 || /[\u0000-\u001f]/.test(query.search)) invalid('search','Invalid search text')
    criteria.name = { $regex: '^' + query.search.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&'), $options: 'i' }
  }
  if (query.filter !== undefined || query.value !== undefined) {
    const f = visible.find(item => item.fieldname === query.filter && item.in_list_view &&
      ['Select','Data','Date'].includes(item.fieldtype))
    if (!f || query.value === undefined) invalid('filter','Unsupported equality filter')
    criteria['fields.' + f.fieldname] = scalar(f,query.value)
  }
  for (const [key,op] of [['from','$gte'],['to','$lt']]) {
    if (query[key]) {
      const date = scalar({ fieldtype:'Date',fieldname:key },query[key])
      criteria.createdAt ||= {}
      criteria.createdAt[op] = new Date(date)
    }
  }
  if (query.cursor) {
    try {
      const [order,value,id] = JSON.parse(Buffer.from(query.cursor,'base64url').toString())
      if (order !== sort || typeof value !== 'string' || !validId(id) ||
        (field === 'createdAt' && !Number.isFinite(Date.parse(value)))) throw new Error()
      const op = direction === 1 ? '$gt' : '$lt'
      criteria.$or = [{ [field]: { [op]: value } }, { [field]: value, _id: { [op]: id } }]
    } catch { invalid('cursor','Invalid cursor') }
  }
  return { criteria, limit, select, order: { [field]: direction, _id: direction },
    next: row => Buffer.from(JSON.stringify([sort,row[field],row._id])).toString('base64url') }
}
