import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import env from './env'
import logger from '../utils/logger'

// ── Singleton ─────────────────────────────────────────────────────────────
let io: Server | null = null

// ── Plan event names ──────────────────────────────────────────────────────
export const PlanEvents = {
  CREATED: 'plan:created',
  UPDATED: 'plan:updated',
  DELETED: 'plan:deleted',
} as const

export type PlanEvent = (typeof PlanEvents)[keyof typeof PlanEvents]

// ── Initialise Socket.io on the HTTP server ───────────────────────────────
/**
 * Call once in server.ts after `app.listen()` returns the http.Server.
 * Socket.io shares the same port as Express — no extra port needed.
 */
export function initSocket(httpServer: HttpServer): Server {
  if (io) return io

  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim())

  io = new Server(httpServer, {
    // ── CORS: mirror the Express CORS config ──────────────────────────
    cors: {
      origin(origin, callback) {
        // Allow requests with no origin (Postman, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error(`Socket.io CORS: origin ${origin} not allowed`))
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // ── Transport options ─────────────────────────────────────────────
    transports: ['websocket', 'polling'], // try WebSocket first, fall back to polling
    // ── Connection state recovery (Socket.io v4.6+) ───────────────────
    // Allows clients to recover missed events for up to 2 minutes after a disconnect
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  })

  // ── Connection lifecycle logging ──────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket.io] Client connected: ${socket.id} (transport: ${socket.conn.transport.name})`)

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] Client disconnected: ${socket.id} — reason: ${reason}`)
    })

    socket.on('error', (err) => {
      logger.error(`[Socket.io] Socket error on ${socket.id}:`, err)
    })
  })

  logger.info('[Socket.io] Server initialised — listening for connections')
  return io
}

// ── Getter — use this in controllers ─────────────────────────────────────
/**
 * Returns the Socket.io Server instance.
 * Throws if called before `initSocket()` — ensures controllers are never
 * used before the server is fully bootstrapped.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('[Socket.io] Server not initialised. Call initSocket() first.')
  }
  return io
}
