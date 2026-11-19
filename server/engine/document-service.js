import { HttpError, forbidden } from '../utils/http.js'
import { checkObject, invalid, validId } from './fields.js'
import { applyFields, documentName, granted, links, requireDraft } from './document-values.js'
import { validateTreeMutation, validateTreeDeletion } from './tree.js'
const missing = () => new HttpError(404,'NOT_FOUND','The resource is unavailable.')
export const scope = (spec, req) => ({
  company: spec.scope === 'global' ? null : req.company._id,
  ...(spec.ownerOnly && { owner: req.user._id }),
})
function expected(value, row) {
  if (!/^"[1-9]\d*"$/.test(value || '')) throw new HttpError(428,'VERSION_REQUIRED','Supply the quoted document version in If-Match.')
  if (value !== '"' + row.version + '"') throw new HttpError(412,'STALE_VERSION','Reload the document before changing it.',[{ currentVersion:row.version }])
}

export async function findRecord(context,id,session) {
  if (!validId(id)) throw missing()
  const row = await context.model.findOne({ _id:id,...scope(context.spec,context) }).session(session || null).lean()
  if (!row) throw missing()
  return row
}
export async function mutateDocument(database,registry,context,{action,id,body,match,requestId}) {
  const { spec, model, user } = context
  if (action !== 'delete') {
    checkObject(body,'body')
    const permitted = spec.naming.kind === 'prompt' && action === 'create' ? ['fields','name'] : ['fields']
    if (Object.keys(body).some(key => !permitted.includes(key))) invalid('body','Unknown document property')
  } else if (body && Object.keys(body).length) invalid('body','Delete accepts no document fields')
  let result
  try {
    result = await database.connection.getClient().withSession(session => session.withTransaction(async () => {
      const row = action === 'create' ? null : await findRecord(context,id,session)
      if (row) { expected(match,row); requireDraft(row,action) }
      let saved
      const company = scope(spec,context).company
      if (action === 'delete') {
        if (spec.tree) await validateTreeDeletion(spec, row._id, context)
        for (const source of context.models.values()) {
          if (await source.exists({ references:row._id }).session(session)) throw new HttpError(409,'REFERENCED','Another document references this record.')
        }
        await model.deleteOne({ _id:row._id,version:row.version },{ session })
      } else {
        if (spec.tree) await validateTreeMutation(spec, body.fields, row, context)
        const fields = applyFields(spec,body.fields,row?.fields,context.grants)
        const references = []
        for (const edge of links(spec.fields,fields)) {
          const target = registry.registered.get(edge.type)
          if (!granted(context.grants,target.resource,'read')) throw forbidden()
          // Serialize a new reference and a concurrent deletion by writing to the target.
          const touch = await context.models.get(edge.type).updateOne({ _id:edge.id,...scope(target,context) },
            { $inc:{ linkRevision:1 } },{ session,timestamps:false })
          if (!touch.matchedCount) invalid(edge.field,'Referenced document is unavailable')
          references.push(edge.id)
        }
        if (!row) {
          const name = await documentName(spec,body,fields,company,context.sequence,session)
          const [doc] = await model.create([{ doctype:spec.name,name,fields,company,owner:user._id,
            createdBy:user._id,modifiedBy:user._id,references }],{ session })
          saved = doc.toObject()
        } else {
          saved = await model.findOneAndUpdate({ _id:row._id,version:row.version },
            { $set:{ fields,references,modifiedBy:user._id },$inc:{ version:1 } },
            { session,returnDocument:'after',runValidators:true }).lean()
          if (!saved) throw new HttpError(412,'STALE_VERSION','Reload the document before changing it.')
        }
      }
      await database.models.AuditLog.create([{ action:'document.' + action,actor:user._id,subject:row?._id || saved._id,
        company,doctype:spec.name,requestId:requestId,changedFields:Object.keys(body?.fields || {}) }],{ session })
      return saved
    }))
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409,'DUPLICATE','A document with this unique value already exists.')
    throw error
  }
  return result
}
