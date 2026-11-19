import { Router } from 'express'
import { HttpError, forbidden, respond } from '../utils/http.js'
import { companyGrants } from '../middlewares/access.js'
import { invalid, validId } from '../engine/fields.js'
import { buildRegistry } from '../engine/registry.js'
import { compileModels } from '../engine/models.js'
import { scope, findRecord, mutateDocument } from '../engine/document-service.js'
import { granted, links, publicFields } from '../engine/document-values.js'
import { describe } from '../engine/metadata-contract.js'
import { listQuery } from '../engine/list-query.js'

const missing = () => new HttpError(404, 'NOT_FOUND', 'The resource is unavailable.')
export function documentRoutes(database, metadata, identity) {
  const registry = buildRegistry(metadata)
  const initialized = compileModels(database.connection,registry)
  initialized.catch(() => {}) // Startup and request handlers both await the same initialization.
  const router = Router()
  router.use(['/metadata','/documents'], identity, async (req,_res,next) => {
    const companyId = req.get('X-Company-Id')
    if (!validId(companyId)) invalid('company','A valid X-Company-Id is required')
    const access = await companyGrants(database.models,req.user,companyId)
    if (!access) throw forbidden()
    Object.assign(req, access)
    next()
  })
  const available = req => [...registry.registered.values()].filter(spec => granted(req.grants,spec.resource,'read'))
  router.get('/metadata/modules',(req,res) => respond(req,res,[...new Set(available(req).map(spec => spec.row.module))].sort()))
  router.get('/metadata/doctypes',(req,res) => respond(req,res,available(req).map(spec => ({
    name:spec.name,module:spec.row.module,version:registry.version,
  }))))
  router.get('/metadata/doctypes/:doctype',(req,res) => {
    const spec = available(req).find(item => item.name === req.params.doctype)
    if (!spec) throw missing()
    respond(req,res,describe(spec,req.grants,registry))
  })
  router.use('/documents/:doctype',async (req,_res,next) => {
    const spec = registry.registered.get(req.params.doctype)
    if (!spec) throw missing()
    const action = { GET:'read',HEAD:'read',POST:'create',PATCH:'update',DELETE:'delete' }[req.method]
    if (!action || !granted(req.grants,spec.resource,'read') || !granted(req.grants,spec.resource,action) ||
      (spec.scope === 'global' && action !== 'read')) {
      await database.models.AuditLog.create({ action:'document.denied',doctype:spec.name,actor:req.user._id,company:req.company._id,requestId:req.id })
      throw forbidden()
    }
    const { models, sequence } = await initialized
    Object.assign(req,{ spec, models, sequence, model:models.get(spec.name) })
    next()
  })
  function present(req,row,select) {
    const { _id,name,doctype,company,owner,createdBy,modifiedBy,createdAt,updatedAt,version,lifecycle } = row
    return { id:_id,name,doctype,company,owner,createdBy,modifiedBy,createdAt,updatedAt,version,lifecycle,
      fields:publicFields(req.spec,row.fields,req.grants,registry,select) }
  }
  async function list(req,res,options) {
    const q = listQuery(req.spec,req.query,req.grants)
    const rows = await req.model.find({ ...scope(req.spec,req), ...q.criteria }).sort(q.order).limit(q.limit + 1).lean()
    const more = rows.length > q.limit
    if (more) rows.pop()
    res.json({ data:rows.map(row => options ? { id:row._id,name:row.name } : present(req,row,q.select)),
      meta:{ requestId:req.id,nextCursor:more ? q.next(rows.at(-1)) : null } })
  }
  const base = '/documents/:doctype'
  router.get(base + '/options',(req,res) => list(req,res,true))
  router.get(base,(req,res) => list(req,res,false))
  router.get(base + '/:id',async (req,res) => {
    const row = await findRecord(req,req.params.id)
    res.set('ETag','"' + row.version + '"')
    respond(req,res,present(req,row))
  })
  router.get(base + '/:id/relations',async (req,res) => {
    const row = await findRecord(req,req.params.id)
    const output = []
    for (const edge of links(req.spec.fields,publicFields(req.spec,row.fields,req.grants,registry))) {
      const target = registry.registered.get(edge.type)
      const related = await req.models.get(edge.type).findOne({ _id:edge.id,...scope(target,req) }).select('name').lean()
      if (related) output.push({ ...edge,name:related.name })
    }
    respond(req,res,output)
  })

  async function write(req,res,action) {
    const result = await mutateDocument(database,registry,req,{ action,id:req.params.id,body:req.body,match:req.get('If-Match'),requestId:req.id })
    if (action === 'delete') return res.status(204).end()
    res.set('ETag','"' + result.version + '"')
    respond(req,res,present(req,result),action === 'create' ? 201 : 200)
  }
  router.post(base,(req,res) => write(req,res,'create'))
  router.patch(base + '/:id',(req,res) => write(req,res,'update'))
  router.delete(base + '/:id',(req,res) => write(req,res,'delete'))
  return { router,initialized }
}
