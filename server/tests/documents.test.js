import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { startReplica } from './support/replica.js'
import { openDatabase } from '../config/database.js'
import { bootstrapAdmin } from '../config/bootstrap-admin.js'
import { readConfig } from '../config/environment.js'
import { loadReferenceMetadata } from '../engine/reference-metadata.js'
import { buildRegistry, visibilityCondition } from '../engine/registry.js'
import { compileModels, modelName } from '../engine/models.js'
import { defaultValue, fieldKind, scalar } from '../engine/fields.js'
import { documentName } from '../engine/document-values.js'
import { createApp } from '../app.js'

test('field policies reject unsafe defaults and preserve decimal precision', () => {
  assert.equal(modelName('A/B') === modelName('A-B'), false)
  assert.equal(fieldKind('Password'),'unsupported')
  assert.equal(fieldKind('constructor'),'unsupported')
  const check = [{fieldname:'enabled', fieldtype:'Check'}]
  assert.deepEqual(visibilityCondition({depends_on:'enabled'},check),{field:'enabled', equals:true})
  assert.equal(visibilityCondition({depends_on:'eval:doc.enabled'},check),undefined)
  assert.throws(() => scalar({ fieldtype:'JSON', reqd:1 },null))
  assert.equal(fieldKind('Section Break'),'layout')
  assert.equal(scalar({ fieldtype:'Currency',precision:2 },'9007199254740993.01'),'9007199254740993.01')
  assert.throws(() => scalar({fieldtype:'Date'},'2025-02-31'))
  assert.throws(() => defaultValue({fieldtype:'Select',options:'Yes\nNo',default:'other'}))
  assert.equal(scalar({fieldtype:'Select',options:'Yes\nNo'},'No'),'No')
  const dynamic = {fieldtype:'Dynamic Link',targets:['Example']}
  assert.deepEqual(scalar(dynamic,{type:'Example',id:'a'.repeat(24)}),{type:'Example',id:'a'.repeat(24)})
  assert.throws(() => scalar(dynamic,{type:'User',id:'a'.repeat(24)}))
  assert.throws(() => scalar({fieldtype:'Int',non_negative:1},-1))
  assert.throws(() => scalar({fieldtype:'Currency',precision:2},'1.234'))
  assert.throws(() => scalar({fieldtype:'Data',length:2},'long'))
  assert.throws(() => scalar({fieldtype:'JSON'},JSON.parse('{"constructor":1}')))
})

test('registered HTTP documents on a replica set', async t => {
  const replica = await startReplica()
  let db,server
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    await db?.close()
    await replica.close()
  })
  db = await openDatabase(replica.uri)
  const raw = await loadReferenceMetadata()
  const registry = buildRegistry(raw)
  const config = readConfig({ NODE_ENV:'test',APP_ORIGINS:'http://localhost:5173',MONGODB_URI:replica.uri,
    JWT_SECRET:randomBytes(32).toString('base64url') })
  const password = randomBytes(20).toString('hex')
  await bootstrapAdmin(db,{ ADMIN_EMAIL:'owner@example.com',ADMIN_NAME:'Owner',ADMIN_PASSWORD:password,COMPANY_CODE:'HQ',COMPANY_NAME:'HQ' })
  const user = await db.models.User.findOne({email:'owner@example.com'}).select('+passwordHash')
  const company = String(user.memberships[0].company)
  const other = await db.models.Company.create({code:'WEST',name:'West'})
  user.memberships.push({ company:other._id,roles:user.memberships[0].roles })
  await user.save()
  const app = createApp(config,{database:db,metadata:raw,logger:false})
  const compiled = await app.locals.documentsReady
  server = app.listen(0,'127.0.0.1')
  await once(server,'listening')
  const root = 'http://127.0.0.1:' + server.address().port + '/api/v1'
  async function login(email) {
    const result = await fetch(root + '/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-CRYO-Request':'1'},
      body:JSON.stringify({email,password})})
    return (await result.json()).data.accessToken
  }
  const token = await login(user.email)
  async function call(method,path,status,{body,version,scope=company,auth=token}={}) {
    const res = await fetch(root + path,{method,headers:{'Content-Type':'application/json','X-Company-Id':scope,
      ...(auth && {Authorization:'Bearer '+auth}),...(version && {'If-Match':'"'+version+'"'})},body:body && JSON.stringify(body)})
    const payload = res.status === 204 ? null : await res.json()
    if (status) assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(payload))
    return {status:res.status,...payload}
  }
  const group = '/documents/Quality Inspection Parameter Group'
  const parameter = '/documents/Quality Inspection Parameter'
  const template = '/documents/Quality Feedback Template'
  const make = (path,fields,status=201,extra={}) => call('POST',path,status,{body:{fields},...extra})
  let groupId,paramId

  await t.test('registry, sanitized metadata, scoped discovery and deny by default',async () => {
    assert.equal(registry.manifest.length,875)
    assert.equal(registry.registered.size,22)
    const second = await compileModels(db.connection,registry)
    assert.equal(second.models.get('Quality Feedback Template'),compiled.models.get('Quality Feedback Template'))
    assert.throws(() => buildRegistry(raw,[{name:'User',fields:[]}]))
    assert.throws(() => buildRegistry(raw,[{name:'Quality Feedback Template',fields:['missing']}]))
    const meta = (await call('GET','/metadata/doctypes/Quality Feedback Template',200)).data
    assert(meta.layout.some(f=>f.type==='Section Break'))
    assert.equal(meta.fields.find(f=>f.name==='parameters').child.fields[0].name,'parameter')
    assert.equal(meta.version,registry.version)
    assert.equal((await call('GET','/metadata/doctypes',200)).data.length,22)
    assert((await call('GET','/metadata/modules',200)).data.includes('Stock'))
    for(const name of ['User','Company','Quality Feedback Template Parameter','Sales Invoice']) await make('/documents/'+name,{},404)
    await call('GET',group,401,{auth:null})
    await call('GET',group,403,{scope:'a'.repeat(24)})
  })

  await t.test('creates and validates fields, denies mass assignment and duplicate names',async () => {
    const created = (await make(group,{group_name:'Dimensions'})).data
    groupId = created.id
    assert.equal(created.name,'Dimensions')
    assert.equal(created.lifecycle,'Draft')
    assert.equal(created.version,1)
    await make(group,{},422)
    await make(group,{group_name:1},422)
    await make(group,{group_name:'X',lifecycle:'Submitted'},422)
    await call('POST',group,422,{body:{fields:{group_name:'X'},owner:user.id}})
    await make(group,JSON.parse('{"group_name":"X","__proto__":{"a":1}}'),422)
    const duplicate = await Promise.all([make(group,{group_name:'Repeat'},0),make(group,{group_name:'Repeat'},0)])
    assert.deepEqual(duplicate.map(r=>r.status).sort(),[201,409])
    await make(group,{group_name:'Dimensions'},409)
    assert.equal((await call('GET',group+'/'+groupId,200)).data.owner,user.id)
  })

  await t.test('validated links, options, related lookup, scoped deletion guards',async () => {
    const fields = {parameter:'Length',parameter_group:groupId,description:'Private note'}
    paramId = (await make(parameter,fields)).data.id
    await make(parameter,{...fields,parameter:'Bad',parameter_group:'a'.repeat(24)},422)
    await make(parameter,fields,422,{scope:other.id})
    await call('GET',parameter+'/'+paramId,404,{scope:other.id})
    await call('DELETE',group+'/'+groupId,409,{version:1})
    assert.equal((await call('GET',parameter+'/'+paramId+'/relations',200)).data[0].id,groupId)
    assert.equal((await call('GET',group+'/options?search=Dim',200)).data[0].name,'Dimensions')
  })

  await t.test('role and field access apply to metadata, projection and writes',async () => {
    const resource = 'inspection-parameter'
    const permissions = await db.models.Permission.find({resource,action:{$in:['read','update']}})
    const role = await db.models.Role.create({key:'reviewer',name:'Reviewer',permissions:permissions.map(p=>p._id)})
    await db.models.User.create({email:'reviewer@example.com',name:'Reviewer',passwordHash:user.passwordHash,
      memberships:[{company,roles:[role._id]}]})
    const auth = await login('reviewer@example.com')
    const item = (await call('GET',parameter+'/'+paramId,200,{auth})).data
    assert.deepEqual(Object.keys(item.fields),['parameter'])
    const meta = (await call('GET','/metadata/doctypes/Quality Inspection Parameter',200,{auth})).data
    assert(!meta.fields.some(f=>f.name==='description'))
    await call('PATCH',parameter+'/'+paramId,422,{auth,version:1,body:{fields:{description:'blocked'}}})
    await call('GET',parameter+'?fields=description',422,{auth})
    await call('GET',group,403,{auth})
    await call('DELETE',parameter+'/'+paramId,403,{auth,version:1})
  })

  await t.test('bounded pagination, equality filters, date ranges, selection and sort',async () => {
    const page = await call('GET',group+'?limit=1&sort=-name&fields=group_name',200)
    assert.equal(page.data[0].name,'Repeat')
    assert.equal((await call('GET',group+'?limit=1&sort=-name&cursor='+page.meta.nextCursor,200)).data[0].id,groupId)
    assert.equal((await call('GET',group+'?filter=group_name&value=Dimensions&from=2000-01-01',200)).data.length,1)
    assert.equal((await call('GET',group+'?to=2000-01-01',200)).data.length,0)
    for(const q of ['limit=101','filter=owner&value=x','sort=owner','value[$ne]=a','cursor=invalid']) await call('GET',group+'?'+q,422)
  })

  await t.test('bounded embedded children retain identity on reorder and reject foreign row IDs',async () => {
    const create = {template:'Feedback',parameters:[{parameter:'Speed'},{parameter:'Clarity'}]}
    const original = (await make(template,create)).data
    const path = template+'/'+original.id
    const [first,second] = original.fields.parameters
    await call('PATCH',path,422,{version:1,body:{fields:{parameters:[{rowId:'a'.repeat(24),parameter:'Other'}]}}})
    await call('PATCH',path,422,{version:1,body:{fields:{parameters:[{},{}]}}})
    await call('PATCH',path,422,{version:1,body:{fields:{parameters:[first,first]}}})
    await call('PATCH',path,422,{version:1,body:{fields:{parameters:[first,{parameter:'Speed'}]}}})
    const changed = await call('PATCH',path,200,{version:1,body:{fields:{parameters:[second,first,{parameter:'Value'}]}}})
    assert.deepEqual(changed.data.fields.parameters.slice(0,2),[second,first])
    const removed = await call('PATCH',path,200,{version:2,body:{fields:{parameters:[first]}}})
    assert.equal(removed.data.fields.parameters.length,1)
  })

  await t.test('atomic versions, deletes and audit events omit submitted values',async () => {
    const path = parameter+'/'+paramId
    const patch = {body:{fields:{description:'Audit sentinel'}},version:1}
    const writes = await Promise.all([call('PATCH',path,0,patch),call('PATCH',path,0,patch)])
    assert.deepEqual(writes.map(r=>r.status).sort(),[200,412])
    await call('PATCH',path,428,{body:{fields:{description:'other'}}})
    await call('DELETE',path,412,{version:1})
    await call('DELETE',path,204,{version:2})
    await call('DELETE',group+'/'+groupId,204,{version:1})
    const audit = await db.models.AuditLog.find({subject:paramId}).lean()
    assert(['create','update','delete'].every(action => audit.some(event=>event.action==='document.'+action)))
    assert(!JSON.stringify(audit).includes('Audit sentinel'))
    assert(audit.every(event=>event.actor && event.requestId && event.doctype))
  })

  await t.test('atomic prefix sequences and explicit prompted names',async () => {
    const spec = {name:'Naming test',naming:{kind:'series',prefix:'TEST-',digits:5}}
    const names = await Promise.all(Array.from({length:8},()=>documentName(spec,{}, {},company,compiled.sequence)))
    assert.equal(new Set(names).size,8)
    assert(names.includes('TEST-00001'))
    assert.equal(await documentName({...spec,naming:{kind:'prompt'}},{name:'My master'},{}),'My master')
  })

  await t.test('a racing link and delete cannot leave an orphan',async () => {
    const target = (await make(group,{group_name:'Race group'})).data
    const [add,remove] = await Promise.all([
      make(parameter,{parameter:'Race parameter',parameter_group:target.id},0),
      call('DELETE',group+'/'+target.id,0,{version:1}),
    ])
    if (add.status === 201) {
      assert.equal(remove.status,409)
      await call('GET',group+'/'+target.id,200)
    } else {
      assert.equal(remove.status,204)
      assert.equal(add.status,422)
    }
  })
})
