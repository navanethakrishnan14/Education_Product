import mongoose from 'mongoose'
import env from './env'
import logger from '../utils/logger'

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(env.MONGO_URI as string)
    logger.info(`MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    logger.error('MongoDB connection failed', err)
    process.exit(1)
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  logger.info('MongoDB disconnected')
}
