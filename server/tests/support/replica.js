import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createConnection, createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, dirname, basename } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const runFile = promisify(execFile)

export async function freePort() {
  const listener = createServer().listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const { port } = listener.address()
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
  return port
}

export async function startReplica() {
  const port = await freePort()
  const parent = tmpdir()
  const directory = await mkdtemp(join(parent, 'cryo-mongo-'))
  const processHandle = spawn(process.env.MONGOD_BINARY || 'mongod', [
    '--dbpath', directory, '--replSet', 'cryo-test', '--port', String(port), '--bind_ip', '127.0.0.1',
    '--logpath', join(directory, 'mongod.log'),
  ], { stdio: 'ignore', windowsHide: true })
  let failure
  processHandle.on('error', error => { failure = error })
  processHandle.on('exit', code => { failure ||= new Error('mongod exited with code ' + code) })
  const close = async () => {
    if (processHandle.pid && processHandle.exitCode === null && processHandle.signalCode === null) {
      const exited = once(processHandle, 'exit')
      processHandle.kill()
      await exited
    }
    if (dirname(directory) !== parent || !basename(directory).startsWith('cryo-mongo-')) throw new Error('Unexpected test database path')
    await rm(directory, { recursive: true, force: true, maxRetries: 4 })
  }
  const uri = 'mongodb://127.0.0.1:' + port + '/cryo_test?replicaSet=cryo-test&directConnection=true'
  async function waitFor(check) {
    const deadline = Date.now() + 30000
    do {
      if (failure) throw failure
      if (await check()) return
      await delay(150)
    } while (Date.now() < deadline)
    throw new Error('Temporary MongoDB replica did not become ready.')
  }

  try {
    await waitFor(() => new Promise(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port })
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => resolve(false))
    }))
    const script = fileURLToPath(new URL('../../config/init-replica.js', import.meta.url))
    await runFile(process.execPath, [script], { env: { ...process.env, MONGODB_URI: uri }, windowsHide: true })
    return { uri, close }
  } catch (error) {
    await close()
    throw error
  }
}
