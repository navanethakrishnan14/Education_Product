import { Request, Response, NextFunction } from 'express'
import { User } from '../models/User'
import { AppError } from './errorHandler'
import logger from '../utils/logger'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

/**
 * AUTHORIZATION MIDDLEWARE: Platform Admin Check
 *
 * Verifies that the authenticated user has the 'Platform Admin' role.
 * Should be used AFTER authenticateForAudience('platform') middleware.
 *
 * Usage:
 * router.put(
 *   '/settings/billing',
 *   authenticateForAudience('platform'),
 *   requirePlatformAdmin,
 *   controller.updateSettings
 * )
 *
 * Response Codes:
 * - 200: Request continues to handler
 * - 401: No user identified (authentication failed)
 * - 403: User not authorized (not a platform admin)
 * - 404: User not found in database
 * - 500: Server error
 */

export const requirePlatformAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User should already be authenticated by authenticateForAudience middleware
    const userId = req.user?.userId

    if (!userId) {
      throw new AppError('Unauthorized: No user identified', 401)
    }

    // Query user and check roles
    const user = await User.findById(userId)

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Check for Platform Admin role
    // User.role can be: user, employee, manager, hr_admin, org_admin, admin, platform_admin, super_admin, support
    const isPlatformAdmin =
      user.role === 'platform_admin' ||
      user.role === 'admin' ||
      user.role === 'super_admin'

    if (!isPlatformAdmin) {
      logger.warn(
        `Unauthorized platform admin access attempt by user ${userId} (${user.email})`
      )
      throw new AppError('Forbidden: Platform admin access required', 403)
    }

    // Attach user to request for later use in handlers
    req.user = user

    next()
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }

    logger.error('Platform admin authorization check failed', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
