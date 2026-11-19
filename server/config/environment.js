import { z } from 'zod'

const origin = z.string().refine(value =>
  /^https?:\/\//.test(value) && URL.canParse(value) && new URL(value).origin === value)
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\/\S+$/),
  APP_ORIGINS: z.string().transform(value => value.split(',').map(entry => entry.trim())).pipe(z.array(origin).min(1)),
  JWT_SECRET: z.string().min(43).max(512),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
})

export function readConfig(env = process.env) {
  const result = schema.safeParse(env)
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => issue.path[0]))]
    throw new Error('Invalid environment fields: ' + fields.join(', '))
  }
  const data = result.data
  const production = data.NODE_ENV === 'production'
  if (production && data.APP_ORIGINS.some(value => !value.startsWith('https:'))) {
    throw new Error('Production origins must use HTTPS')
  }
  return {
    production, host: data.HOST, port: data.PORT, mongoUri: data.MONGODB_URI,
    origins: data.APP_ORIGINS, jwtSecret: data.JWT_SECRET, trustProxy: data.TRUST_PROXY_HOPS,
    accessSeconds: 600, refreshSeconds: 7 * 24 * 3600,
  }
}
