import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requirePlatformAdmin } from '../middleware/auth'
const router = Router()
router.use(requirePlatformAdmin)
router.get('/overview', async (_req, res, next) => {
  try {
    const [registeredSchools, activeSchools, tenantUsers, platformAdmins] = await Promise.all([
      prisma.schoolTenant.count(), prisma.schoolTenant.count({ where: { status: 'active' } }),
      prisma.tenantUser.count({ where: { isActive: true } }), prisma.platformUser.count({ where: { isActive: true } }),
    ])
    res.json({ success: true, data: { registeredSchools, activeSchools, tenantUsers, platformAdmins, platformHealth: 'healthy' } })
  } catch (error) { next(error) }
})
router.get('/schools', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20))
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {}
    const [data, total] = await Promise.all([
      prisma.schoolTenant.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.schoolTenant.count({ where }),
    ])
    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) { next(error) }
})
export default router