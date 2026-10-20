import { Router } from 'express'
import { billingController } from '../controllers/billing.controller'
import { authenticateForAudience, requirePlatformAdmin } from '../middleware/auth.middleware'

const router = Router()

router.get('/modules/public', billingController.listModulesPublic)

router.use(authenticateForAudience('platform'))
router.use(requirePlatformAdmin)

router.get('/plans', billingController.listPlans)
router.get('/plans/:id', billingController.getPlan)
router.post('/plans', billingController.createPlan)
router.put('/plans/:id', billingController.updatePlan)
router.patch('/plans/:id', billingController.updatePlan)
router.delete('/plans/:id', billingController.deletePlan)
router.get('/modules', billingController.listModules)
router.get('/invoices', billingController.listInvoices)
router.get('/renewals', billingController.listRenewals)
router.get('/revenue', billingController.getRevenueOverview)

export default router
