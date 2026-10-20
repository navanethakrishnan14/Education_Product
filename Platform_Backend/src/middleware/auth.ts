import type { NextFunction, Request, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import env from '../config/env'
export interface AuthenticatedRequest extends Request { auth?: { userId: string; email: string; role: string } }
export function requirePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) { res.status(401).json({ success: false, message: 'Authentication token is required.' }); return }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload & { userId?: string; email?: string; role?: string }
    if (!payload.userId || !payload.email || !payload.role) { res.status(401).json({ success: false, message: 'Invalid authentication token.' }); return }
    if (!['platform_admin', 'super_admin', 'admin'].includes(payload.role)) { res.status(403).json({ success: false, message: 'Platform administrator access is required.' }); return }
    req.auth = { userId: payload.userId, email: payload.email, role: payload.role }; next()
  } catch { res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' }) }
}