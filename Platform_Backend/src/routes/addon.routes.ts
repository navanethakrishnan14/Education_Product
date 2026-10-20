import { Router } from 'express'
import { addonController } from '../controllers/addon.controller'
import { authenticate, requirePlatformAdmin } from '../middleware/auth.middleware'

const router = Router()

// Middleware that accepts either internal auth OR platform admin auth
const internalOrPlatformAdmin = (req: any, res: any, next: any) => {
  // Check for internal auth token first
  const internalToken = req.headers['x-internal-auth']
  const expectedToken = process.env.INTERNAL_AUTH_TOKEN || 'internal-service-token'
  
  if (internalToken === expectedToken) {
    // Internal auth successful
    next()
    return
  }
  
  // Fall back to platform admin authentication
  authenticate(req, res, (err?: any) => {
    if (err) return next(err)
    requirePlatformAdmin(req, res, next)
  })
}

// GET endpoint accepts internal auth OR platform admin auth
router.get('/', internalOrPlatformAdmin, addonController.list)

// POST, PATCH, DELETE endpoints require platform admin auth only
router.use(authenticate, requirePlatformAdmin)
router.post('/', addonController.create)
router.patch('/:addonId', addonController.update)
router.delete('/:addonId', addonController.remove)

export default router
