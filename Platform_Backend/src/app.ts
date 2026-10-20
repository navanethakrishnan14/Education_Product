import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import env from './config/env'
import authRoutes from './routes/auth.routes'
import dashboardRoutes from './routes/dashboard.routes'
export const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ success: true, service: 'edusphere-platform-api', database: 'postgresql' }))
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/platform', dashboardRoutes)
app.use((_req, res) => res.status(404).json({ success: false, message: 'Endpoint not found.' }))
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ success: false, message: 'Invalid JSON request body.' }); return }
  if (error instanceof Error && error.message === 'Origin is not allowed by CORS') { res.status(403).json({ success: false, message: error.message }); return }
  console.error(error)
  res.status(500).json({ success: false, message: 'Internal server error.' })
}
app.use(errorHandler)