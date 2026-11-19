import { forbidden } from '../utils/http.js'
import { permissionActions } from '../models/identity.js'

export const bearer = req => /^Bearer ([^ ]+)$/i.exec(req.get('Authorization') || '')?.[1]

export const requireIdentity = authentication => async (req, _res, next) => {
  req.user = await authentication.authenticate(bearer(req))
  next()
}

export function requireCompanyPermission(models, resource, action) {
  if (!permissionActions.includes(action)) throw new Error('Unsupported permission action')
  return async (req, _res, next) => {
    const companyId = req.params.companyId.toLowerCase()
    const access = await companyGrants(models,req.user,companyId)
    if (!access?.grants.has(resource + ':' + action)) throw forbidden()
    req.company = access.company
    next()
  }
}

export async function companyGrants(models,user,companyId) {
  const membership = user.memberships.find(entry => String(entry.company) === companyId.toLowerCase())
  if (!membership?.roles.length) return null
  const [company,roles] = await Promise.all([
    models.Company.findOne({ _id:companyId,active:true }).select('code name').lean(),
    models.Role.find({ _id:{ $in:membership.roles } }).select('permissions key').lean(),
  ])
  if (!company) return null
  const permissions = await models.Permission.find({ _id:{ $in:roles.flatMap(role => role.permissions) } }).lean()
  const isAdmin = roles.some(r => r.key === 'company-administrator' || r.key === 'system-manager')
  return { company, grants:new Set(permissions.map(p => p.resource + ':' + p.action)), roles, isAdmin }
}
