import { app } from './app'
import env from './config/env'
import { prisma } from './lib/prisma'
async function main(): Promise<void> {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  const server = app.listen(env.port, () => {
    console.log(`EduSphere Platform API listening at http://localhost:${env.port}`)
    console.log(`Health: http://localhost:${env.port}/health`)
    console.log(`Platform API: http://localhost:${env.port}/api/v1`)
  })
  const shutdown = async () => {
    server.close(async () => { await prisma.$disconnect(); process.exit(0) })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}
main().catch(async error => {
  console.error('Failed to start Platform API:', error)
  await prisma.$disconnect()
  process.exit(1)
})