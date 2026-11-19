import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../app.js'
import { bootstrapAdmin } from '../config/bootstrap-admin.js'
import { openDatabase } from '../config/database.js'
import { readConfig } from '../config/environment.js'
import { loadReferenceMetadata } from '../engine/reference-metadata.js'
import { createTokens } from '../services/tokens.js'
import { startReplica } from './support/replica.js'

test('configuration rejects secrets and production origins that violate policy', () => {
  const config = { MONGODB_URI: 'mongodb://localhost/cryo', APP_ORIGINS: 'http://localhost:5173', JWT_SECRET: 'short' }
  assert.throws(() => readConfig(config), /JWT_SECRET/)
  assert.throws(() => readConfig({ ...config, APP_ORIGINS: 'https://[broken' }), /APP_ORIGINS/)
  assert.throws(() => readConfig({ ...config, JWT_SECRET: randomBytes(32).toString('base64url'), NODE_ENV: 'production' }), /HTTPS/)
})

test('access token validation rejects an expired signed token', () => {
  const tokens = createTokens({ jwtSecret: randomBytes(32).toString('base64url'), accessSeconds: -1 })
  const access = tokens.issueAccess('a'.repeat(24), 'b'.repeat(24))
  assert.equal(tokens.readAccess(access), null)
})

test('real replica set, bootstrap and HTTP foundation', async t => {
  const replica = await startReplica()
  let database
  let server
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    await database?.close()
    await replica.close()
  })

  const config = readConfig({ NODE_ENV: 'test', APP_ORIGINS: 'http://localhost:5173',
    MONGODB_URI: replica.uri, JWT_SECRET: randomBytes(32).toString('base64url') })
  const metadata = await loadReferenceMetadata()
  database = await openDatabase(config.mongoUri)
  const { models } = database
  const env = { ADMIN_EMAIL: 'owner@example.com', ADMIN_PASSWORD: randomBytes(18).toString('base64url'),
    ADMIN_NAME: 'Test Owner', COMPANY_CODE: 'NORTH', COMPANY_NAME: 'North Division' }

  await t.test('validates pinned metadata and preserves source IDs', async () => {
    assert.equal(metadata.schemaVersion, 1)
    assert.match(metadata.checksum, /^[a-f\d]{64}$/)
    const item = metadata.catalogs.doctypes.find(entry => entry.name === 'Material Request')
    assert.equal(metadata.getDocType(item.id).source, item.source)
    await assert.rejects(loadReferenceMetadata(new URL('./missing/', import.meta.url)), /Invalid or missing/)
  })

  await t.test('bootstraps once and rolls back a failed transaction', async () => {
    assert.equal(await bootstrapAdmin(database, env), true)
    assert.equal(await bootstrapAdmin(database, env), false)
    await assert.rejects(database.connection.transaction(async session => {
      await models.Company.create([{ code: 'ROLLBACK', name: 'Rolled back' }], { session })
      throw new Error('abort verification')
    }), /abort verification/)
    assert.equal(await models.Company.countDocuments({ code: 'ROLLBACK' }), 0)
    const indexes = await models.RefreshSession.collection.indexes()
    assert(indexes.some(index => index.expireAfterSeconds === 0 && index.key.expiresAt === 1))
  })

  const owner = await models.User.findOne({ email: env.ADMIN_EMAIL }).select('+passwordHash')
  const companyId = String(owner.memberships[0].company)
  const other = await models.Company.create({ code: 'OTHER', name: 'Other Division' })
  const blocked = await models.User.create({ email: 'disabled@example.com', name: 'Disabled', passwordHash: owner.passwordHash,
    status: 'disabled', memberships: owner.memberships.toObject() })
  const member = await models.User.create({ email: 'member@example.com', name: 'Member', passwordHash: owner.passwordHash,
    memberships: [{ company: companyId, roles: [] }] })
  const app = createApp(config, { database, metadata, logger: false })
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = 'http://127.0.0.1:' + server.address().port + '/api/v1'
  const request = (path, options) => fetch(url + path, options)
  const post = (path, { body, token, cookie, origin, trusted = true } = {}) =>
    request(path, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(trusted && { 'X-CRYO-Request': '1' }),
        ...(token && { Authorization: 'Bearer ' + token }), ...(cookie && { Cookie: cookie }), ...(origin && { Origin: origin }) },
      body: body && JSON.stringify(body) })
  const login = (email = env.ADMIN_EMAIL, password = env.ADMIN_PASSWORD) => post('/auth/login', { body: { email, password } })
  const bearer = token => ({ headers: { Authorization: 'Bearer ' + token } })
  const readCookie = response => response.headers.get('set-cookie').split(';')[0]

  await t.test('healthy replica reports ready and CORS and CSRF guards reject invalid origins and calls', async () => {
    const response = await request('/health')
    assert.equal(response.status, 200)
    assert.equal((await response.json()).meta.requestId, response.headers.get('x-request-id'))
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal((await request('/ready')).status, 200)
    assert.equal((await post('/auth/logout', { trusted: false })).status, 403)
    assert.equal((await post('/auth/logout', { origin: 'http://untrusted.example' })).status, 403)
    assert.equal((await post('/auth/login', { body: {} })).status, 422)
  })

  await t.test('rejects bad credentials and disabled users with a consistent response', async () => {
    for (const result of [await login(env.ADMIN_EMAIL, 'wrong'), await login(blocked.email)]) {
      assert.equal(result.status, 401)
      assert.equal((await result.json()).error.code, 'AUTHENTICATION_REQUIRED')
    }
  })

  await t.test('login, identity, company scope, role permissions and live revocation', async () => {
    assert.equal((await request('/companies/' + companyId + '/access')).status, 401)
    const response = await login()
    assert.equal(response.status, 200)
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/i)
    const { user, accessToken } = (await response.json()).data
    assert.equal(user.companies[0].id, companyId)
    assert(!('passwordHash' in user))
    assert.equal((await request('/auth/me', bearer(accessToken))).status, 200)
    assert.equal((await request('/companies/' + companyId + '/access', bearer(accessToken))).status, 200)
    assert.equal((await request('/companies/' + other.id + '/access', bearer(accessToken))).status, 403)
    const memberLogin = await login(member.email)
    const memberToken = (await memberLogin.json()).data.accessToken
    assert.equal((await request('/companies/' + companyId + '/access', bearer(memberToken))).status, 403)
    await models.User.updateOne({ _id: member._id }, { status: 'disabled' })
    assert.equal((await request('/auth/me', bearer(memberToken))).status, 401)
  })

  await t.test('rotates refresh tokens, rejects replay and revokes the token family', async () => {
    const response = await login()
    const old = readCookie(response)
    const refreshed = await post('/auth/refresh', { cookie: old })
    assert.equal(refreshed.status, 200)
    const current = readCookie(refreshed)
    assert.notEqual(current, old)
    const { accessToken } = (await refreshed.json()).data
    const session = await models.RefreshSession.findById(current.split('=')[1].split('.')[0]).select('+tokenDigest')
    assert.match(session.tokenDigest, /^[a-f\d]{64}$/)
    assert(!current.includes(session.tokenDigest))
    assert.equal((await post('/auth/refresh', { cookie: old })).status, 401)
    assert.equal((await post('/auth/refresh', { cookie: current })).status, 401)
    assert.equal((await request('/auth/me', bearer(accessToken))).status, 401)
    assert.equal(await models.AuditLog.countDocuments({ action: 'auth.refresh.reuse' }), 1)
  })

  await t.test('logout clears cookies and immediately revokes bearer and refresh credentials', async () => {
    const response = await login()
    const cookie = readCookie(response)
    const { accessToken } = (await response.json()).data
    const result = await post('/auth/logout', { cookie, token: accessToken })
    assert.equal(result.status, 204)
    assert.match(result.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/)
    assert.equal((await request('/auth/me', bearer(accessToken))).status, 401)
    assert.equal((await post('/auth/refresh', { cookie })).status, 401)
    assert.equal((await post('/auth/logout', { token: accessToken })).status, 204)
  })

  await t.test('concurrent refresh requests result in at most one rotation and revoke the family', async () => {
    const response = await login()
    const cookie = readCookie(response)
    const attempts = await Promise.all([post('/auth/refresh', { cookie }), post('/auth/refresh', { cookie })])
    assert.deepEqual(attempts.map(result => result.status).sort(), [200, 401])
    const successful = attempts.find(result => result.ok)
    const { accessToken } = (await successful.json()).data
    assert.equal((await request('/auth/me', bearer(accessToken))).status, 401)
  })

  await t.test('malformed JSON and excessive login attempts use the API error envelope', async () => {
    const malformed = await request('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })
    assert.equal(malformed.status, 400)
    assert.equal((await malformed.json()).error.code, 'INVALID_JSON')
    let outcome
    for (let index = 0; index < 13; index++) {
      outcome = await post('/auth/login', { body: { email: 'limited@example.com', password: '' } })
    }
    assert.equal(outcome.status, 429)
    assert.equal((await outcome.json()).error.code, 'RATE_LIMITED')
  })

  await t.test('loss of the database changes readiness while liveness remains OK', async () => {
    await database.close()
    assert.equal((await request('/ready')).status, 503)
    assert.equal((await request('/health')).status, 200)
  })
})
