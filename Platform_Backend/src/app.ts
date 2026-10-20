import 'express-async-errors'
import express, { Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'

import env from './config/env'
import { swaggerSpec } from './config/swagger'
import platformRoutes from './routes/platform'
import subscriptionRoutes from './routes/subscription.routes'
import invoiceRoutes from './routes/invoice.routes'
import paymentRoutes from './routes/payment.routes'
import addonRoutes from './routes/addon.routes'
import { errorHandler, notFound } from './middleware/errorHandler'
import logger from './utils/logger'

export function createApp(): Application {
  const app = express()

  // ── Security headers ─────────────────────────────────────────────
  app.use(helmet())

  // ── CORS ─────────────────────────────────────────────────────────
  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  app.use(
    cors({
      origin(origin, callback) {
        // allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`))
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
    })
  )

  // ── Rate limiting ─────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      // Billing dashboards load several read-only resources together. These
      // requests are authenticated by the billing router and should not share
      // the write/API burst bucket with unrelated platform traffic.
      skip: (req) => req.method === 'GET' && /^\/(?:api\/v1\/)?platform\/billing\/(?!modules\/public(?:\/|$))/.test(req.path),
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please slow down.' },
    })
  )

  // Webhook payloads must be verified against the raw JSON body before parsing.
  app.use('/api/payments/webhook/razorpay', express.raw({ type: 'application/json' }))
  app.use('/api/v1/platform/payments/webhook/razorpay', express.raw({ type: 'application/json' }))

  // ── Body parsing ──────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(compression())

  // ── HTTP logging ──────────────────────────────────────────────────
  if (env.isDev) {
    app.use(morgan('dev'))
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
      })
    )
  }

  // ── Debug logging for payment requests ──────────────────────────────
  app.use((req, res, next) => {
    if (req.path.includes('payment') || req.path.includes('razorpay')) {
      console.log('[APP] ======= GLOBAL MIDDLEWARE =======')
      console.log('[APP] Method:', req.method)
      console.log('[APP] Path:', req.path)
      console.log('[APP] Headers (partial):', {
        xInternalAuth: req.headers['x-internal-auth']?.toString().substring(0, 30),
        authorization: req.headers.authorization?.toString().substring(0, 30),
      })
      console.log('[APP] ===================================')
    }
    next()
  })

  // ── Swagger UI ────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Trimsel API Docs',
      customCss: `
        .swagger-ui .topbar { background-color: #1a3a6b; }
        .swagger-ui .topbar-wrapper .link { display: none; }
      `,
      swaggerOptions: { persistAuthorization: true },
    })
  )

  // Serve raw OpenAPI JSON
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  // ── API routes ────────────────────────────────────────────────────
  // Mount internal subscription routes before the broad platform router.
  // The platform dashboard router handles '/' and would otherwise intercept
  // /subscriptions/upgrade and require a user JWT instead of internal auth.
  app.use('/api/v1/platform/subscriptions', subscriptionRoutes)
  app.use('/api/v1/platform', platformRoutes)
  app.use('/api/v1/platform/invoices', invoiceRoutes)
  app.use('/api/v1/platform/payments', paymentRoutes)
  app.use('/api/v1/addon-plans', addonRoutes)
  app.use('/api/addon-plans', addonRoutes)
  app.use('/api/payments', paymentRoutes)

  // ── Legacy frontend alias routes for /platform paths ──────────────
  app.use('/platform/subscriptions', subscriptionRoutes)
  app.use('/platform', platformRoutes)
  app.use('/platform/invoices', invoiceRoutes)
  app.use('/platform/payments', paymentRoutes)
  app.use('/addon-plans', addonRoutes)

  // ── 404 & error handlers ─────────────────────────────────────────
  app.use(notFound)
  app.use(errorHandler)

  return app
}
