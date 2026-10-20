import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import env from '../config/env'
import { requirePlatformAdmin, type AuthenticatedRequest } from '../middleware/auth'
const router = Router()
router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) { res.status(400).json({ success: false, message: 'Email and password are required.' }); return }
    const user = await prisma.platformUser.findUnique({ where: { email } })
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' }); return
    }
    if (!['platform_admin', 'super_admin', 'admin'].includes(user.role)) {
      res.status(403).json({ success: false, message: 'Platform administrator access is required.' }); return
    }
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
    await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (error) { next(error) }
})
router.get('/me', requirePlatformAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.platformUser.findUnique({ where: { id: req.auth!.userId }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } })
    if (!user || !user.isActive) { res.status(401).json({ success: false, message: 'Platform account is unavailable.' }); return }
    res.json({ success: true, user })
  } catch (error) { next(error) }
})
export default router