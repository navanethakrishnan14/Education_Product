/**
 * SUBSCRIPTION SERVICE
 * 
 * Handles complete subscription lifecycle:
 * - Create subscription for new organization
 * - Process plan upgrades (with proration)
 * - Handle plan renewals
 * - Manage scheduled plan changes
 * - Track subscription history
 * 
 * All dates and calculations are server-driven
 */

import { BillingSubscription, IBillingSubscription } from '../models/BillingSubscription'
import { BillingPeriod } from '../models/BillingPeriod'
import { Employee } from '../models/Employee'
import { SubscriptionHistory } from '../models/SubscriptionHistory'
import { BillingPlan } from '../models/BillingPlan'
import { Organization } from '../models/Organization'
import { invoiceService } from './invoiceService'
import { billingCalculationService } from './billingCalculation.service'
import { AppError } from '../middleware/errorHandler'
import mongoose from 'mongoose'

// ── Types ───────────────────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
    organizationId: string | mongoose.Types.ObjectId
    planId: string | mongoose.Types.ObjectId
    billingCycle: 'monthly' | 'annual'
    startDate?: Date
    currency?: string
    discountPercentage?: number
}

function resolvePlanTrialDays(plan?: { freeTrial?: string | null; trialPeriodDays?: number | null } | null): number {
    if (!plan) return 0

    const explicitDays = Number(plan.trialPeriodDays ?? 0)
    if (Number.isFinite(explicitDays) && explicitDays > 0) {
        return explicitDays
    }

    if (!plan.freeTrial || plan.freeTrial === 'none') return 0
    const match = String(plan.freeTrial).match(/(\d+)/)
    return match ? Number(match[1]) : 0
}

export interface UpgradeSubscriptionInput {
    newPlanId: string | mongoose.Types.ObjectId
    effectiveDate?: Date
}

// ── Subscription Service ────────────────────────────────────────────────────

class SubscriptionService {
    /**
     * Create a new subscription for an organization
     * 
     * This is called when:
     * 1. Organization is created with a plan
     * 2. Organization selects a plan for the first time
     * 
     * Process:
     * 1. Validate organization and plan exist
     * 2. Check if subscription already exists
     * 3. Calculate billing period dates
     * 4. Create subscription document
     * 5. Create first billing period
     * 6. Create initial invoice
     * 7. Create subscription history entry
     * 8. Update Organization.planId (if not already set)
     * 
     * @param input Subscription creation parameters
     * @param session Optional MongoDB session for transactions
     * @returns Created subscription
     */
    async createSubscription(
        input: CreateSubscriptionInput,
        session?: mongoose.ClientSession
    ): Promise<IBillingSubscription> {
        try {
            // Validate organization exists
            const organization = await Organization.findById(input.organizationId).lean()
            if (!organization) {
                throw new AppError('Organization not found', 404)
            }

            // Validate plan exists and is active
            const plan = await BillingPlan.findById(input.planId).lean()
            if (!plan) {
                throw new AppError('Plan not found', 404)
            }

            if (plan.status !== 'active') {
                throw new AppError('Plan is not available for subscription', 400)
            }

            // Check if subscription already exists
            const existingSubscription = await BillingSubscription.findOne({
                organizationId: input.organizationId,
                status: 'active',
            })

            if (existingSubscription) {
                throw new AppError('Organization already has an active subscription', 400)
            }

            // Use provided start date or today
            const subscriptionStartDate = input.startDate || new Date()
            const billingCycle = input.billingCycle || 'monthly'
            const currency = input.currency || plan.currency || 'USD'
            const discountPercentage = Number(input.discountPercentage ?? plan.discountPercentage ?? 0)
            const trialDays = resolvePlanTrialDays(plan)
            const trialEndsAt = trialDays > 0 ? new Date(subscriptionStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            // Calculate billing period
            const currentPeriodStart = subscriptionStartDate
            const currentPeriodEnd = billingCalculationService.calculatePeriodEnd(
                currentPeriodStart,
                billingCycle
            )
            const nextBillingDate = billingCalculationService.calculateNextBillingDate(
                currentPeriodEnd,
                billingCycle
            )

            // Create subscription document
            const subscriptionData = {
                organizationId: input.organizationId,
                currentPlanId: input.planId,
                discountPercentage,
                billingCycle,
                subscriptionStartDate,
                currentPeriodStart,
                currentPeriodEnd,
                nextBillingDate,
                trialEndsAt,
                status: trialDays > 0 ? 'trial' : 'active',
                currency,
                // Legacy fields
                tenantName: organization.name,
                tenantInitials: this.generateInitials(organization.name),
                tenantColor: this.generateColor(organization._id.toString()),
                planName: plan.name,
                planType: plan.code,
                monthlyAmount: plan.monthlyPrice,
                renewalDate: nextBillingDate,
                seatCount: 1,
                isActive: true,
            }

            const subscriptionDoc = new BillingSubscription(subscriptionData)
            await subscriptionDoc.save(session ? { session } : {})
            const subscription = subscriptionDoc as IBillingSubscription

            // Create first billing period
            const periodData = {
                organizationId: input.organizationId,
                subscriptionId: subscription._id,
                planId: input.planId,
                billingCycle,
                periodStart: currentPeriodStart,
                periodEnd: currentPeriodEnd,
                nextBillingDate,
                status: 'active',
            }

            const periodDoc = new BillingPeriod(periodData)
            await periodDoc.save(session ? { session } : {})

            // Create initial invoice
            const getPriceKey = billingCycle === 'annual' ? 'annualPrice' : 'monthlyPrice'
            const planPrice = plan[getPriceKey as keyof typeof plan] || 0
            const employeeCount = Math.max(1, await Employee.countDocuments({ organizationId: input.organizationId }))

            const invoiceLineItems = [
                {
                    description: `${plan.name} subscription (${billingCycle})`,
                    planId: plan._id.toString(),
                    planName: plan.name,
                    quantity: employeeCount,
                    unitPrice: planPrice,
                    amount: planPrice * employeeCount,
                    type: 'subscription' as const,
                },
            ]

            const subtotal = planPrice * employeeCount
            const discount = billingCalculationService.calculateDiscount(subtotal, discountPercentage)
            const taxAmount = billingCalculationService.calculateTax(discount.subtotalAfterDiscount, 18)
            const totalAmount = billingCalculationService.calculateTotal(subtotal, discount.discountAmount, 0, taxAmount)

            const invoice = await invoiceService.createInvoice(
                {
                    organizationId: input.organizationId,
                    subscriptionId: String(subscription._id),
                    planId: input.planId,
                    billingPeriodStart: currentPeriodStart,
                    billingPeriodEnd: currentPeriodEnd,
                    lineItems: invoiceLineItems,
                    subtotal,
                    subtotalBeforeDiscount: subtotal,
                    subtotalAfterDiscount: discount.subtotalAfterDiscount,
                    discountPercentage,
                    discountAmount: discount.discountAmount,
                    taxAmount,
                    totalAmount,
                    currency,
                    status: 'issued',
                },
                session
            )

            // Create subscription history entry
            await SubscriptionHistory.create(
                [
                    {
                        organizationId: input.organizationId,
                        subscriptionId: subscription._id,
                        changeType: 'initial',
                        newPlanId: input.planId,
                        newPlanName: plan.name,
                        effectiveDate: subscriptionStartDate,
                        previousPeriodStart: subscriptionStartDate,
                        previousPeriodEnd: subscriptionStartDate,
                        newPeriodStart: currentPeriodStart,
                        newPeriodEnd: currentPeriodEnd,
                        oldPlanAmount: 0,
                        newPlanAmount: planPrice,
                        proratedCredit: 0,
                        proratedCharge: 0,
                        subtotalBeforeDiscount: subtotal,
                        subtotalAfterDiscount: discount.subtotalAfterDiscount,
                        discountPercentage,
                        discountAmount: discount.discountAmount,
                        finalAmount: totalAmount,
                        invoiceId: invoice._id,
                        changedBy: 'system',
                    },
                ],
                session ? { session } : {}
            )

            // Update organization.planId if not already set
            if (!organization.planId) {
                await Organization.findByIdAndUpdate(
                    input.organizationId,
                    { planId: input.planId },
                    { session }
                )
            }

            return subscription
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Subscription creation failed: ${err.message}`, 500)
        }
    }

    /**
     * Get subscription for an organization
     * 
     * @param organizationId Organization ID
     * @returns Active subscription or null
     */
    async getSubscription(organizationId: string | mongoose.Types.ObjectId): Promise<IBillingSubscription | null> {
        const subscription = await BillingSubscription.findOne({
            organizationId,
            status: { $in: ['active', 'trial', 'expired', 'past_due', 'cancelled'] },
        }).sort({ createdAt: -1 }).lean().exec()

        return subscription as any
    }

    /**
     * Upgrade or downgrade plan
     * 
     * UPGRADE (higher price):
     * - Calculate proration for remaining period
     * - Create upgrade invoice
     * - Update subscription currentPlanId
     * - Create history entry
     * - Keep currentPeriodEnd unchanged
     * 
     * DOWNGRADE (lower price):
     * - Schedule plan change for next period
     * - Store in scheduledPlanId
     * - No charge today
     * - Downgrade applies at renewal
     * 
     * @param subscriptionId Subscription ID
     * @param input Upgrade parameters
     * @param session Optional transaction session
     * @returns Updated subscription with invoice details
     */
    async upgradePlan(
        subscriptionId: string | mongoose.Types.ObjectId,
        input: UpgradeSubscriptionInput,
        session?: mongoose.ClientSession
    ): Promise<{
        subscription: IBillingSubscription;
        invoiceId?: string;
        invoice?: any;
        proration?: any
    }> {
        try {
            // Get current subscription
            const subscription = await BillingSubscription.findById(subscriptionId)
            if (!subscription) {
                throw new AppError('Subscription not found', 404)
            }

            if (!['active', 'trial', 'expired', 'past_due', 'cancelled'].includes(subscription.status)) {
                throw new AppError('Subscription is not in a state that can be upgraded', 400)
            }

            // Get new plan
            const newPlan = await BillingPlan.findById(input.newPlanId).lean()
            if (!newPlan) {
                throw new AppError('Target plan not found', 404)
            }

            if (newPlan.status !== 'active') {
                throw new AppError('Target plan is not available', 400)
            }

            // Get current plan for comparison
            const currentPlan = await BillingPlan.findById(subscription.currentPlanId).lean()
            if (!currentPlan) {
                throw new AppError('Current plan not found', 404)
            }

            // Determine if it's upgrade or downgrade
            const getPriceKey = subscription.billingCycle === 'annual' ? 'annualPrice' : 'monthlyPrice'
            const currentPrice = currentPlan[getPriceKey as keyof typeof currentPlan] || 0
            const newPrice = newPlan[getPriceKey as keyof typeof newPlan] || 0

            const isUpgrade = newPrice > currentPrice
            const effectiveDate = input.effectiveDate || new Date()
            const expiredBillingWindow = ['expired', 'cancelled', 'past_due'].includes(subscription.status)
                && (effectiveDate < subscription.currentPeriodStart || effectiveDate > subscription.currentPeriodEnd)

            if (isUpgrade) {
                if (expiredBillingWindow) {
                    return await this.processExpiredSubscriptionReactivation(
                        subscription,
                        newPlan,
                        currentPlan,
                        currentPrice,
                        newPrice,
                        effectiveDate,
                        session,
                    )
                }

                // ── UPGRADE LOGIC ───────────────────────────────────────────
                return await this.processUpgrade(
                    subscription,
                    newPlan,
                    currentPlan,
                    currentPrice,
                    newPrice,
                    effectiveDate,
                    session
                )
            } else {
                // ── DOWNGRADE LOGIC ─────────────────────────────────────────
                // Schedule for next period
                subscription.scheduledPlanId = input.newPlanId.toString() as any
                subscription.scheduledChangeDate = subscription.currentPeriodEnd
                await subscription.save({ session })

                return { subscription }
            }
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Plan upgrade failed: ${err.message}`, 500)
        }
    }

    /**
     * Process subscription renewal
     * Called by cron job on renewal date
     * 
     * @param subscriptionId Subscription ID
     * @param session Optional transaction session
     * @returns Renewed subscription
     */
    async renewSubscription(
        subscriptionId: string | mongoose.Types.ObjectId,
        session?: mongoose.ClientSession
    ): Promise<IBillingSubscription> {
        try {
            const subscription = await BillingSubscription.findById(subscriptionId)
            if (!subscription) {
                throw new AppError('Subscription not found', 404)
            }

            if (subscription.status !== 'active') {
                throw new AppError('Subscription is not active', 400)
            }

            // Check if renewal is due
            if (new Date() < subscription.nextBillingDate) {
                throw new AppError('Subscription renewal is not yet due', 400)
            }

            // Close current period
            const currentPeriod = await BillingPeriod.findOne({
                subscriptionId,
                status: 'active',
            })

            if (currentPeriod) {
                currentPeriod.status = 'closed'
                await currentPeriod.save({ session })
            }

            // Determine new plan (use scheduled if exists)
            let newPlanId = subscription.currentPlanId
            if (subscription.scheduledPlanId) {
                newPlanId = subscription.scheduledPlanId
                subscription.scheduledPlanId = null
                subscription.scheduledChangeDate = null
            }

            const newPlan = await BillingPlan.findById(newPlanId).lean()
            if (!newPlan) {
                throw new AppError('Plan not found during renewal', 404)
            }

            // Calculate new period
            const newPeriodStart = new Date(subscription.currentPeriodEnd)
            newPeriodStart.setDate(newPeriodStart.getDate() + 1)

            const newPeriodEnd = billingCalculationService.calculatePeriodEnd(
                newPeriodStart,
                subscription.billingCycle
            )

            const newNextBillingDate = billingCalculationService.calculateNextBillingDate(
                newPeriodEnd,
                subscription.billingCycle
            )

            // Create new period
            const periodData = {
                organizationId: subscription.organizationId,
                subscriptionId,
                planId: newPlanId,
                billingCycle: subscription.billingCycle,
                periodStart: newPeriodStart,
                periodEnd: newPeriodEnd,
                nextBillingDate: newNextBillingDate,
                status: 'active',
            }

            await BillingPeriod.create([periodData], session ? { session } : {})

            // Create renewal invoice
            const getPriceKey = subscription.billingCycle === 'annual' ? 'annualPrice' : 'monthlyPrice'
            const planPrice = newPlan[getPriceKey as keyof typeof newPlan] || 0
            const employeeCount = Math.max(1, await Employee.countDocuments({ organizationId: subscription.organizationId }))

            const invoiceLineItems = [
                {
                    description: `${newPlan.name} renewal (${subscription.billingCycle})`,
                    planId: newPlanId.toString(),
                    planName: newPlan.name,
                    quantity: employeeCount,
                    unitPrice: planPrice,
                    amount: planPrice * employeeCount,
                    type: 'subscription' as const,
                },
            ]

            const renewalDiscountPercentage = Number(subscription.discountPercentage ?? newPlan.discountPercentage ?? 0)
            const renewalSubtotal = planPrice * employeeCount
            const renewalDiscount = billingCalculationService.calculateDiscount(renewalSubtotal, renewalDiscountPercentage)
            const renewalTaxAmount = billingCalculationService.calculateTax(renewalDiscount.subtotalAfterDiscount, 18)
            const totalAmount = billingCalculationService.calculateTotal(renewalSubtotal, renewalDiscount.discountAmount, 0, renewalTaxAmount)

            const invoice = await invoiceService.createInvoice(
                {
                    organizationId: subscription.organizationId,
                    subscriptionId,
                    planId: newPlanId,
                    billingPeriodStart: newPeriodStart,
                    billingPeriodEnd: newPeriodEnd,
                    lineItems: invoiceLineItems,
                    subtotal: renewalSubtotal,
                    subtotalBeforeDiscount: renewalSubtotal,
                    subtotalAfterDiscount: renewalDiscount.subtotalAfterDiscount,
                    discountPercentage: renewalDiscountPercentage,
                    discountAmount: renewalDiscount.discountAmount,
                    taxAmount: renewalTaxAmount,
                    totalAmount,
                    currency: subscription.currency,
                    status: 'issued',
                },
                session
            )

            // Create history entry
            await SubscriptionHistory.create(
                [
                    {
                        organizationId: subscription.organizationId,
                        subscriptionId,
                        changeType: 'renewal',
                        previousPlanId: subscription.currentPlanId,
                        previousPlanName: (await BillingPlan.findById(subscription.currentPlanId).lean())?.name,
                        newPlanId,
                        newPlanName: newPlan.name,
                        effectiveDate: newPeriodStart,
                        previousPeriodStart: subscription.currentPeriodStart,
                        previousPeriodEnd: subscription.currentPeriodEnd,
                        newPeriodStart,
                        newPeriodEnd,
                        oldPlanAmount: planPrice,
                        newPlanAmount: planPrice,
                        proratedCredit: 0,
                        proratedCharge: 0,
                        finalAmount: totalAmount,
                        invoiceId: invoice._id,
                        changedBy: 'system',
                    },
                ],
                session ? { session } : {}
            )

            // Update subscription dates
            subscription.previousPlanId = subscription.currentPlanId
            subscription.currentPlanId = newPlanId
            subscription.currentPeriodStart = newPeriodStart
            subscription.currentPeriodEnd = newPeriodEnd
            subscription.nextBillingDate = newNextBillingDate
            subscription.lastPlanChangeDate = new Date()
            subscription.discountPercentage = renewalDiscountPercentage

            await subscription.save({ session })

            // Update Organization.planId
            await Organization.findByIdAndUpdate(
                subscription.organizationId,
                { planId: newPlanId },
                { session }
            )

            return subscription
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Subscription renewal failed: ${err.message}`, 500)
        }
    }

    /**
     * Get subscription history
     * 
     * @param subscriptionId Subscription ID
     * @param limit Number of entries to return
     * @returns Array of history entries
     */
    async getSubscriptionHistory(subscriptionId: string | mongoose.Types.ObjectId, limit: number = 50) {
        return await SubscriptionHistory.find({ subscriptionId })
            .sort({ effectiveDate: -1 })
            .limit(Math.min(limit, 100))
            .lean()
    }

    // ── Private Helper Methods ──────────────────────────────────────────────

    private async processExpiredSubscriptionReactivation(
        subscription: any,
        newPlan: any,
        currentPlan: any,
        currentPrice: number,
        newPrice: number,
        effectiveDate: Date,
        session?: mongoose.ClientSession
    ) {
        const employees = await Employee.countDocuments({ organizationId: subscription.organizationId })
        const newPeriodStart = new Date(effectiveDate)
        const newPeriodEnd = billingCalculationService.calculatePeriodEnd(newPeriodStart, subscription.billingCycle)
        const newNextBillingDate = billingCalculationService.calculateNextBillingDate(newPeriodEnd, subscription.billingCycle)

        const invoiceLineItems = [{
            description: `${newPlan.name} subscription (${subscription.billingCycle})`,
            planId: newPlan._id.toString(),
            planName: newPlan.name,
            quantity: employees,
            unitPrice: newPrice,
            amount: newPrice * employees,
            type: 'subscription' as const,
        }]

        const subtotal = newPrice * employees
        const discountPercentage = Number(newPlan.discountPercentage ?? subscription.discountPercentage ?? 0)
        const discount = billingCalculationService.calculateDiscount(subtotal, discountPercentage)
        const taxAmount = billingCalculationService.calculateTax(discount.subtotalAfterDiscount, 18)
        const totalAmount = billingCalculationService.calculateTotal(subtotal, discount.discountAmount, 0, taxAmount)

        const invoice = await invoiceService.createInvoice(
            {
                organizationId: subscription.organizationId,
                subscriptionId: subscription._id,
                planId: newPlan._id,
                previousPlanId: currentPlan._id,
                billingPeriodStart: newPeriodStart,
                billingPeriodEnd: newPeriodEnd,
                lineItems: invoiceLineItems,
                subtotal,
                subtotalBeforeDiscount: subtotal,
                subtotalAfterDiscount: discount.subtotalAfterDiscount,
                discountPercentage,
                discountAmount: discount.discountAmount,
                taxAmount,
                totalAmount,
                currency: subscription.currency,
                status: 'issued',
                upgradeDetails: {
                    previousPlanId: currentPlan._id.toString(),
                    newPlanId: newPlan._id.toString(),
                    upgradeDate: effectiveDate,
                    totalDays: 0,
                    usedDays: 0,
                    remainingDays: 0,
                    oldPlanCredit: 0,
                    newPlanProratedCharge: subtotal,
                    netUpgradeAmount: subtotal,
                    previousPlanDays: 0,
                    newPlanDays: 0,
                    billingPeriodDays: 0,
                    previousPlanDailyRate: 0,
                    newPlanDailyRate: 0,
                    previousPlanAmount: 0,
                    newPlanAmount: subtotal,
                    billingPeriodStart: newPeriodStart,
                    billingPeriodEnd: newPeriodEnd,
                    quantity: employees,
                    previousPlanPrice: currentPrice,
                    newPlanPrice: newPrice,
                    subtotal,
                    taxableSubtotal: discount.subtotalAfterDiscount,
                    taxRate: 18,
                    taxAmount,
                    totalAmount,
                },
            },
            session,
        )

        subscription.previousPlanId = subscription.currentPlanId
        subscription.currentPlanId = newPlan._id
        subscription.discountPercentage = discountPercentage
        subscription.lastPlanChangeDate = new Date()
        subscription.monthlyAmount = newPrice
        subscription.planName = newPlan.name
        subscription.planType = newPlan.code
        subscription.currentPeriodStart = newPeriodStart
        subscription.currentPeriodEnd = newPeriodEnd
        subscription.nextBillingDate = newNextBillingDate
        subscription.renewalDate = newNextBillingDate
        subscription.status = 'active'
        subscription.isActive = true
        subscription.scheduledPlanId = null
        subscription.scheduledChangeDate = null
        await subscription.save({ session })

        const activePeriod = await BillingPeriod.findOne({ subscriptionId: subscription._id, status: 'active' }).session(session || null)
        if (activePeriod) {
            activePeriod.planId = newPlan._id.toString()
            activePeriod.billingCycle = subscription.billingCycle
            activePeriod.periodStart = newPeriodStart
            activePeriod.periodEnd = newPeriodEnd
            activePeriod.nextBillingDate = newNextBillingDate
            await activePeriod.save({ session })
        }

        await SubscriptionHistory.create([
            {
                organizationId: subscription.organizationId,
                subscriptionId: subscription._id,
                changeType: 'upgrade',
                previousPlanId: subscription.previousPlanId,
                previousPlanName: currentPlan.name,
                newPlanId: newPlan._id,
                newPlanName: newPlan.name,
                effectiveDate,
                previousPeriodStart: subscription.currentPeriodStart,
                previousPeriodEnd: subscription.currentPeriodEnd,
                newPeriodStart,
                newPeriodEnd,
                oldPlanAmount: currentPrice,
                newPlanAmount: newPrice,
                proratedCredit: 0,
                proratedCharge: subtotal,
                finalAmount: totalAmount,
                invoiceId: invoice._id,
                changedBy: 'user',
            },
        ], session ? { session } : {})

        await Organization.findByIdAndUpdate(subscription.organizationId, { planId: newPlan._id }, { session })

        return {
            subscription,
            invoiceId: invoice._id.toString(),
            invoice: {
                id: invoice._id.toString(),
                number: invoice.number,
                previousPlanSnapshot: {
                    name: currentPlan.name,
                    code: currentPlan.code,
                    monthlyPrice: currentPlan.monthlyPrice,
                    annualPrice: currentPlan.annualPrice,
                    maxSeats: currentPlan.maxSeats,
                    storageGb: currentPlan.storageGb,
                    modules: currentPlan.modules,
                },
                planSnapshot: {
                    name: newPlan.name,
                    code: newPlan.code,
                    monthlyPrice: newPlan.monthlyPrice,
                    annualPrice: newPlan.annualPrice,
                    maxSeats: newPlan.maxSeats,
                    storageGb: newPlan.storageGb,
                    modules: newPlan.modules,
                },
                upgradeDetails: {
                    previousPlanId: currentPlan._id.toString(),
                    newPlanId: newPlan._id.toString(),
                    upgradeDate: effectiveDate,
                    totalDays: 0,
                    usedDays: 0,
                    remainingDays: 0,
                    oldPlanCredit: 0,
                    newPlanProratedCharge: subtotal,
                    netUpgradeAmount: subtotal,
                    previousPlanDays: 0,
                    newPlanDays: 0,
                    billingPeriodDays: 0,
                    previousPlanDailyRate: 0,
                    newPlanDailyRate: 0,
                    previousPlanAmount: 0,
                    newPlanAmount: subtotal,
                    employeeCount: employees,
                    previousPlanPrice: currentPrice,
                    newPlanPrice: newPrice,
                    taxRate: 18,
                    taxAmount,
                    totalAmount,
                },
                lineItems: invoiceLineItems,
                subtotal,
                creditAmount: 0,
                taxAmount,
                totalAmount,
                billingPeriodStart: newPeriodStart,
                billingPeriodEnd: newPeriodEnd,
            },
            proration: {
                oldPlanPrice: currentPrice,
                newPlanPrice: newPrice,
                employeeCount: employees,
                usedDays: 0,
                remainingDays: 0,
                totalDaysInPeriod: 0,
                oldPlanDailyRate: 0,
                oldPlanUsedAmount: 0,
                oldPlanUnusedCredit: 0,
                newPlanDailyRate: 0,
                newPlanRemainingAmount: subtotal,
                upgradeAmount: subtotal,
                proratedCredit: 0,
                proratedCharge: subtotal,
            },
        }
    }

    /**
     * Process a plan upgrade with proration
     * 
     * CRITICAL FIX: Get old plan BEFORE updating subscription
     * This ensures we can calculate proration correctly
     */
    private async processUpgrade(
        subscription: any,
        newPlan: any,
        currentPlan: any,
        currentPrice: number,
        newPrice: number,
        effectiveDate: Date,
        session?: mongoose.ClientSession
    ) {
        // ✅ CRITICAL: Get employee count for multi-seat pricing
        // This is needed for accurate per-employee proration
        // Billing is based on the employees belonging to this organization.
        // Do not fall back to the subscription seat count: that value is only
        // legacy metadata and can be stale.
        const employees = await Employee.countDocuments({
            organizationId: subscription.organizationId,
        })

        // Calculate proration using employee count
        const proration = billingCalculationService.calculateProration(
            currentPrice * employees,
            newPrice * employees,
            subscription.currentPeriodStart,
            subscription.currentPeriodEnd,
            effectiveDate
        )

        // ✅ CRITICAL: Create invoice BEFORE modifying subscription
        // This ensures we capture the old plan state
        console.log(`[UPGRADE] Processing plan upgrade for organization: ${subscription.organizationId}`)
        console.log(`[UPGRADE] Current plan: ${currentPlan.name} ($${currentPrice}/mo), New plan: ${newPlan.name} ($${newPrice}/mo)`)
        console.log(`[UPGRADE] Employee count: ${employees}, Proration details:`, {
            usedDays: proration.usedDays,
            remainingDays: proration.remainingDays,
            oldPlanUnusedCredit: proration.oldPlanUnusedCredit,
            newPlanRemainingAmount: proration.newPlanRemainingAmount,
            upgradeAmount: proration.upgradeAmount,
        })

        const invoiceLineItems = [
            {
                description: `${currentPlan.name} - prorated usage (${proration.previousPlanDays} day${proration.previousPlanDays === 1 ? '' : 's'}, ${employees} employee${employees > 1 ? 's' : ''})`,
                planId: subscription.currentPlanId.toString(),
                planName: currentPlan.name,
                quantity: employees,
                unitPrice: proration.previousPlanAmount / employees,
                amount: proration.previousPlanAmount,
                type: 'prorated_charge' as const,
            },
            {
                description: `${newPlan.name} - prorated usage (${proration.newPlanDays} day${proration.newPlanDays === 1 ? '' : 's'}, ${employees} employee${employees > 1 ? 's' : ''})`,
                planId: newPlan._id.toString(),
                planName: newPlan.name,
                quantity: employees,
                unitPrice: proration.newPlanAmount / employees,
                amount: proration.newPlanAmount,
                type: 'prorated_charge' as const,
            },
        ]

        const subtotal = proration.subtotal
        const creditAmount = 0
        const chargeableSubtotal = subtotal
        const discountPercentage = Number(newPlan.discountPercentage ?? subscription.discountPercentage ?? 0)
        const discount = billingCalculationService.calculateDiscount(chargeableSubtotal, discountPercentage)
        const taxableSubtotal = discount.subtotalAfterDiscount
        const taxRate = 18
        const taxAmount = billingCalculationService.calculateTax(taxableSubtotal, taxRate)
        const totalAmount = billingCalculationService.calculateTotal(subtotal, discount.discountAmount, 0, taxAmount)

        console.log(`[UPGRADE] Invoice calculation: subtotal=$${subtotal}, tax=$${taxAmount}, total=$${totalAmount}`)

        // ✅ Create upgrade invoice with previousPlanSnapshot
        const invoice = await invoiceService.createInvoice(
            {
                organizationId: subscription.organizationId,
                subscriptionId: subscription._id,
                planId: newPlan._id,
                previousPlanId: currentPlan._id,
                billingPeriodStart: subscription.currentPeriodStart,
                billingPeriodEnd: subscription.currentPeriodEnd,
                lineItems: invoiceLineItems,
                subtotal,
                subtotalBeforeDiscount: subtotal,
                subtotalAfterDiscount: discount.subtotalAfterDiscount,
                discountPercentage,
                discountAmount: discount.discountAmount,
                creditAmount,
                taxRate,
                taxAmount,
                totalAmount,
                currency: subscription.currency,
                status: 'issued',
                upgradeDetails: {
                    previousPlanId: currentPlan._id.toString(),
                    newPlanId: newPlan._id.toString(),
                    upgradeDate: effectiveDate,
                    totalDays: proration.totalDaysInPeriod,
                    usedDays: proration.usedDays,
                    remainingDays: proration.remainingDays,
                    oldPlanCredit: creditAmount,
                    newPlanProratedCharge: proration.newPlanAmount,
                    netUpgradeAmount: chargeableSubtotal,
                    previousPlanDays: proration.previousPlanDays,
                    newPlanDays: proration.newPlanDays,
                    billingPeriodDays: proration.billingPeriodDays,
                    previousPlanDailyRate: proration.previousPlanDailyRate,
                    newPlanDailyRate: proration.newPlanDailyRate,
                    previousPlanAmount: proration.previousPlanAmount,
                    newPlanAmount: proration.newPlanAmount,
                    billingPeriodStart: subscription.currentPeriodStart,
                    billingPeriodEnd: subscription.currentPeriodEnd,
                    quantity: employees,
                    previousPlanPrice: currentPrice,
                    newPlanPrice: newPrice,
                    subtotal,
                    taxableSubtotal,
                    taxRate,
                    taxAmount,
                    totalAmount,
                },
            },
            session
        )

        console.log(`[UPGRADE] Invoice created successfully: ${invoice._id} (#${invoice.number})`)

        const newPeriodStart = new Date(effectiveDate)
        const newPeriodEnd = billingCalculationService.calculatePeriodEnd(
            newPeriodStart,
            subscription.billingCycle
        )
        const newNextBillingDate = billingCalculationService.calculateNextBillingDate(
            newPeriodEnd,
            subscription.billingCycle
        )

        // ✅ NOW update subscription AFTER successful invoice creation
        subscription.previousPlanId = subscription.currentPlanId
        subscription.currentPlanId = newPlan._id
        subscription.discountPercentage = discountPercentage
        subscription.lastPlanChangeDate = new Date()
        subscription.monthlyAmount = newPrice
        subscription.planName = newPlan.name
        subscription.planType = newPlan.code
        subscription.currentPeriodStart = newPeriodStart
        subscription.currentPeriodEnd = newPeriodEnd
        subscription.nextBillingDate = newNextBillingDate
        subscription.renewalDate = newNextBillingDate
        subscription.scheduledPlanId = null
        subscription.scheduledChangeDate = null

        await subscription.save({ session })
        console.log(`[UPGRADE] Subscription updated: previousPlanId=${subscription.previousPlanId}, currentPlanId=${subscription.currentPlanId}`)

        const activePeriod = await BillingPeriod.findOne({
            subscriptionId: subscription._id,
            status: 'active',
        }).session(session || null)
        if (!activePeriod) {
            throw new AppError('Active billing period not found', 409)
        }
        activePeriod.planId = newPlan._id.toString()
        activePeriod.billingCycle = subscription.billingCycle
        activePeriod.periodStart = newPeriodStart
        activePeriod.periodEnd = newPeriodEnd
        activePeriod.nextBillingDate = newNextBillingDate
        await activePeriod.save({ session })
        console.log(`[UPGRADE] Active billing period updated: planId=${activePeriod.planId}`)

        // ✅ Create history entry with all upgrade details
        await SubscriptionHistory.create(
            [
                {
                    organizationId: subscription.organizationId,
                    subscriptionId: subscription._id,
                    changeType: 'upgrade',
                    previousPlanId: subscription.previousPlanId,
                    previousPlanName: currentPlan.name,
                    newPlanId: newPlan._id,
                    newPlanName: newPlan.name,
                    effectiveDate,
                    previousPeriodStart: subscription.currentPeriodStart,
                    previousPeriodEnd: subscription.currentPeriodEnd,
                    newPeriodStart: subscription.currentPeriodStart,
                    newPeriodEnd: subscription.currentPeriodEnd,
                    oldPlanAmount: currentPrice,
                    newPlanAmount: newPrice,
                    proratedCredit: 0,
                    proratedCharge: subtotal,
                    finalAmount: totalAmount,
                    invoiceId: invoice._id,
                    changedBy: 'user',
                },
            ],
            session ? { session } : {}
        )
        console.log(`[UPGRADE] Subscription history created`)

        // ✅ Update Organization.planId
        await Organization.findByIdAndUpdate(
            subscription.organizationId,
            { planId: newPlan._id },
            { session }
        )
        console.log(`[UPGRADE] Organization.planId updated to ${newPlan._id}`)

        // ✅ Return complete response with invoice details
        console.log(`[UPGRADE] Upgrade complete - returning response with invoiceId=${invoice._id.toString()}, newPlanId=${newPlan._id}`)
        return {
            subscription,
            invoiceId: invoice._id.toString(),
            invoice: {
                id: invoice._id.toString(),
                number: invoice.number,
                previousPlanSnapshot: {
                    name: currentPlan.name,
                    code: currentPlan.code,
                    monthlyPrice: currentPlan.monthlyPrice,
                    annualPrice: currentPlan.annualPrice,
                    maxSeats: currentPlan.maxSeats,
                    storageGb: currentPlan.storageGb,
                    modules: currentPlan.modules,
                },
                planSnapshot: {
                    name: newPlan.name,
                    code: newPlan.code,
                    monthlyPrice: newPlan.monthlyPrice,
                    annualPrice: newPlan.annualPrice,
                    maxSeats: newPlan.maxSeats,
                    storageGb: newPlan.storageGb,
                    modules: newPlan.modules,
                },
                upgradeDetails: {
                    previousPlanId: currentPlan._id.toString(),
                    newPlanId: newPlan._id.toString(),
                    upgradeDate: effectiveDate,
                    totalDays: proration.totalDaysInPeriod,
                    usedDays: proration.usedDays,
                    remainingDays: proration.remainingDays,
                    oldPlanCredit: 0,
                    newPlanProratedCharge: proration.newPlanAmount,
                    netUpgradeAmount: subtotal,
                    previousPlanDays: proration.previousPlanDays,
                    newPlanDays: proration.newPlanDays,
                    billingPeriodDays: proration.billingPeriodDays,
                    previousPlanDailyRate: proration.previousPlanDailyRate,
                    newPlanDailyRate: proration.newPlanDailyRate,
                    previousPlanAmount: proration.previousPlanAmount,
                    newPlanAmount: proration.newPlanAmount,
                    employeeCount: employees,
                    previousPlanPrice: currentPrice,
                    newPlanPrice: newPrice,
                    taxRate,
                    taxAmount,
                    totalAmount,
                },
                lineItems: invoiceLineItems,
                subtotal,
                creditAmount: 0,
                taxAmount,
                totalAmount,
                billingPeriodStart: subscription.currentPeriodStart,
                billingPeriodEnd: subscription.currentPeriodEnd,
            },
            proration: {
                oldPlanPrice: currentPrice,
                newPlanPrice: newPrice,
                employeeCount: employees,
                usedDays: proration.usedDays,
                remainingDays: proration.remainingDays,
                totalDaysInPeriod: proration.totalDaysInPeriod,
                oldPlanDailyRate: proration.oldPlanDailyRate,
                oldPlanUsedAmount: proration.oldPlanUsedAmount,
                oldPlanUnusedCredit: 0,
                newPlanDailyRate: proration.newPlanDailyRate,
                newPlanRemainingAmount: proration.newPlanRemainingAmount,
                upgradeAmount: subtotal,
                proratedCredit: 0,
                proratedCharge: subtotal,
            },
        }
    }

    /**
     * Generate initials from string
     */
    private generateInitials(name: string): string {
        return name
            .split(' ')
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase())
            .join('')
            .slice(0, 4)
    }

    /**
     * Generate consistent color
     */
    private generateColor(id: string): string {
        const colors = [
            'bg-red-100',
            'bg-orange-100',
            'bg-yellow-100',
            'bg-green-100',
            'bg-blue-100',
            'bg-indigo-100',
            'bg-purple-100',
            'bg-pink-100',
        ]
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return colors[hash % colors.length]
    }
}

export const subscriptionService = new SubscriptionService()
