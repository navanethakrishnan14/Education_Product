/**
 * SUBSCRIPTION ROUTES
 * 
 * Platform admin subscription endpoints
 * All routes require authentication
 */

import { Router } from 'express'
import { authenticate, requirePlatformAdmin } from '../middleware/auth.middleware'
import { subscriptionController } from '../controllers/subscriptionController'

const router = Router()

// ── Internal endpoints (called from Organization backend) ──────────────────

/**
 * @route POST /api/v1/subscriptions/upgrade
 * @description Upgrade subscription plan (called from Organization backend)
 * @internal This is called from org backend when organization upgrades their plan
 * @body {organizationId, newPlanId, effectiveDate?}
 * @returns Updated subscription + invoice
 */
router.post('/upgrade', (req, res, next) => {
    // Verify internal auth token for inter-service communication
    const internalToken = req.headers['x-internal-auth']
    const expectedToken = process.env.INTERNAL_AUTH_TOKEN || 'internal-service-token'

    if (internalToken !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized internal request' })
    }

    next()
}, subscriptionController.upgradePlan)

router.post('/upgrade-request', (req, res, next) => {
    const internalToken = req.headers['x-internal-auth']
    const expectedToken = process.env.INTERNAL_AUTH_TOKEN || 'internal-service-token'
    if (internalToken !== expectedToken) return res.status(401).json({ error: 'Unauthorized internal request' })
    next()
}, subscriptionController.createUpgradeRequest)

router.get('/upgrade-requests', authenticate, requirePlatformAdmin, subscriptionController.listUpgradeRequests)
router.post('/upgrade-requests/:requestId/approve', authenticate, requirePlatformAdmin, subscriptionController.approveUpgradeRequest)
router.post('/upgrade-requests/:requestId/reject', authenticate, requirePlatformAdmin, subscriptionController.rejectUpgradeRequest)

/**
 * @route GET /platform/billing/periods/:organizationId
 * @description Get current active billing period for organization (called from org backend)
 * @internal Called from org backend to fetch billing period details
 * @param organizationId Organization ID
 * @returns Current billing period with start, end, and next billing date
 */
router.get('/periods/:organizationId', subscriptionController.getBillingPeriod)

// ── Admin endpoints (require authentication) ────────────────────────────────
router.use(authenticate)

// ── Create ──────────────────────────────────────────────────────────────────

/**
 * @route POST /platform/subscriptions
 * @description Create new subscription for organization
 * @body {organizationId, planId, billingCycle, startDate?, currency?}
 * @returns Created subscription
 */
router.post('/', subscriptionController.createSubscription)

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * @route GET /platform/subscriptions
 * @description List all subscriptions with optional filters
 * @query {status?, organizationId?, limit?, skip?}
 * @returns Array of subscriptions with pagination
 */
router.get('/', subscriptionController.listSubscriptions)

/**
 * @route GET /platform/subscriptions/renewal/due
 * @description Get subscriptions due for renewal (nextBillingDate <= today)
 * @returns Array of subscriptions ready for renewal
 */
router.get('/renewal/due', subscriptionController.getSubscriptionsDueForRenewal)

/**
 * @route GET /platform/subscriptions/org/:organizationId
 * @description Get active subscription for organization
 * @param organizationId Organization ID
 * @returns Subscription or null
 */
router.get('/org/:organizationId', subscriptionController.getSubscriptionByOrg)

/**
 * @route GET /platform/subscriptions/:subscriptionId/history
 * @description Get subscription change history
 * @param subscriptionId Subscription ID
 * @query {limit?}
 * @returns Array of history entries (change types, amounts, dates)
 */
router.get('/:subscriptionId/history', subscriptionController.getSubscriptionHistory)

export default router
