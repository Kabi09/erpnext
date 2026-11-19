import { randomUUID } from 'node:crypto'

export class HttpError extends Error {
  constructor(status, code, message, details = []) {
    super(message)
    Object.assign(this, { status, code, details })
  }
}

export const authenticationError = () => new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.')
export const forbidden = () => new HttpError(403, 'FORBIDDEN', 'You do not have access to this resource.')

export function requestId(req, res, next) {
  req.id = randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}

export function respond(req, res, data, status = 200) {
  return res.status(status).json({ data, meta: { requestId: req.id } })
}

export function errorResponse(error, req, res, next) {
  if (res.headersSent) return next(error)
  let problem = error
  if (error.type === 'entity.parse.failed') problem = new HttpError(400, 'INVALID_JSON', 'The request contains invalid JSON.')
  if (error.type === 'entity.too.large') problem = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.')
  if (!(problem instanceof HttpError)) {
    req.log?.error({ errorType: error.name }, 'Unhandled request failure')
    problem = new HttpError(500, 'INTERNAL_ERROR', 'The request could not be completed.')
  }
  return res.status(problem.status).json({
    error: { code: problem.code, message: problem.message, details: problem.details, requestId: req.id },
  })
}
