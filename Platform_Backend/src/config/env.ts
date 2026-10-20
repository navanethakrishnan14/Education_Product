import 'dotenv/config'
function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '4001', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),
}
if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) throw new Error('PORT must be a valid TCP port')
if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters')
export default env
