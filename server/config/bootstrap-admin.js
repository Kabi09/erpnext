import { pathToFileURL } from 'node:url'
import { seedDocumentGrants } from '../engine/policies.js'
import { readConfig } from './environment.js'
import { openDatabase } from './database.js'
import { hashPassword } from '../services/passwords.js'
import { bootstrapInput, validate } from '../validators/requests.js'

export async function bootstrapAdmin(database, env) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, COMPANY_CODE, COMPANY_NAME } = validate(bootstrapInput, env)
  const { User, Role, Permission, Company, AuditLog } = database.models
  const passwordHash = await hashPassword(ADMIN_PASSWORD)
  return database.connection.transaction(async session => {
    if (await AuditLog.exists({ action: 'bootstrap.admin' }).session(session)) return false
    const [company] = await Company.create([{ code: COMPANY_CODE, name: COMPANY_NAME }], { session })
    const [permission] = await Permission.create([{ resource: 'company', action: 'read' }], { session })
    const [role] = await Role.create([{ key: 'company-administrator', name: 'Company Administrator',
      permissions: [permission._id] }], { session })
    const [user] = await User.create([{ email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash,
      memberships: [{ company: company._id, roles: [role._id] }] }], { session })
    await seedDocumentGrants(database.models, role, session)
    await AuditLog.create([{ action: 'bootstrap.admin', actor: user._id,
      subject: user._id, company: company._id }], { session })
    return true
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let database
  try {
    const config = readConfig()
    database = await openDatabase(config.mongoUri)
    const created = await bootstrapAdmin(database, process.env)
    console.log(created ? 'Initial administrator and company created.' : 'Administrator setup was already completed.')
  } catch (error) {
    console.error(error.code === 'INVALID_INPUT'
      ? 'Invalid administrator setup fields: ' + error.details.map(item => item.field).join(', ')
      : 'Administrator setup failed (' + error.name + '). Check the environment and replica set.')
    process.exitCode = 1
  } finally {
    await database?.close()
  }
}
