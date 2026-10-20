/**
 * CENTRALIZED BILLING CALCULATION SERVICE
 * 
 * All financial calculations must go through this service to ensure consistency
 * across the platform. This is the single source of truth for billing math.
 * 
 * IMPORTANT: Uses integers to avoid floating-point precision errors
 * Store all amounts as smallest currency unit (e.g., paise for INR, cents for USD)
 */

import { AppError } from '../middleware/errorHandler'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PeriodDates {
    periodStart: Date
    periodEnd: Date
}

export interface ProratedCalculation {
    previousPlanDays: number
    newPlanDays: number
    billingPeriodDays: number
    previousPlanDailyRate: number
    previousPlanAmount: number
    newPlanAmount: number
    subtotal: number
    usedDays: number
    remainingDays: number
    totalDaysInPeriod: number
    oldPlanDailyRate: number
    oldPlanUsedAmount: number
    oldPlanUnusedCredit: number
    newPlanDailyRate: number
    newPlanRemainingAmount: number
    upgradeAmount: number
    proratedCredit: number
    proratedCharge: number
}

export interface InvoiceLineItem {
    description: string
    quantity: number
    unitPrice: number
    amount: number
    type: 'subscription' | 'upgrade' | 'prorated_charge' | 'prorated_credit' | 'tax' | 'discount'
}

// ── Billing Calculation Service ─────────────────────────────────────────────

class BillingCalculationService {
    /**
     * Calculate the daily rate for a plan
     * 
     * @param planPrice Price for the entire period (stored in smallest currency unit)
     * @param periodStart Start of billing period
     * @param periodEnd End of billing period
     * @returns Daily rate and total days in period
     */
    calculateDailyRate(
        planPrice: number,
        periodStart: Date,
        periodEnd: Date
    ): { dailyRate: number; daysInPeriod: number } {
        if (planPrice < 0) {
            throw new AppError('Plan price cannot be negative', 400)
        }

        if (periodStart >= periodEnd) {
            throw new AppError('Period start must be before period end', 400)
        }

        const startDay = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate())
        const endDay = Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate())
        const daysInPeriod = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1

        if (daysInPeriod <= 0) {
            throw new AppError('Period must be at least 1 day', 400)
        }

        // Keep the fractional rate; round only the final charge.
        const dailyRate = planPrice / daysInPeriod

        return { dailyRate, daysInPeriod }
    }

    /**
     * Calculate proration for mid-period plan upgrade
     * 
     * EXAMPLE:
     * Period: Aug 7 (0:00 UTC) -> Sep 6 (23:59 UTC) = 31 days
     * Upgrade: Aug 20 (0:00 UTC)
     * Old Plan: ₹5,000 (₹500,000 in paise)
     * New Plan: ₹10,000 (₹1,000,000 in paise)
     * 
     * Calculation:
     * - Old daily rate: 500000 / 31 = ₹16,129 per day
     * - Used days: Aug 7-19 = 13 days
     * - Old used: 16129 × 13 = ₹209,677
     * - Old unused credit: 500000 - 209677 = ₹290,323
     * - New daily rate: 1000000 / 31 = ₹32,258 per day
     * - Remaining days: 31 - 13 = 18 days
     * - New remaining: 32258 × 18 = ₹580,644
     * - Upgrade charge: 580644 - 290323 = ₹290,321
     * 
     * @param oldPlanPrice Old plan price in smallest currency unit
     * @param newPlanPrice New plan price in smallest currency unit
     * @param periodStart Period start date
     * @param periodEnd Period end date
     * @param changeDate When the upgrade takes effect
     * @returns Proration calculation details
     */
    calculateProration(
        oldPlanPrice: number,
        newPlanPrice: number,
        periodStart: Date,
        periodEnd: Date,
        changeDate: Date
    ): ProratedCalculation {
        // Validate inputs
        if (oldPlanPrice < 0 || newPlanPrice < 0) {
            throw new AppError('Plan prices cannot be negative', 400)
        }

        if (changeDate < periodStart || changeDate > periodEnd) {
            throw new AppError('Change date must be within billing period', 400)
        }

        // Billing periods are inclusive calendar dates. Normalize to UTC days so
        // time-of-day differences cannot change the proration unexpectedly.
        const startDay = Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), periodStart.getUTCDate())
        const endDay = Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate())
        const changeDay = Date.UTC(changeDate.getUTCFullYear(), changeDate.getUTCMonth(), changeDate.getUTCDate())
        const millisecondsPerDay = 1000 * 60 * 60 * 24

        const totalDaysInPeriod = Math.floor((endDay - startDay) / millisecondsPerDay) + 1

        // The effective date belongs to the new plan. Days before it are used.
        const usedDays = Math.floor((changeDay - startDay) / millisecondsPerDay)

        const remainingDays = totalDaysInPeriod - usedDays

        if (remainingDays < 0) {
            throw new AppError('Remaining days cannot be negative', 400)
        }

        // Keep rates precise and round only final monetary amounts.
        const oldPlanDailyRate = oldPlanPrice / totalDaysInPeriod
        const oldPlanUsedAmount = Math.round(oldPlanDailyRate * usedDays * 100) / 100
        const oldPlanUnusedCredit = Math.max(0, Math.round((oldPlanPrice - oldPlanUsedAmount) * 100) / 100)

        // Calculate new plan rates and amounts
        const newPlanDailyRate = newPlanPrice / totalDaysInPeriod
        const newPlanRemainingAmount = Math.round(newPlanDailyRate * remainingDays * 100) / 100

        // Calculate final upgrade charge
        const proratedCredit = oldPlanUnusedCredit
        const proratedCharge = newPlanRemainingAmount
        const subtotal = Math.round((oldPlanUsedAmount + newPlanRemainingAmount) * 100) / 100

        return {
            previousPlanDays: usedDays,
            newPlanDays: remainingDays,
            billingPeriodDays: totalDaysInPeriod,
            previousPlanDailyRate: oldPlanDailyRate,
            previousPlanAmount: oldPlanUsedAmount,
            newPlanAmount: newPlanRemainingAmount,
            subtotal,
            usedDays,
            remainingDays,
            totalDaysInPeriod,
            oldPlanDailyRate,
            oldPlanUsedAmount,
            oldPlanUnusedCredit,
            newPlanDailyRate,
            newPlanRemainingAmount,
            upgradeAmount: subtotal,
            proratedCredit,
            proratedCharge,
        }
    }

    /**
     * Calculate tax amount based on subtotal and tax rate
     * 
     * @param subtotal Subtotal in smallest currency unit
     * @param taxRatePercent Tax rate as percentage (e.g., 18 for 18%)
     * @param gstin GSTIN (optional, for logging/audit)
     * @returns Tax amount in smallest currency unit
     */
    calculateTax(
        subtotal: number,
        taxRatePercent: number = 18,
        _gstin?: string
    ): number {
        if (subtotal < 0) {
            throw new AppError('Subtotal cannot be negative', 400)
        }

        if (taxRatePercent < 0 || taxRatePercent > 100) {
            throw new AppError('Tax rate must be between 0 and 100', 400)
        }

        // Calculate tax once and round to the currency's standard 2 decimals.
        const tax = Math.round(((subtotal * taxRatePercent) / 100) * 100) / 100

        return tax
    }

    calculateDiscount(subtotal: number, discountPercentage: number = 0): { discountAmount: number; subtotalAfterDiscount: number } {
        if (subtotal < 0) throw new AppError('Subtotal cannot be negative', 400)
        if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
            throw new AppError('Discount percentage must be between 0 and 100', 400)
        }
        const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100
        return {
            discountAmount,
            subtotalAfterDiscount: Math.round((subtotal - discountAmount) * 100) / 100,
        }
    }

    /**
     * Calculate next billing date based on current period end
     * 
     * @param periodEnd End date of current billing period
     * @param _billingCycle "monthly" or "annual"
     * @returns Next billing date (usually period end + 1 day)
     */
    calculateNextBillingDate(
        periodEnd: Date,
        _billingCycle: 'monthly' | 'annual'
    ): Date {
        const nextBillingDate = new Date(periodEnd)
        nextBillingDate.setDate(nextBillingDate.getDate() + 1)
        return nextBillingDate
    }

    /**
     * Calculate new period end date based on start date and billing cycle
     * 
     * IMPORTANT: Uses actual calendar dates, not approximate days
     * 
     * Monthly:
     * - Aug 7 -> Sep 6 (30 days)
     * - Sep 7 -> Oct 6 (29 days in Feb scenario)
     * 
     * @param periodStart Start date of new billing period
     * @param billingCycle "monthly" or "annual"
     * @returns End date of billing period
     */
    calculatePeriodEnd(
        periodStart: Date,
        billingCycle: 'monthly' | 'annual'
    ): Date {
        const periodEnd = new Date(periodStart)

        if (billingCycle === 'monthly') {
            // Add 1 month and subtract 1 day
            periodEnd.setMonth(periodEnd.getMonth() + 1)
            periodEnd.setDate(periodEnd.getDate() - 1)
        } else if (billingCycle === 'annual') {
            // Add 1 year and subtract 1 day
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
            periodEnd.setDate(periodEnd.getDate() - 1)
        } else {
            throw new AppError('Invalid billing cycle', 400)
        }

        return periodEnd
    }

    /**
     * Generate invoice line items from calculations
     * 
     * For subscription:
     * - Single line item with plan details
     * 
     * For upgrade:
     * - Old plan credit (negative)
     * - New plan prorated charge
     * - Tax (if applicable)
     * 
     * @param type Type of invoice
     * @param planName Name of the plan
     * @param calculation Billing calculation result
     * @param taxAmount Tax amount
     * @returns Array of invoice line items
     */
    generateInvoiceLineItems(
        type: 'subscription' | 'upgrade' | 'renewal',
        planName: string,
        calculation: { amount?: number; upgradeAmount?: number; proratedCredit?: number; proratedCharge?: number; daysInPeriod?: number },
        taxAmount: number = 0
    ): InvoiceLineItem[] {
        const lineItems: InvoiceLineItem[] = []

        if (type === 'subscription' || type === 'renewal') {
            // Simple subscription renewal
            const amount = calculation.amount || 0
            lineItems.push({
                description: `${planName} subscription`,
                quantity: 1,
                unitPrice: amount,
                amount: amount,
                type: 'subscription',
            })
        } else if (type === 'upgrade') {
            const previousPlanName = (calculation as any).previousPlanName || 'Previous plan'
            const previousPlanDays = (calculation as any).previousPlanDays ?? (calculation as any).usedDays ?? 0
            const newPlanDays = (calculation as any).newPlanDays ?? (calculation as any).remainingDays ?? 0
            const previousPlanAmount = (calculation as any).previousPlanAmount ?? (calculation as any).oldPlanUsedAmount ?? 0
            const newPlanAmount = (calculation as any).newPlanAmount ?? (calculation as any).newPlanRemainingAmount ?? calculation.proratedCharge ?? 0

            lineItems.push({
                description: `${previousPlanName} - prorated usage (${previousPlanDays} days)`,
                quantity: 1,
                unitPrice: previousPlanAmount,
                amount: previousPlanAmount,
                type: 'prorated_charge',
            })
            lineItems.push({
                description: `${planName} - prorated usage (${newPlanDays} days)`,
                quantity: 1,
                unitPrice: newPlanAmount,
                amount: newPlanAmount,
                type: 'prorated_charge',
            })
        }

        // Add tax
        if (taxAmount > 0) {
            lineItems.push({
                description: 'Tax',
                quantity: 1,
                unitPrice: taxAmount,
                amount: taxAmount,
                type: 'tax',
            })
        }

        return lineItems
    }

    /**
     * Calculate total invoice amount
     * 
     * @param subtotal Base amount
     * @param discount Discount amount (if any)
     * @param credit Credit/refund amount (negative for credits)
     * @param tax Tax amount
     * @returns Total amount due
     */
    calculateTotal(
        subtotal: number,
        discount: number = 0,
        credit: number = 0,
        tax: number = 0
    ): number {
        const total = subtotal - discount - credit + tax
        return Math.max(0, total) // Total cannot be negative
    }

    /**
     * Validate all calculations for consistency
     * This should be called before persisting an invoice
     * 
     * @param subtotal
     * @param discount
     * @param credit
     * @param tax
     * @param total
     * @throws AppError if calculations don't add up
     */
    validateCalculations(
        subtotal: number,
        discount: number,
        credit: number,
        tax: number,
        total: number
    ): void {
        const expectedTotal = this.calculateTotal(subtotal, discount, credit, tax)

        if (Math.abs(total - expectedTotal) > 1) {
            // Allow 1 unit difference due to rounding
            throw new AppError(
                `Invoice total mismatch. Expected: ${expectedTotal}, Got: ${total}`,
                400
            )
        }
    }
}

export const billingCalculationService = new BillingCalculationService()
