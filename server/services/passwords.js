import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const algorithm = 'scrypt-v1'
const dummyHash = [algorithm, Buffer.alloc(16).toString('base64url'), Buffer.alloc(64).toString('base64url')].join('.')

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, 64, parameters)
  return [algorithm, salt.toString('base64url'), key.toString('base64url')].join('.')
}

export async function matchesPassword(password, stored) {
  const [version, salt, hash] = (stored || dummyHash).split('.')
  const expected = Buffer.from(hash || '', 'base64url')
  if (version !== algorithm || expected.length !== 64) return false
  const actual = await derive(password, Buffer.from(salt, 'base64url'), expected.length, parameters)
  return Boolean(stored && timingSafeEqual(actual, expected))
}
