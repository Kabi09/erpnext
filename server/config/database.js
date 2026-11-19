import mongoose from 'mongoose'
import { createModels } from '../models/identity.js'

export async function checkDatabase(connection) {
  try {
    if (connection.readyState !== 1) return false
    const hello = await connection.db.admin().command({ hello: 1 }, { signal: AbortSignal.timeout(2000) })
    return Boolean(hello.isWritablePrimary && (hello.setName || hello.msg === 'isdbgrid') &&
      hello.logicalSessionTimeoutMinutes)
  } catch {
    return false
  }
}

export async function openDatabase(uri) {
  const connection = mongoose.createConnection(uri, {
    maxPoolSize: 20, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 8000,
    autoIndex: false, autoCreate: false, bufferCommands: false,
  })
  try {
    await connection.asPromise()
    if (!await checkDatabase(connection)) throw new Error('A writable MongoDB replica set or compatible cluster is required')
    const models = createModels(connection)
    for (const model of Object.values(models)) await model.createIndexes()
    return { connection, models, ready: () => checkDatabase(connection), close: () => connection.close() }
  } catch (error) {
    await connection.close()
    throw error
  }
}
