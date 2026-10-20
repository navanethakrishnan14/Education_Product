import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { sendError } from '../utils/apiResponse'
import type { UserRole } from '../types'

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 401, 'Authentication required')
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    sendError(res, 401, 'Invalid or expired token')
  }
}

export function authenticateForAudience(audience: 'platform' | 'organization') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 401, 'Authentication required')
      return
    }

    const token = authHeader.split(' ')[1]
    try {
      const payload = verifyAccessToken(token)
      if (payload.aud !== audience) {
        sendError(res, 403, 'Token audience mismatch')
        return
      }
      req.user = payload
      next()
    } catch {
      sendError(res, 401, 'Invalid or expired token')
    }
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Authentication required')
      return
    }
    if (!roles.includes(req.user.role as UserRole)) {
      sendError(res, 403, 'Insufficient permissions')
      return
    }
    next()
  }
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 401, 'Authentication required')
    return
  }
  const allowed = new Set<UserRole>(['admin', 'hr_admin', 'platform_admin', 'super_admin', 'Org_superadmin', 'support'])
  if (req.user.aud !== 'platform' || !allowed.has(req.user.role as UserRole)) {
    sendError(res, 403, 'Platform admin access required')
    return
  }
  next()
}

export function requireOrgUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 401, 'Authentication required')
    return
  }
  const allowed = new Set<UserRole>(['employee', 'manager', 'hr_admin', 'org_admin', 'Org_superadmin'])
  if (req.user.aud !== 'organization' || !allowed.has(req.user.role as UserRole)) {
    sendError(res, 403, 'Organization user access required')
    return
  }
  if (!req.user.organizationId) {
    sendError(res, 403, 'Tenant context is required')
    return
  }
  next()
}

