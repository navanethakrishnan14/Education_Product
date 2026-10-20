import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import logger from '../utils/logger'
import { sendError } from '../utils/apiResponse'
import env from '../config/env'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errors?: string[] | Record<string, string>
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack })

  // Known operational errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.errors)
    return
  }

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message)
    sendError(res, 422, 'Validation failed', errors)
    return
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).name === 'MongoServerError') {
    const mongoErr = err as NodeJS.ErrnoException & { code?: number; keyValue?: Record<string, unknown> }
    if (mongoErr.code === 11000) {
      console.error('[DuplicateKeyError] Raw error:', JSON.stringify(mongoErr, null, 2));
      const keyValue = mongoErr.keyValue ?? {}
      const field = Object.keys(keyValue)[0] ?? ''
      const value = keyValue[field]

      // Get collection name if available from error message (Mongo errors usually include it)
      const collectionMatch = mongoErr.message.match(/collection: ([^ ]+)/)
      const collection = collectionMatch ? collectionMatch[1] : ''

      let message = 'A record with the same unique identifier already exists'

      if (field && field !== '_id' && field !== 'modelName') {
        message = `${field} "${value}" already exists${collection ? ` in ${collection}` : ''}`
      } else if (collection) {
        message = `A record with the same ID already exists in ${collection}`
      }

      sendError(res, 409, message)
      return
    }
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    sendError(res, 401, 'Token has expired')
    return
  }
  if (err instanceof JsonWebTokenError) {
    sendError(res, 401, 'Invalid token')
    return
  }

  // Fallback — hide details in production
  const message = env.isDev ? err.message : 'Internal server error'
  sendError(res, 500, message)
}

export function notFound(req: Request, res: Response): void {
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`)
}
