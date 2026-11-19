import { loginInput, validate } from '../validators/requests.js'
import { respond, forbidden } from '../utils/http.js'
import { bearer } from '../middlewares/access.js'

export function authController(config, authentication) {
  const cookieName = config.production ? '__Secure-cryo_refresh' : 'cryo_refresh'
  const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api/v1/auth' }
  const saveRefresh = (res, result) => res.cookie(cookieName, result.refreshToken, { ...cookieOptions, maxAge: result.maxAge })
  return {
    trustedMutation(req, res, next) {
      res.set('Cache-Control', 'no-store')
      const origin = req.get('Origin')
      if (req.get('X-CRYO-Request') !== '1' || (origin && !config.origins.includes(origin))) throw forbidden()
      next()
    },
    async login(req, res) {
      const result = await authentication.login(validate(loginInput, req.body), req.id)
      saveRefresh(res, result)
      return respond(req, res, { user: result.user, accessToken: result.accessToken })
    },
    async refresh(req, res) {
      try {
        const result = await authentication.refresh(req.cookies[cookieName], req.id)
        saveRefresh(res, result)
        return respond(req, res, { accessToken: result.accessToken })
      } catch (error) {
        if (error.status === 401) res.clearCookie(cookieName, cookieOptions)
        throw error
      }
    },
    async logout(req, res) {
      await authentication.logout(req.cookies[cookieName], bearer(req), req.id)
      res.clearCookie(cookieName, cookieOptions)
      return res.status(204).end()
    },
    async me(req, res) {
      return respond(req, res, await authentication.present(req.user))
    },
  }
}
