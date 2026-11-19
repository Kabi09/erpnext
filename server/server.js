import { once } from 'node:events'
import { createApp } from './app.js'
import { openDatabase } from './config/database.js'
import { readConfig } from './config/environment.js'
import { loadReferenceMetadata } from './engine/reference-metadata.js'

async function main() {
  let database
  try {
    const config = readConfig()
    const metadata = await loadReferenceMetadata()
    database = await openDatabase(config.mongoUri)
    const app = createApp(config, { database, metadata })
    await app.locals.documentsReady
    const server = app.listen(config.port, config.host)
    await once(server, 'listening')
    console.log('CRYO API listening on ' + config.host + ':' + config.port)

    let shuttingDown = false
    const shutdown = () => {
      if (shuttingDown) return
      shuttingDown = true
      const timeout = setTimeout(() => server.closeAllConnections(), 8000)
      timeout.unref()
      server.close(async error => {
        clearTimeout(timeout)
        try {
          await database.close()
          if (error) process.exitCode = 1
        } catch {
          process.exitCode = 1
        }
      })
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    await database?.close()
    console.error('CRYO API startup failed (' + error.name + '). Check environment, metadata and the MongoDB replica set.')
    if (error.message.startsWith('Invalid environment fields:')) console.error(error.message)
    process.exitCode = 1
  }
}

await main()
