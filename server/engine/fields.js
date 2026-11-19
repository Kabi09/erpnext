import mongoose from 'mongoose'
import { HttpError } from '../utils/http.js'

export const layout = new Set(['Section Break', 'Column Break', 'Tab Break', 'Heading', 'Fold', 'Button', 'HTML', 'Image'])
const strings = new Set(['Data', 'Small Text', 'Long Text', 'Text', 'Phone', 'Autocomplete', 'Text Editor', 'Read Only'])
const decimals = new Set(['Currency', 'Float', 'Percent'])
const tables = new Set(['Table', 'Table MultiSelect'])
const scalarKinds = new Map(Object.entries({
  Int: 'integer', Check: 'boolean', Select: 'enum', Date: 'date', Datetime: 'instant',
  Time: 'time', Link: 'link', 'Dynamic Link': 'dynamic', JSON: 'json',
}))
const idPattern = /^[a-f\d]{24}$/i
export const validId = value => typeof value === 'string' && idPattern.test(value)
export const safeKey = key => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && !key.startsWith('__') &&
  !['prototype', 'constructor'].includes(key) && !(key in Object.prototype)

export function invalid(field, message) {
  throw new HttpError(422, 'INVALID_FIELD', 'Check the submitted fields.', [{ field, message }])
}

export function checkObject(value, path = 'fields') {
  if (!value || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(path, 'Expected an object')
  for (const key of Object.keys(value)) if (!safeKey(key)) invalid(path, 'Invalid field key')
}

export function fieldKind(type) {
  if (layout.has(type)) return 'layout'
  if (strings.has(type)) return 'string'
  if (decimals.has(type)) return 'decimal'
  if (tables.has(type)) return 'table'
  return scalarKinds.get(type) ?? 'unsupported'
}

export function scalar(field, value, path = field.fieldname) {
  const kind = fieldKind(field.fieldtype)
  const fail = message => invalid(path, message)
  if (value === null) {
    if (field.reqd) fail('Required field')
    return null
  }
  if (kind === 'json') {
    function inspect(node, depth) {
      if (depth > 8) fail('JSON nesting limit exceeded')
      if (node && typeof node === 'object') {
        if (!Array.isArray(node)) checkObject(node, path)
        for (const child of Object.values(node)) inspect(child, depth + 1)
      }
    }
    inspect(value, 0)
    return value
  }
  if (['integer', 'decimal'].includes(kind)) {
    if (kind === 'integer' && !Number.isSafeInteger(value)) fail('Expected a safe integer')
    if (kind === 'decimal') {
      if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value) || value.length > 64 ||
        (value.split('.')[1]?.length || 0) > Number(field.precision ?? 9)) fail('Expected a fixed precision decimal string')
      try { mongoose.Types.Decimal128.fromString(value) } catch { fail('Invalid Decimal128 value') }
    }
    // Compare fixed-point values as scaled integers, including metadata bounds.
    const compare = (left, right) => {
      const [a,b] = [left,right].map(String)
      const scale = Math.max(...[a,b].map(n => n.split('.')[1]?.length || 0))
      const fixed = n => BigInt(n.split('.')[0] + (n.split('.')[1] || '').padEnd(scale, '0'))
      return fixed(a) - fixed(b)
    }
    if ((field.non_negative && compare(value, 0) < 0n) ||
      (field.min_value != null && compare(value, field.min_value) < 0n) ||
      (field.max_value != null && compare(value, field.max_value) > 0n)) fail('Outside the allowed numeric range')
    return value
  }
  if (kind === 'boolean') {
    if (typeof value !== 'boolean') fail('Expected a boolean')
    return value
  }
  if (kind === 'dynamic') {
    checkObject(value, path)
    if (Object.keys(value).length !== 2 || !validId(value.id) || !field.targets?.includes(value.type)) fail('Invalid dynamic reference')
    return { type: value.type, id: value.id.toLowerCase() }
  }
  if (typeof value !== 'string') fail('Expected text')
  if (kind === 'link' && !validId(value)) fail('Invalid reference ID')
  if (kind === 'enum' && !field.options?.split('\n').includes(value)) fail('Invalid choice')
  if (kind === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value)) fail('Invalid calendar date')
  if (kind === 'instant' && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,19) !== value.slice(0,19))) fail('Expected a UTC timestamp')
  if (kind === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) fail('Invalid time')
  if (kind === 'unsupported' || kind === 'layout' || kind === 'table') fail('Unsupported value')
  if (field.reqd && !value.trim()) fail('Required field')
  if (value.length > Number(field.length || (field.fieldtype === 'Data' ? 140 : 8192))) fail('Text is too long')
  if (field.fieldtype === 'Text Editor' && /[<>]/.test(value)) fail('Only plain text is supported')
  return kind === 'link' ? value.toLowerCase() : value
}

export function defaultValue(field) {
  if (field.default == null || field.default === '') return undefined
  let value = field.default
  if (field.fieldtype === 'Check' && ['0','1'].includes(String(value))) value = Boolean(Number(value))
  if (field.fieldtype === 'Int' && /^-?\d+$/.test(value)) value = Number(value)
  return scalar(field, value)
}
