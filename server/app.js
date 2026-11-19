import express from 'express'
import { documentRoutes } from './routes/documents.js'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import pinoHttp from 'pino-http'
import { authController } from './controllers/auth.js'
import { requireCompanyPermission, requireIdentity } from './middlewares/access.js'
import { createAuthentication } from './services/authentication.js'
import { companyInput, validate } from './validators/requests.js'
import { errorResponse, forbidden, HttpError, requestId, respond } from './utils/http.js'

export function createApp(config, { database, metadata, logger = true }) {
  const app = express()
  const router = express.Router()
  const authentication = createAuthentication(config, database)
  const auth = authController(config, authentication)
  const identity = requireIdentity(authentication)

  const limit = (max, windowMs, options = {}) => rateLimit({
    limit: max, windowMs, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED', 'Too many requests. Try again later.')),
    ...options,
  })

  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)
  app.use(requestId)
  if (logger) app.use(pinoHttp({
    wrapSerializers: false,
    serializers: {
      req: req => ({ id: req.id, method: req.method }),
      res: res => ({ statusCode: res.statusCode }),
      err: err => ({ type: err.name }),
    },
  }))
  app.use(helmet())
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.origins.includes(origin)) return callback(null, Boolean(origin))
      callback(forbidden())
    },
    credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type', 'X-CRYO-Request','X-Company-Id','If-Match'],
    exposedHeaders: ['X-Request-Id','ETag'],
  }))
  router.get('/health', (req, res) => respond(req, res, { status: 'ok' }))
  router.get('/ready', async (req, res) => {
    if (!metadata || !await database.ready()) throw new HttpError(503, 'NOT_READY', 'The service is not ready.')
    return respond(req, res, { status: 'ready' })
  })
  router.use(limit(900, 60_000), express.json({ limit: '16kb' }), cookieParser())
  const loginByAccountAndNetwork = limit(12, 15 * 60_000, {
    keyGenerator(req) {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : ''
      return ipKeyGenerator(req.ip) + ':' + email
    },
  })
  router.post('/auth/login', auth.trustedMutation, limit(120, 5 * 60_000), loginByAccountAndNetwork, auth.login)
  router.post('/auth/refresh', auth.trustedMutation, limit(60, 60_000), auth.refresh)
  router.post('/auth/logout', auth.trustedMutation, auth.logout)
  router.get('/auth/me', identity, auth.me)
  router.get('/companies/:companyId/access', identity,
    (req, _res, next) => { validate(companyInput, req.params); next() },
    requireCompanyPermission(database.models, 'company', 'read'),
    (req, res) => respond(req, res, { id: String(req.company._id), name: req.company.name, code: req.company.code }),
  )

  const documents = documentRoutes(database, metadata, identity)
  app.locals.documentsReady = documents.initialized
  router.use(documents.router)
  app.use('/api/v1', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() }, router)
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'This endpoint was not found.')))
  app.use(errorResponse)
  return app
}
