import { Router } from 'express'
import platformAuthRoutes from './auth.routes'
import dashboardRoutes from './dashboard.routes'
import organizationRoutes from '../organization.routes'
import billingRoutes from '../billing.routes'
import billingSettingsRoutes from '../billingSettings.routes'
import featureFlagRoutes from '../featureFlag.routes'
import { authenticateForAudience, requirePlatformAdmin } from '../../middleware/auth.middleware'
import addonRoutes from '../addon.routes'

const router = Router()

router.use('/auth', platformAuthRoutes)
router.use('/billing', billingRoutes)
router.use('/settings/billing', billingSettingsRoutes)
router.use('/feature-flags', featureFlagRoutes)
router.use('/organizations', authenticateForAudience('platform'), requirePlatformAdmin, organizationRoutes)
router.use('/addon-plans', addonRoutes)
router.use('/', dashboardRoutes)

export default router
