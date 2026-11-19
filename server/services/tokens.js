import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

const issuer = 'cryo-erp'
const audience = 'cryo-erp-api'
const tokenPattern = /^([a-f\d]{24})\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/

export function createTokens(config) {
  const signRefresh = value => createHmac('sha256', config.jwtSecret).update('refresh-v1:').update(value).digest('base64url')
  return {
    issueAccess(user, session) {
      return jwt.sign({ sid: String(session) }, config.jwtSecret, {
        algorithm: 'HS256', issuer, audience, subject: String(user), expiresIn: config.accessSeconds, jwtid: randomUUID(),
      })
    },
    readAccess(value) {
      try {
        const claims = jwt.verify(value, config.jwtSecret, { algorithms: ['HS256'], issuer, audience })
        if (/^[a-f\d]{24}$/.test(claims?.sub) && /^[a-f\d]{24}$/.test(claims?.sid)) return claims
      } catch {
        return null
      }
      return null
    },
    issueRefresh(id) {
      const value = String(id) + '.' + randomBytes(32).toString('base64url')
      return value + '.' + signRefresh(value)
    },
    readRefresh(token) {
      const match = typeof token === 'string' && tokenPattern.exec(token)
      if (!match) return null
      const expected = signRefresh(match[1] + '.' + match[2])
      return timingSafeEqual(Buffer.from(expected), Buffer.from(match[3])) ? match[1] : null
    },
    digestRefresh(token) {
      return createHash('sha256').update(token).digest('hex')
    },
  }
}
