import { Router } from 'express'
import { platformController } from '../../controllers/platform.controller'
import { authenticateForAudience, requirePlatformAdmin } from '../../middleware/auth.middleware'

const router = Router()

router.use(authenticateForAudience('platform'))
router.use(requirePlatformAdmin)

router.get('/dashboard', platformController.getDashboard)
router.get('/analytics', platformController.getAnalytics)
router.get('/feature-flags', platformController.listFeatureFlags)
router.get('/feature-flags/:id', platformController.getFeatureFlag)
router.post('/feature-flags', platformController.createFeatureFlag)
router.put('/feature-flags/:id', platformController.updateFeatureFlag)
router.patch('/feature-flags/:id', platformController.updateFeatureFlag)
router.patch('/feature-flags/:id/toggle', platformController.toggleFeatureFlag)
router.delete('/feature-flags/:id', platformController.deleteFeatureFlag)
router.post('/feature-flags/seed', platformController.seedDemoFeatureFlags)

export default router
