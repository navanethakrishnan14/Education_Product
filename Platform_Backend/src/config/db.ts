import { Pool, type PoolClient } from 'pg'
import env from './env'
import logger from '../utils/logger'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'school-product-platform-api',
})

pool.on('error', (error) => logger.error('Unexpected PostgreSQL pool error', error))

export async function connectDB(): Promise<void> {
  const client = await pool.connect()
  try {
    const result = await client.query<{ version: string; current_database: string }>(
      'SELECT version(), current_database()'
    )
    logger.info(`PostgreSQL connected: ${result.rows[0].current_database} (${result.rows[0].version.split(' ').slice(0, 2).join(' ')})`)
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function disconnectDB(): Promise<void> {
  await pool.end()
  logger.info('PostgreSQL pool closed')
}
