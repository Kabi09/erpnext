import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { startReplica } from './support/replica.js'
import { openDatabase } from '../config/database.js'
import { bootstrapAdmin } from '../config/bootstrap-admin.js'
import { readConfig } from '../config/environment.js'
import { loadReferenceMetadata } from '../engine/reference-metadata.js'
import { createApp } from '../app.js'

test('Phase 5 Navigation, Dynamic Workspaces, Tree Engine, Reports and Coverage', async t => {
  const replica = await startReplica()
  let db, server
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    await db?.close()
    await replica.close()
  })

  db = await openDatabase(replica.uri)
  const raw = await loadReferenceMetadata()
  const config = readConfig({
    NODE_ENV: 'test',
    APP_ORIGINS: 'http://localhost:5173',
    MONGODB_URI: replica.uri,
    JWT_SECRET: randomBytes(32).toString('base64url'),
  })

  const password = randomBytes(20).toString('hex')
  await bootstrapAdmin(db, {
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_NAME: 'System Admin',
    ADMIN_PASSWORD: password,
    COMPANY_CODE: 'HQ',
    COMPANY_NAME: 'HQ Manufacturing',
  })

  const adminUser = await db.models.User.findOne({ email: 'admin@example.com' }).select('+passwordHash')
  const companyId = String(adminUser.memberships[0].company)

  // Create standard user without admin role for permission checks
  const permissions = await db.models.Permission.find({ resource: 'Territory', action: { $in: ['read', 'create', 'update', 'delete'] } })
  const employeeRole = await db.models.Role.create({ key: 'employee', name: 'Employee', permissions: permissions.map(p => p._id) })
  await db.models.User.create({
    email: 'operator@example.com',
    name: 'Operator',
    passwordHash: adminUser.passwordHash,
    memberships: [{
      company: adminUser.memberships[0].company,
      roles: [employeeRole._id],
    }],
  })

  const app = createApp(config, { database: db, metadata: raw, logger: false })
  await app.locals.documentsReady
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const root = 'http://127.0.0.1:' + server.address().port + '/api/v1'

  async function login(email, pwd) {
    const res = await fetch(root + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CRYO-Request': '1' },
      body: JSON.stringify({ email, password: pwd }),
    })
    const data = await res.json()
    return data.data.accessToken
  }

  const adminToken = await login(adminUser.email, password)

  async function call(method, path, status, { body, version, token = adminToken, scope = companyId } = {}) {
    const res = await fetch(root + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Id': scope,
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(version && { 'If-Match': '"' + version + '"' }),
      },
      body: body && JSON.stringify(body),
    })
    const payload = res.status === 204 ? null : await res.json()
    if (status) {
      assert.equal(res.status, status, `${method} ${path} -> ${res.status}: ${JSON.stringify(payload)}`)
    }
    return { status: res.status, ...payload }
  }

  await t.test('1. Navigation catalog covers all 38 modules and builds search index', async () => {
    const nav = await call('GET', '/metadata/navigation', 200)
    assert.ok(nav.data.modules, 'modules catalog exists')
    assert.equal(nav.data.modules.length, 38, 'all 38 modules are cataloged')
    assert.ok(nav.data.searchIndex.length > 500, 'search index contains hundreds of searchable items')
    assert.equal(nav.data.canViewCoverage, true, 'admin can view coverage')
    assert.ok(nav.data.coverage, 'coverage summary included for admin')
    assert.equal(nav.data.coverage.modules.discovered, 38)
    assert.equal(nav.data.coverage.workspaces.discovered, 24)
    assert.equal(nav.data.coverage.doctypes.registered, 22)
  })

  await t.test('2. Dynamic Workspace definitions for discovered and synthesized modules', async () => {
    const wsList = await call('GET', '/metadata/workspaces', 200)
    assert.equal(wsList.data.length, 24, '24 standard workspaces returned')

    const stockWs = await call('GET', '/metadata/workspaces/Stock', 200)
    assert.equal(stockWs.data.module, 'Stock')
    assert.ok(stockWs.data.cards.length > 0, 'stock workspace has document cards')

    const homeWs = await call('GET', '/metadata/workspaces/Home', 200)
    assert.ok(homeWs.data.shortcuts.length > 0, 'home workspace has shortcuts')

    const qmWs = await call('GET', '/metadata/workspaces/Quality Management', 200)
    assert.equal(qmWs.data.module, 'Quality Management')
  })

  await t.test('3. Tree Master Engine: hierarchy, circular check, and child deletion guards', async () => {
    // 3a. Initial tree root query
    const initialTree = await call('GET', '/documents/Territory/tree', 200)
    assert.ok(Array.isArray(initialTree.data))

    // 3b. Create root group
    const rootRes = await call('POST', '/documents/Territory', 201, {
      body: {
        fields: {
          territory_name: 'Americas Group',
          is_group: true,
        },
      },
    })
    const rootId = rootRes.data.id
    const rootName = rootRes.data.name
    let rootVersion = rootRes.data.version
    assert.equal(rootRes.data.fields.is_group, true)

    // 3c. Create child group under Americas Group
    const childRes = await call('POST', '/documents/Territory', 201, {
      body: {
        fields: {
          territory_name: 'North America',
          parent_territory: rootId,
          is_group: true,
        },
      },
    })
    const childId = childRes.data.id
    const childName = childRes.data.name
    let childVersion = childRes.data.version
    assert.equal(childRes.data.fields.parent_territory, rootId)

    // 3d. Create leaf node under North America
    const leafRes = await call('POST', '/documents/Territory', 201, {
      body: {
        fields: {
          territory_name: 'United States',
          parent_territory: childId,
          is_group: false,
        },
      },
    })
    const leafId = leafRes.data.id
    const leafVersion = leafRes.data.version

    // 3e. Tree queries
    const roots = await call('GET', '/documents/Territory/tree', 200)
    assert.ok(roots.data.some(r => r.name === 'Americas Group'))
    assert.ok(roots.data.some(c => c.name === 'North America' && c.parent === rootId))

    // 3f. Self-parent rejection
    const selfParentRes = await call('PATCH', `/documents/Territory/${rootId}`, 422, {
      version: rootVersion,
      body: {
        fields: {
          parent_territory: rootId,
        },
      },
    })
    assert.match(selfParentRes.error.message, /cannot be its own parent/i)

    // 3g. Circular link rejection (cannot make Americas Group a child of North America)
    const circularRes = await call('PATCH', `/documents/Territory/${rootId}`, 422, {
      version: rootVersion,
      body: {
        fields: {
          parent_territory: childId,
        },
      },
    })
    assert.match(circularRes.error.message, /circular/i)

    // 3h. Child deletion guard: cannot delete North America while United States exists
    const deleteChildGuardRes = await call('DELETE', `/documents/Territory/${childId}`, 409, {
      version: childVersion,
    })
    assert.match(deleteChildGuardRes.error.message, /child node/i)

    // 3i. Deleting leaf succeeds
    await call('DELETE', `/documents/Territory/${leafId}`, 204, { version: leafVersion })

    // 3j. Deleting child group now succeeds
    await call('DELETE', `/documents/Territory/${childId}`, 204, { version: childVersion })

    // 3k. Deleting root now succeeds
    await call('DELETE', `/documents/Territory/${rootId}`, 204, { version: rootVersion })
  })

  await t.test('4. Reports Registry and Execution', async () => {
    // 4a. List reports
    const repList = await call('GET', '/reports', 200)
    assert.equal(repList.data.length, 211, 'all 211 reports cataloged')
    const implemented = repList.data.filter(r => r.status === 'Implemented')
    assert.equal(implemented.length, 4, '4 master summary reports implemented')

    // 4b. Run implemented report: Item Summary
    const itemSummary = await call('POST', '/reports/Item%20Summary/run', 200, {
      body: { filters: {} },
    })
    assert.equal(itemSummary.data.status, 'Completed')
    assert.ok(Array.isArray(itemSummary.data.columns))
    assert.ok(itemSummary.data.columns.some(c => c.field === 'item_code'))

    // 4c. Run implemented report: Quality Inspection Summary
    const qiSummary = await call('POST', '/reports/Quality%20Inspection%20Summary/run', 200, {
      body: { filters: {} },
    })
    assert.equal(qiSummary.data.status, 'Completed')
    assert.ok(qiSummary.data.columns.some(c => c.field === 'parameter'))

    // 4d. Run pending report: General Ledger
    const glReport = await call('POST', '/reports/General%20Ledger/run', 200, {
      body: { filters: {} },
    })
    assert.equal(glReport.data.isPending, true)
    assert.ok(glReport.data.requiredService)
  })

  await t.test('5. Custom Pages API and Implementation Coverage Access Control', async () => {
    // 5a. Pages catalog
    const pages = await call('GET', '/pages', 200)
    assert.equal(pages.data.length, 36, '35 custom pages + coverage cataloged')

    const covPage = await call('GET', '/pages/coverage', 200)
    assert.equal(covPage.data.name, 'coverage')
    assert.equal(covPage.data.status, 'Implemented')

    // 5b. Admin access to coverage matrix
    const coverage = await call('GET', '/metadata/coverage', 200)
    assert.equal(coverage.data.summary.modules.discovered, 38)
    assert.equal(coverage.data.summary.doctypes.registered, 22)
    assert.equal(coverage.data.manifest.length, 875)
    assert.ok(coverage.data.reports.length >= 208)
    assert.equal(coverage.data.pages.length, 36)

    // 5c. Non-admin operator cannot access coverage matrix (403 Forbidden)
    const operatorToken = await login('operator@example.com', password)
    await call('GET', '/metadata/coverage', 403, { token: operatorToken })
  })
})
