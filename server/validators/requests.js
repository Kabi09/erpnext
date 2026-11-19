import { z } from 'zod'
import { HttpError } from '../utils/http.js'

const email = z.string().trim().toLowerCase().max(254).pipe(z.email())
export const loginInput = z.strictObject({ email, password: z.string().min(1).max(256) })
export const bootstrapInput = z.object({
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: z.string().min(14).max(256),
  ADMIN_NAME: z.string().trim().min(1).max(120),
  COMPANY_CODE: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{1,15}$/),
  COMPANY_NAME: z.string().trim().min(1).max(160),
})
export const companyInput = z.object({ companyId: z.string().regex(/^[a-f0-9]{24}$/i) })

export function validate(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new HttpError(422, 'INVALID_INPUT', 'Check the submitted fields.',
      result.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code })))
  }
  return result.data
}
