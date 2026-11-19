import { Types } from 'mongoose'
import { checkObject, fieldKind, invalid, scalar, validId } from './fields.js'
import { HttpError } from '../utils/http.js'

export const granted = (grants, resource, action) => grants.has(resource + ':' + action)
export function readable(f, spec, grants) {
  const resource = spec.fieldResource?.[f.fieldname]
  return !f.hidden && (!resource || granted(grants, resource, 'read'))
}

export function applyFields(spec, input, previous, grants, path = 'fields') {
  checkObject(input, path)
  const result = { ...previous }
  for (const key of Object.keys(input)) {
    const f = spec.fields.find(item => item.fieldname === key)
    const location = path + '.' + key
    const resource = spec.fieldResource?.[key]
    if (!f || !readable(f, spec, grants) || f.read_only || f.fieldtype === 'Read Only' ||
      (previous && (key === spec.naming?.field || f.set_only_once)) ||
      (resource && !granted(grants, resource, 'update'))) invalid(location, 'Field is unavailable for writing')
    if (f.child) {
      const rows = input[key]
      if (!Array.isArray(rows) || rows.length > f.rule.maxRows) invalid(location, 'Invalid number of child rows')
      const known = new Map((previous?.[key] || []).map(row => [String(row._id), row]))
      const unique = new Set()
      result[key] = rows.map((row, index) => {
        const rowPath = location + '.' + index
        checkObject(row, rowPath)
        const { rowId, ...changes } = row
        const old = known.get(rowId)
        if (rowId !== undefined && (!validId(rowId) || !old)) invalid(rowPath, 'Unknown or repeated child row')
        known.delete(rowId)
        const values = applyFields({ fields: f.child }, changes, old, grants, rowPath)
        if (f.rule.uniqueBy) {
          const value = values[f.rule.uniqueBy]
          if (unique.has(value)) invalid(rowPath, 'Duplicate child value')
          unique.add(value)
        }
        return { ...values, _id: old?._id || new Types.ObjectId() }
      })
    } else result[key] = scalar(f, input[key], location)
  }
  for (const f of spec.fields) {
    const key = f.fieldname
    if (result[key] === undefined && f.initial !== undefined) result[key] = f.initial
    if (f.reqd && (result[key] == null || result[key] === '' || (f.child && !result[key].length))) invalid(path + '.' + key, 'Required field')
  }
  return result
}

export function links(fields, values) {
  const result = []
  for (const f of fields) {
    const value = values[f.fieldname]
    if (value == null) continue
    if (f.child) for (const row of value) result.push(...links(f.child, row))
    if (f.fieldtype === 'Link') result.push({ field: f.fieldname, type: f.options, id: String(value) })
    if (f.fieldtype === 'Dynamic Link') {
      if (values[f.options] !== value.type) invalid(f.fieldname, 'Dynamic reference type mismatch')
      result.push({ field: f.fieldname, ...value })
    }
  }
  return result
}

export function publicFields(spec, values, grants, registry, select) {
  const output = {}
  for (const f of spec.fields) {
    const key = f.fieldname
    if (!readable(f, spec, grants) || (select && !select.includes(key))) continue
    const value = values[key]
    if (value == null) continue
    const target = f.fieldtype === 'Link' ? f.options : f.fieldtype === 'Dynamic Link' ? value.type : null
    if (target && !granted(grants, registry.registered.get(target)?.resource, 'read')) continue
    if (f.child) output[key] = value.map(row => ({ rowId: String(row._id), ...publicFields({ fields: f.child }, row, grants, registry) }))
    else output[key] = fieldKind(f.fieldtype) === 'decimal' ? value.toString() : value
  }
  return output
}

export async function documentName(spec, body, fields, company, sequence, session) {
  const rule = spec.naming
  let name
  if (rule.kind === 'field') name = fields[rule.field]
  else if (rule.kind === 'prompt') name = body.name
  else if (rule.kind === 'series' && /^[A-Z][A-Z0-9-]{0,20}$/.test(rule.prefix) &&
    Number.isInteger(rule.digits) && rule.digits >= 1 && rule.digits <= 12) {
    const key = JSON.stringify([spec.name, company, rule.prefix])
    const counter = await sequence.findOneAndUpdate({ _id: key }, { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after', session })
    name = rule.prefix + String(counter.value).padStart(rule.digits, '0')
  } else throw new Error('Unregistered naming strategy')
  if (typeof name !== 'string' || !name.trim() || name.length > 140 || /[\u0000-\u001f]/.test(name)) invalid('name', 'Invalid document name')
  return name.trim()
}

/**
 * Contract for a future domain-owned submit, cancel or amend handler.
 * The caller opens the transaction. The handler verifies the version and grants,
 * applies domain changes, and appends audit events within that session.
 * @typedef {(command: {action: 'submit'|'cancel'|'amend', actorId: string,
 * companyId: string, doctype: string, documentId: string, expectedVersion: number,
 * idempotencyKey: string, requestId: string}, session: import('mongoose').ClientSession)
 * => Promise<{documentId: string, version: number}>} LifecycleHandler
 */
export const lifecycleActions = Object.freeze({ Draft: ['update','delete'], Submitted: [], Cancelled: [] })
export function requireDraft(row, action) {
  if (!lifecycleActions[row.lifecycle]?.includes(action)) throw new HttpError(409, 'INVALID_STATE', 'This operation requires a draft.')
}
