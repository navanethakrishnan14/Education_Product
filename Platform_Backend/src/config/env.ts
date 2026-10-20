import dotenv from 'dotenv'
dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env variable: ${key}`)
  return val
}

const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  MONGO_URI: required('MONGO_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:5000',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  SAAS_ADMIN_NAME: process.env.SAAS_ADMIN_NAME ?? 'SaaS Admin',
  SAAS_ADMIN_EMAIL: process.env.SAAS_ADMIN_EMAIL ?? '',
  // Never ship a known default admin credential. Admin seeding is skipped until this is configured.
  SAAS_ADMIN_PASSWORD: process.env.SAAS_ADMIN_PASSWORD ?? '',
  SAAS_ADMIN_PHONE: process.env.SAAS_ADMIN_PHONE ?? '',
  SAAS_ORG_NAME: process.env.SAAS_ORG_NAME ?? 'SaaS Admin Organization',
  SAAS_WORKSPACE_URL: process.env.SAAS_WORKSPACE_URL ?? '',
  SAAS_ORG_INDUSTRY: process.env.SAAS_ORG_INDUSTRY ?? 'Technology',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const

export default env
