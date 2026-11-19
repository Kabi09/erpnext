import { openDatabase } from './database.js'
import { readConfig } from './environment.js'
import { seedDocumentGrants } from '../engine/policies.js'
const database = await openDatabase(readConfig().mongoUri)
try {
  await database.connection.transaction(async session => {
    const role = await database.models.Role.findOne({ key:'company-administrator' }).session(session)
    if (!role) throw new Error('Bootstrap the administrator first.')
    await seedDocumentGrants(database.models, role, session)
    await database.models.AuditLog.create([{ action:'document.grants.seed',subject:role._id }],{ session })
  })
} finally { await database.close() }
