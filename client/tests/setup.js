import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { bootstrapAdmin } from '../../server/config/bootstrap-admin.js'
import { openDatabase } from '../../server/config/database.js'
import { startReplica } from '../../server/tests/support/replica.js'

export default async function setup() {
  const replica = await startReplica()
  let server
  const close = async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, 'exit')
      server.kill()
      await exited
    }
    await replica.close()
  }
  try {
    const credentials = { ADMIN_EMAIL: 'browser@example.com', ADMIN_PASSWORD: randomBytes(18).toString('base64url'),
      ADMIN_NAME: 'Workspace Tester', COMPANY_CODE: 'E2E', COMPANY_NAME: 'Browser Test Company' }
    const database = await openDatabase(replica.uri)
    try {
      await bootstrapAdmin(database, credentials)
      const { User, Company } = database.models
      const owner = await User.findOne({ email: credentials.ADMIN_EMAIL }).select('+passwordHash')
      const second = await Company.create({ code: 'E2E-2', name: 'Second Test Company' })
      owner.memberships.push({ company: second._id, roles: owner.memberships[0].roles })
      await owner.save()
      await User.create({ email: 'unassigned@example.com', name: 'Unassigned Tester', passwordHash: owner.passwordHash })
    } finally {
      await database.close()
    }
    process.env.CRYO_E2E_EMAIL = credentials.ADMIN_EMAIL
    process.env.CRYO_E2E_PASSWORD = credentials.ADMIN_PASSWORD
    server = spawn(process.execPath, [fileURLToPath(new URL('../../server/server.js', import.meta.url))], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, NODE_ENV: 'test', PORT: '4174', HOST: '127.0.0.1', MONGODB_URI: replica.uri,
        APP_ORIGINS: 'http://127.0.0.1:4173', JWT_SECRET: randomBytes(32).toString('base64url') },
    })
    server.stdout.resume()
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null) throw new Error('UI test API exited during startup')
      const response = await fetch('http://127.0.0.1:4174/api/v1/ready').catch(() => null)
      if (response?.ok) return close
      await delay(250)
    }
    throw new Error('UI test API never became ready')
  } catch (error) {
    await close()
    throw error
  }
}
