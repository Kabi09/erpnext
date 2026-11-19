import { Types } from 'mongoose'
import { createTokens } from './tokens.js'
import { matchesPassword } from './passwords.js'
import { authenticationError } from '../utils/http.js'

export function createAuthentication(config, { models, connection }) {
  const { User, Company, RefreshSession, AuditLog } = models
  const tokens = createTokens(config)
  const active = () => ({ revokedAt: null, expiresAt: { $gt: new Date() } })
  const writeAudit = (action, id, user, requestId, session) =>
    AuditLog.create([{ action, actor: user, subject: id, requestId }], { session })

  async function present(user) {
    const companies = await Company.find({ _id: { $in: user.memberships.map(entry => entry.company) }, active: true })
      .select('code name').sort({ name: 1, _id: 1 }).lean()
    return { id: String(user._id), name: user.name, email: user.email,
      companies: companies.map(company => ({ id: String(company._id), code: company.code, name: company.name })) }
  }

  async function login({ email, password }, requestId) {
    const user = await User.findOne({ email }).select('+passwordHash').lean()
    if (!await matchesPassword(password, user?.passwordHash) || user?.status !== 'active') {
      await writeAudit('auth.login.denied', user?._id, user?._id, requestId)
      throw authenticationError()
    }
    const profile = await present(user)
    const id = new Types.ObjectId()
    const refreshToken = tokens.issueRefresh(id)
    await connection.transaction(async session => {
      await RefreshSession.create([{
        _id: id, user: user._id, tokenDigest: tokens.digestRefresh(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshSeconds * 1000),
      }], { session })
      await writeAudit('auth.login', id, user._id, requestId, session)
    })
    return { refreshToken, accessToken: tokens.issueAccess(user._id, id), user: profile, maxAge: config.refreshSeconds * 1000 }
  }

  async function refresh(token, requestId) {
    const id = tokens.readRefresh(token)
    if (!id) throw authenticationError()
    const refreshToken = tokens.issueRefresh(id)
    const result = await connection.transaction(async session => {
      const current = await RefreshSession.findOne({ _id: id, ...active() }).select('+tokenDigest').session(session).lean()
      if (!current) return null
      const user = await User.findOne({ _id: current.user, status: 'active' }).session(session).lean()
      if (!user || current.tokenDigest !== tokens.digestRefresh(token)) {
        await RefreshSession.updateOne({ _id: id }, { revokedAt: new Date() }, { session })
        await writeAudit(user ? 'auth.refresh.reuse' : 'auth.session.disabled', id, current.user, requestId, session)
        return null
      }
      await RefreshSession.updateOne({ _id: id, tokenDigest: current.tokenDigest },
        { tokenDigest: tokens.digestRefresh(refreshToken) }, { session })
      await writeAudit('auth.refresh', id, user._id, requestId, session)
      return { userId: user._id, expiresAt: current.expiresAt }
    })
    if (!result) throw authenticationError()
    return { refreshToken, accessToken: tokens.issueAccess(result.userId, id),
      maxAge: Math.max(0, result.expiresAt.getTime() - Date.now()) }
  }

  async function logout(cookie, access, requestId) {
    const id = tokens.readRefresh(cookie) || tokens.readAccess(access)?.sid
    if (!id) return
    await connection.transaction(async session => {
      const existing = await RefreshSession.findOneAndUpdate({ _id: id, ...active() },
        { revokedAt: new Date() }, { session }).lean()
      if (existing) await writeAudit('auth.logout', id, existing.user, requestId, session)
    })
  }

  async function authenticate(access) {
    const claims = tokens.readAccess(access)
    if (!claims) throw authenticationError()
    const [session, user] = await Promise.all([
      RefreshSession.exists({ _id: claims.sid, user: claims.sub, ...active() }),
      User.findOne({ _id: claims.sub, status: 'active' }).lean(),
    ])
    if (!session || !user) throw authenticationError()
    return user
  }

  return { login, refresh, logout, authenticate, present }
}
