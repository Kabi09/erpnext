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
    const membership = req.user.memberships.find(entry => String(entry.company) === companyId)
    if (!membership?.roles.length) throw forbidden()
    const [company, permission] = await Promise.all([
      models.Company.findOne({ _id: companyId, active: true }).select('name code').lean(),
      models.Permission.findOne({ resource, action }).select('_id').lean(),
    ])
    if (!company || !permission ||
      !await models.Role.exists({ _id: { $in: membership.roles }, permissions: permission._id })) throw forbidden()
    req.company = company
    next()
  }
}
