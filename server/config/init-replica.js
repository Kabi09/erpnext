import mongoose from 'mongoose'
import { setTimeout as delay } from 'node:timers/promises'

const connectionString = process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27018/cryo_erp?replicaSet=cryo-rs&directConnection=true'
if (!URL.canParse(connectionString)) throw new Error('Invalid local replica URI.')
const uri = new URL(connectionString)
const setName = uri.searchParams.get('replicaSet')
if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' || !uri.port || !/^[a-z][a-z0-9-]{1,39}$/.test(setName || '') ||
    uri.username || uri.password) {
  throw new Error('Replica initialization requires an unauthenticated loopback URI with an explicit port and replicaSet.')
}

const client = new mongoose.mongo.MongoClient('mongodb://' + uri.host + '/?directConnection=true', {
  serverSelectionTimeoutMS: 3500, connectTimeoutMS: 3500, socketTimeoutMS: 3500,
})
try {
  const admin = client.db('admin')
  const hello = await admin.command({ hello: 1 })
  if (hello.setName && hello.setName !== setName) throw new Error('Replica set name differs from MONGODB_URI.')
  if (!hello.setName) {
    try {
      await admin.command({ replSetInitiate: { _id: setName, members: [{ _id: 0, host: 'localhost:' + uri.port }] } })
    } catch (error) {
      if (error.codeName !== 'AlreadyInitialized') throw error
    }
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const state = await admin.command({ hello: 1 })
    if (state.setName === setName && state.isWritablePrimary) break
    if (attempt === 39) throw new Error('Replica set did not elect a writable primary.')
    await delay(500)
  }
  console.log('Local replica set is ready.')
} finally {
  await client.close()
}
