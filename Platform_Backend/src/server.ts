import { createApp } from './app'
import { connectDB, disconnectDB } from './config/db'
import env from './config/env'
import logger from './utils/logger'
import { seedSaaSAdmin } from './config/seeder'
import { seedBilling } from './config/seedBilling'
import { seedAddons } from './config/seedAddons'
import { initSocket } from './config/socket'
import { startSubscriptionExpiryJob } from './jobs/subscriptionExpiryJob'

async function bootstrap(): Promise<void> {
  await connectDB()
  await seedSaaSAdmin()
  await seedBilling()
  await seedAddons()

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  Trimsel API running on http://localhost:${env.PORT}`)
    logger.info(`📖  Swagger docs at  http://localhost:${env.PORT}/api/docs`)
    logger.info(`🌍  Environment: ${env.NODE_ENV}`)
  })

  // ── Socket.io — attach to the same HTTP server (same port as Express) ──
  initSocket(server)

  // ── Background billing expiry jobs ──────────────────────────────────────
  const expiryJob = startSubscriptionExpiryJob()

  // ── Graceful shutdown ────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    clearInterval(expiryJob)
    server.close(async () => {
      await disconnectDB()
      logger.info('Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason)
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err)
  process.exit(1)
})
