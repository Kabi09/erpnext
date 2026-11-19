import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import { fieldKind } from './fields.js'

const { Schema } = mongoose
const objectId = Schema.Types.ObjectId
const schemaOptions = { strict: 'throw', minimize: false, autoIndex: false, autoCreate: false }

function fieldSchema(fields, embedded = false) {
  const paths = {}
  for (const f of fields) {
    const kind = fieldKind(f.fieldtype)
    if (kind === 'layout') continue
    let type = { string: String, enum: String, decimal: Schema.Types.Decimal128, integer: Number,
      date: String, time: String, instant: Date, boolean: Boolean, link: objectId,
      json: Schema.Types.Mixed, dynamic: Schema.Types.Mixed }[kind]
    if (kind === 'table') type = [fieldSchema(f.child, true)]
    if (!type) throw new Error('Missing field adapter: ' + f.fieldtype)
    const path = { type, required: Boolean(f.reqd), default: f.initial }
    if (f.length) path.maxlength = Number(f.length)
    if (kind === 'enum') path.enum = f.options.split('\n')
    if (kind === 'integer') path.validate = Number.isSafeInteger
    paths[f.fieldname] = path
  }
  return new Schema(paths, { ...schemaOptions, _id: embedded, id: false })
}

export function modelName(sourceId) {
  return 'ERP_' + createHash('sha256').update(sourceId).digest('hex')
}

export async function compileModels(connection, registry) {
  const models = new Map()
  for (const [name, spec] of registry.registered) {
    const key = modelName(spec.row.id)
    let model = connection.models[key]
    if (!model) {
      const schema = new Schema({
        name: { type: String, required: true }, doctype: { type: String, enum: [name], required: true },
        company: { type: objectId, required: spec.scope === 'company', default: null },
        owner: { type: objectId, required: true }, createdBy: { type: objectId, required: true },
        modifiedBy: { type: objectId, required: true }, version: { type: Number, default: 1 },
        lifecycle: { type: String, enum: ['Draft'], default: 'Draft' }, fields: { type: fieldSchema(spec.fields), required: true },
        references: [objectId], linkRevision: { type: Number, default: 0 },
      }, { ...schemaOptions, timestamps: true })
      schema.index({ company: 1, name: 1 }, { unique: true })
      schema.index({ references: 1 })
      schema.index({ company: 1, createdAt: 1, _id: 1 })
      for (const f of spec.fields) {
        if (f.unique || f.search_index) schema.index({ company: 1, ['fields.' + f.fieldname]: 1 },
          f.unique ? { unique: true, partialFilterExpression: { ['fields.' + f.fieldname]: { $exists: true } } } : {})
      }
      model = connection.model(key, schema, key.toLowerCase())
      model.catalogVersion = registry.version
    }
    if (model.catalogVersion !== registry.version) throw new Error('Schema version changed on an active connection')
    await model.createIndexes()
    models.set(name, model)
  }
  const sequence = connection.models.DocumentSequence || connection.model('DocumentSequence',
    new Schema({ _id: String, value: Number }, schemaOptions))
  await sequence.createCollection()
  return { models, sequence }
}
