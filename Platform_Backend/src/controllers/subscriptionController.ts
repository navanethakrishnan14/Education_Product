/**
 * SUBSCRIPTION CONTROLLER
 * 
 * Platform admin endpoints for subscription management
 * All subscriptions are created by the platform for organizations
 */

import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { subscriptionService } from '../services/subscriptionService'
import { BillingSubscription } from '../models/BillingSubscription'
import { PlanUpgradeRequest } from '../models/PlanUpgradeRequest'
import { BillingPlan } from '../models/BillingPlan'
import { Organization } from '../models/Organization'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { AppError } from '../middleware/errorHandler'

export const subscriptionController = {
    async createUpgradeRequest(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId, newPlanId } = req.body
            if (!organizationId || !newPlanId) {
                sendError(res, 400, 'organizationId and newPlanId are required')
                return
            }

            const [organization, targetPlan, subscription] = await Promise.all([
                Organization.findById(organizationId).lean(),
                BillingPlan.findById(newPlanId).lean(),
                subscriptionService.getSubscription(organizationId),
            ])
            if (!organization) { sendError(res, 404, 'Organization not found'); return }
            if (!targetPlan || targetPlan.status !== 'active') { sendError(res, 404, 'Target plan not found or inactive'); return }
            if (!subscription) { sendError(res, 404, 'No subscription record found for organization'); return }
            if (subscription.currentPlanId.toString() === newPlanId.toString()) {
                sendError(res, 400, 'Organization is already on this plan')
                return
            }
            const currentPlan = await BillingPlan.findById(subscription.currentPlanId).select('monthlyPrice').lean()
            if (!currentPlan || targetPlan.monthlyPrice <= currentPlan.monthlyPrice) {
                sendError(res, 400, 'Only upgrades to a higher-priced plan can be requested')
                return
            }

            const existing = await PlanUpgradeRequest.findOne({ organizationId, status: 'pending' }).lean()
            if (existing) { sendError(res, 409, 'An upgrade request is already pending'); return }

            const request = await PlanUpgradeRequest.create({
                organizationId,
                currentPlanId: subscription.currentPlanId,
                requestedPlanId: newPlanId,
            })
            sendSuccess(res, 202, 'Plan upgrade request submitted', {
                requestId: request._id,
                status: request.status,
                organizationId,
                currentPlanId: request.currentPlanId,
                requestedPlanId: request.requestedPlanId,
            })
        } catch (err: any) {
            if (err instanceof AppError) { sendError(res, err.statusCode, err.message); return }
            sendError(res, 500, err.message || 'Failed to create upgrade request')
        }
    },

    async listUpgradeRequests(req: Request, res: Response): Promise<void> {
        try {
            const status = (req.query.status as string) || 'pending'
            const requests = await PlanUpgradeRequest.find(status === 'all' ? {} : { status }).sort({ createdAt: -1 }).lean()
            const result = await Promise.all(requests.map(async (request: any) => {
                const [organization, currentPlan, requestedPlan] = await Promise.all([
                    Organization.findById(request.organizationId).select('name workspaceUrl').lean(),
                    BillingPlan.findById(request.currentPlanId).select('name monthlyPrice').lean(),
                    BillingPlan.findById(request.requestedPlanId).select('name monthlyPrice').lean(),
                ])
                return { ...request, organization, currentPlan, requestedPlan }
            }))
            sendSuccess(res, 200, 'Upgrade requests retrieved', { requests: result })
        } catch (err: any) { sendError(res, 500, err.message || 'Failed to retrieve upgrade requests') }
    },

    async approveUpgradeRequest(req: Request, res: Response): Promise<void> {
        const session = await mongoose.startSession()
        try {
            const request = await PlanUpgradeRequest.findOne({ _id: req.params.requestId, status: 'pending' })
            if (!request) { sendError(res, 404, 'Pending upgrade request not found'); return }
            const subscription = await subscriptionService.getSubscription(request.organizationId)
            if (!subscription) { sendError(res, 404, 'No subscription record found for organization'); return }
            let result: Awaited<ReturnType<typeof subscriptionService.upgradePlan>> | undefined
            await session.withTransaction(async () => {
                result = await subscriptionService.upgradePlan(
                    String(subscription._id),
                    { newPlanId: String(request.requestedPlanId) },
                    session
                )
                request.status = 'approved'
                request.reviewedAt = new Date()
                await request.save({ session })
            })
            sendSuccess(res, 200, 'Upgrade request approved', { requestId: request._id, status: request.status, subscription: result?.subscription })
        } catch (err: any) {
            if (err instanceof AppError) { sendError(res, err.statusCode, err.message); return }
            sendError(res, 500, err.message || 'Failed to approve upgrade request')
        } finally { await session.endSession() }
    },

    async rejectUpgradeRequest(req: Request, res: Response): Promise<void> {
        try {
            const request = await PlanUpgradeRequest.findOneAndUpdate(
                { _id: req.params.requestId, status: 'pending' },
                { status: 'rejected', rejectionReason: req.body?.reason || 'Rejected by platform admin', reviewedAt: new Date() },
                { new: true },
            )
            if (!request) { sendError(res, 404, 'Pending upgrade request not found'); return }
            sendSuccess(res, 200, 'Upgrade request rejected', { requestId: request._id, status: request.status, rejectionReason: request.rejectionReason })
        } catch (err: any) { sendError(res, 500, err.message || 'Failed to reject upgrade request') }
    },
    /**
     * Create new subscription for organization
     * POST /platform/subscriptions
     * 
     * Body: {
     *   organizationId: string (required)
     *   planId: string (required)
     *   billingCycle: "monthly" | "annual" (required)
     *   startDate?: ISO date string
     *   currency?: string (default: "USD")
     * }
     */
    async createSubscription(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId, planId, billingCycle, startDate, currency } = req.body

            // Validation
            if (!organizationId || !planId || !billingCycle) {
                sendError(res, 400, 'Missing required fields: organizationId, planId, billingCycle')
                return
            }

            if (!['monthly', 'annual'].includes(billingCycle)) {
                sendError(res, 400, 'billingCycle must be "monthly" or "annual"')
                return
            }

            // Create subscription
            const subscription = await subscriptionService.createSubscription({
                organizationId,
                planId,
                billingCycle,
                startDate: startDate ? new Date(startDate) : undefined,
                currency,
            })

            sendSuccess(res, 201, 'Subscription created successfully', {
                subscription: {
                    id: subscription._id,
                    organizationId: subscription.organizationId,
                    currentPlanId: subscription.currentPlanId,
                    billingCycle: subscription.billingCycle,
                    subscriptionStartDate: subscription.subscriptionStartDate,
                    currentPeriodStart: subscription.currentPeriodStart,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    nextBillingDate: subscription.nextBillingDate,
                    status: subscription.status,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to create subscription')
        }
    },

    /**
     * List all subscriptions with optional filters
     * GET /platform/subscriptions?status=active&organizationId=...&limit=50&skip=0
     * 
     * Query params:
     * - status: "active" | "trial" | "cancelled" | "expired" | "past_due"
     * - organizationId: filter by org
     * - limit: max results (default: 50, max: 100)
     * - skip: pagination offset
     */
    async listSubscriptions(req: Request, res: Response): Promise<void> {
        try {
            const { status, organizationId, limit = 50, skip = 0 } = req.query

            const query: Record<string, any> = {}

            if (status) {
                query.status = status
            }

            if (organizationId) {
                query.organizationId = organizationId
            }

            const limitNum = Math.min(parseInt(limit as string) || 50, 100)
            const skipNum = parseInt(skip as string) || 0

            // Execute query
            const subscriptions = await BillingSubscription.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skipNum)
                .lean()

            // Get total count
            const total = await BillingSubscription.countDocuments(query)

            sendSuccess(res, 200, 'Subscriptions retrieved', {
                subscriptions: subscriptions.map((sub: any) => ({
                    id: sub._id,
                    organizationId: sub.organizationId,
                    currentPlanId: sub.currentPlanId,
                    billingCycle: sub.billingCycle,
                    status: sub.status,
                    nextBillingDate: sub.nextBillingDate,
                    createdAt: sub.createdAt,
                })),
                pagination: {
                    limit: limitNum,
                    skip: skipNum,
                    total,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve subscriptions')
        }
    },

    /**
     * Get specific subscription by organization ID
     * GET /platform/subscriptions/org/:organizationId
     */
    async getSubscriptionByOrg(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId } = req.params

            if (!organizationId) {
                sendError(res, 400, 'organizationId is required')
                return
            }

            const subscription = await subscriptionService.getSubscription(organizationId)

            if (!subscription) {
                sendSuccess(res, 200, 'No active subscription found', null)
                return
            }

            sendSuccess(res, 200, 'Subscription retrieved', {
                subscription: {
                    id: subscription._id,
                    organizationId: subscription.organizationId,
                    currentPlanId: subscription.currentPlanId,
                    billingCycle: subscription.billingCycle,
                    status: subscription.status,
                    subscriptionStartDate: subscription.subscriptionStartDate,
                    currentPeriodStart: subscription.currentPeriodStart,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    nextBillingDate: subscription.nextBillingDate,
                    scheduledPlanId: subscription.scheduledPlanId || null,
                    scheduledChangeDate: subscription.scheduledChangeDate || null,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve subscription')
        }
    },

    /**
     * Get subscription history
     * GET /platform/subscriptions/:subscriptionId/history?limit=50
     */
    async getSubscriptionHistory(req: Request, res: Response): Promise<void> {
        try {
            const { subscriptionId } = req.params
            const { limit = 50 } = req.query

            if (!subscriptionId) {
                sendError(res, 400, 'subscriptionId is required')
                return
            }

            const limitNum = Math.min(parseInt(limit as string) || 50, 100)

            const history = await subscriptionService.getSubscriptionHistory(subscriptionId, limitNum)

            sendSuccess(res, 200, 'Subscription history retrieved', {
                history: history.map((entry: any) => ({
                    id: entry._id,
                    changeType: entry.changeType,
                    previousPlanId: entry.previousPlanId,
                    previousPlanName: entry.previousPlanName,
                    newPlanId: entry.newPlanId,
                    newPlanName: entry.newPlanName,
                    effectiveDate: entry.effectiveDate,
                    oldPlanAmount: entry.oldPlanAmount,
                    newPlanAmount: entry.newPlanAmount,
                    proratedCredit: entry.proratedCredit,
                    proratedCharge: entry.proratedCharge,
                    finalAmount: entry.finalAmount,
                    invoiceId: entry.invoiceId,
                    createdAt: entry.createdAt,
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve history')
        }
    },

    /**
     * Upgrade subscription plan (called from Organization backend)
     * POST /api/v1/subscriptions/upgrade
     * 
     * This is an internal endpoint called by the Organization backend
     * when an organization upgrades their plan.
     * 
     * CRITICAL FIXES:
     * 1. Get old plan BEFORE changing subscription
     * 2. Calculate proration with employee count
     * 3. Create invoice with previousPlanSnapshot
     * 4. Update subscription AFTER invoice creation
     * 5. Return complete invoice + subscription data
     * 
     * Body: {
     *   organizationId: string (required)
     *   newPlanId: string (required)
     *   effectiveDate?: ISO date string (default: now)
     * }
     * 
     * Returns: upgraded subscription + generated invoice with full details
     */
    async upgradePlan(req: Request, res: Response): Promise<void> {
        let session: mongoose.ClientSession | undefined
        try {
            const { organizationId, newPlanId, effectiveDate } = req.body

            // Validation
            if (!organizationId || !newPlanId) {
                sendError(res, 400, 'Missing required fields: organizationId, newPlanId')
                return
            }

            // Get subscription
            const subscription = await subscriptionService.getSubscription(organizationId)
            if (!subscription) {
                sendError(res, 404, 'No subscription record found for organization')
                return
            }

            console.log(`[SUBSCRIPTION] Upgrade requested: org=${organizationId}, plan=${newPlanId}`)

            // Process upgrade
            session = await mongoose.startSession()
            let result: Awaited<ReturnType<typeof subscriptionService.upgradePlan>> | undefined
            await session.withTransaction(async () => {
                result = await subscriptionService.upgradePlan(
                    String(subscription._id),
                    {
                        newPlanId,
                        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
                    },
                    session,
                )
            })
            if (!result) throw new AppError('Plan upgrade did not complete', 500)

            console.log(`[SUBSCRIPTION] Upgrade completed: org=${organizationId}, invoiceId=${result.invoiceId}`)

            // ✅ Return complete response with invoice details
            sendSuccess(res, 200, 'Plan upgraded successfully', {
                subscription: {
                    id: result.subscription._id,
                    organizationId: result.subscription.organizationId,
                    previousPlanId: result.subscription.previousPlanId,
                    currentPlanId: result.subscription.currentPlanId,
                    status: result.subscription.status,
                    billingCycle: result.subscription.billingCycle,
                    currentPeriodStart: result.subscription.currentPeriodStart,
                    currentPeriodEnd: result.subscription.currentPeriodEnd,
                    nextBillingDate: result.subscription.nextBillingDate,
                },
                previousPlan: {
                    id: result.subscription.previousPlanId,
                },
                currentPlan: {
                    id: result.subscription.currentPlanId,
                },
                invoice: result.invoice ? {
                    id: result.invoice.id,
                    number: result.invoice.number,
                    totalAmount: result.invoice.totalAmount,
                    subtotal: result.invoice.subtotal,
                    taxAmount: result.invoice.taxAmount,
                    currency: result.invoice.currency,
                    status: result.invoice.status,
                    paymentStatus: result.invoice.paymentStatus,
                    issueDate: result.invoice.issueDate,
                    dueDate: result.invoice.dueDate,
                    billingPeriodStart: result.invoice.billingPeriodStart,
                    billingPeriodEnd: result.invoice.billingPeriodEnd,
                    billingCycle: result.invoice.billingCycle,
                    // ✅ Include plan transitions
                    previousPlanName: result.invoice.previousPlanName,
                    previousPlanSnapshot: result.invoice.previousPlanSnapshot,
                    planName: result.invoice.planName,
                    planSnapshot: result.invoice.planSnapshot,
                    // ✅ Include upgrade details
                    upgradeDetails: result.invoice.upgradeDetails,
                    // ✅ Include itemized charges
                    lineItems: result.invoice.lineItems,
                } : null,
                proration: result.proration ?? null,
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            console.error('[SUBSCRIPTION] Upgrade failed:', err.message)
            sendError(res, 500, err.message || 'Failed to upgrade plan')
        } finally {
            await session?.endSession()
        }
    },

    /**
     * Get subscriptions due for renewal
     * GET /platform/subscriptions/renewal/due
     * 
     * Returns subscriptions where nextBillingDate <= today and status = active
     */
    async getSubscriptionsDueForRenewal(_req: Request, res: Response): Promise<void> {
        try {
            const now = new Date()

            const subscriptions = await BillingSubscription.find({
                nextBillingDate: { $lte: now },
                status: 'active',
            })
                .sort({ nextBillingDate: 1 })
                .limit(100)
                .lean()

            sendSuccess(res, 200, 'Subscriptions due for renewal retrieved', {
                count: subscriptions.length,
                subscriptions: subscriptions.map((sub: any) => ({
                    id: sub._id,
                    organizationId: sub.organizationId,
                    nextBillingDate: sub.nextBillingDate,
                    currentPlanId: sub.currentPlanId,
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve subscriptions due for renewal')
        }
    },

    /**
     * Get current billing period for organization
     * GET /platform/billing/periods/:organizationId
     */
    async getBillingPeriod(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId } = req.params

            if (!organizationId) {
                sendError(res, 400, 'organizationId is required')
                return
            }

            // Import BillingPeriod model
            const { BillingPeriod } = await import('../models/BillingPeriod')

            // Get active billing period for organization
            const period = await BillingPeriod.findOne({
                organizationId,
                status: 'active',
            })
                .sort({ createdAt: -1 })
                .lean()

            if (!period) {
                sendSuccess(res, 200, 'No active billing period found', { data: null })
                return
            }

            sendSuccess(res, 200, 'Billing period retrieved', {
                data: {
                    _id: period._id,
                    organizationId: period.organizationId,
                    subscriptionId: period.subscriptionId,
                    planId: period.planId,
                    billingCycle: period.billingCycle,
                    periodStart: period.periodStart,
                    periodEnd: period.periodEnd,
                    nextBillingDate: period.nextBillingDate,
                    status: period.status,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve billing period')
        }
    },
}
