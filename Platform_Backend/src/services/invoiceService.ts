/**
 * INVOICE SERVICE
 * 
 * Handles invoice generation, retrieval, and status updates
 * All invoices are snapshots and immutable once created
 * 
 * Workflow:
 * 1. Create invoice (with line items, amounts, tax)
 * 2. Store invoice with snapshot data
 * 3. Query invoices (by org, status, date range)
 * 4. Update invoice status (paid, failed, etc.)
 */

import { BillingInvoice, IBillingInvoice, IInvoiceItem } from '../models/BillingInvoice'
import { BillingPlan } from '../models/BillingPlan'
import { Organization } from '../models/Organization'
import { BillingPeriod } from '../models/BillingPeriod'
import { BillingSettings } from '../models/BillingSettings'
import { invoiceNumberGenerator } from './invoiceNumberGenerator.service'
import { billingCalculationService } from './billingCalculation.service'
import { AppError } from '../middleware/errorHandler'
import mongoose from 'mongoose'

// ── Types ───────────────────────────────────────────────────────────────────

export interface CreateInvoiceInput {
    organizationId: string | mongoose.Types.ObjectId
    subscriptionId: string | mongoose.Types.ObjectId
    planId: string | mongoose.Types.ObjectId
    previousPlanId?: string | mongoose.Types.ObjectId
    billingPeriodStart: Date
    billingPeriodEnd: Date
    lineItems: IInvoiceItem[]
    subtotal: number
    subtotalBeforeDiscount?: number
    subtotalAfterDiscount?: number
    discountPercentage?: number
    discountAmount?: number
    creditAmount?: number
    taxAmount: number
    taxRate?: number
    totalAmount: number
    dueDate?: Date
    currency?: string
    status?: 'draft' | 'issued'
    upgradeDetails?: {
        previousPlanId: string
        newPlanId: string
        upgradeDate: Date
        totalDays: number
        usedDays: number
        remainingDays: number
        oldPlanCredit: number
        newPlanProratedCharge: number
        netUpgradeAmount: number
        previousPlanDays?: number
        newPlanDays?: number
        billingPeriodDays?: number
        previousPlanDailyRate?: number
        newPlanDailyRate?: number
        previousPlanAmount?: number
        newPlanAmount?: number
        billingPeriodStart?: Date
        billingPeriodEnd?: Date
        quantity?: number
        previousPlanPrice?: number
        newPlanPrice?: number
        subtotal?: number
        taxableSubtotal?: number
        taxRate?: number
        taxAmount?: number
        totalAmount?: number
    }
}

export interface InvoiceQueryFilters {
    organizationId?: string | mongoose.Types.ObjectId
    subscriptionId?: string | mongoose.Types.ObjectId
    status?: string
    paymentStatus?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    skip?: number
}

// ── Invoice Service ─────────────────────────────────────────────────────────

class InvoiceService {
    /**
     * Create a new invoice
     * 
     * This captures a snapshot of:
     * - Plan details (price, name at this moment)
     * - Previous plan details (for upgrade invoices)
     * - Organization details (name, GSTIN, email)
     * - Billing period and calculations
     * 
     * Once created, the invoice cannot be changed (immutable)
     * 
     * @param input Invoice creation parameters
     * @param session Optional MongoDB session for transaction support
     * @returns Created invoice document
     */
    async createInvoice(
        input: CreateInvoiceInput,
        session?: mongoose.ClientSession
    ): Promise<IBillingInvoice> {
        try {
            // Validate inputs
            if (!input.organizationId || !input.subscriptionId || !input.planId) {
                throw new AppError('Missing required identifiers', 400)
            }

            if (!input.lineItems || input.lineItems.length === 0) {
                throw new AppError('Invoice must have at least one line item', 400)
            }

            // Fetch organization and plan details for snapshot
            const organization = await Organization.findById(input.organizationId).lean()
            if (!organization) {
                throw new AppError('Organization not found', 404)
            }

            // ✅ NEW: Fetch BillingSettings for BILLING CONTACT section
            const billingSettings = await BillingSettings.findOne().lean()
            if (!billingSettings) {
                throw new AppError('Billing settings not configured. Contact platform admin.', 500)
            }

            const plan = await BillingPlan.findById(input.planId).lean()
            if (!plan) {
                throw new AppError('Plan not found', 404)
            }

            // Generate unique invoice number
            const invoiceNumber = await invoiceNumberGenerator.generateInvoiceNumber()

            // Validate calculations
            billingCalculationService.validateCalculations(
                input.subtotal,
                input.discountAmount || 0,
                input.creditAmount || 0,
                input.taxAmount,
                input.totalAmount
            )

            // Prepare plan snapshot for NEW plan
            const planSnapshot = {
                id: plan._id,
                name: plan.name,
                code: plan.code,
                monthlyPrice: plan.monthlyPrice,
                annualPrice: plan.annualPrice,
                currency: plan.currency,
                maxSeats: plan.maxSeats,
                storageGb: plan.storageGb,
                supportTier: plan.supportTier,
                modules: plan.modules,
            }

            // ✅ NEW: Prepare snapshot for PREVIOUS plan (for upgrades)
            let previousPlanSnapshot: Record<string, any> | undefined
            let previousPlanName: string | undefined
            let previousPlanId: string | undefined

            if (input.previousPlanId) {
                const previousPlan = await BillingPlan.findById(input.previousPlanId).lean()
                if (previousPlan) {
                    previousPlanSnapshot = {
                        id: previousPlan._id,
                        name: previousPlan.name,
                        code: previousPlan.code,
                        monthlyPrice: previousPlan.monthlyPrice,
                        annualPrice: previousPlan.annualPrice,
                        currency: previousPlan.currency,
                        maxSeats: previousPlan.maxSeats,
                        storageGb: previousPlan.storageGb,
                        supportTier: previousPlan.supportTier,
                        modules: previousPlan.modules,
                    }
                    previousPlanName = previousPlan.name
                    previousPlanId = previousPlan._id.toString()
                }
            }

            const organizationSnapshot = {
                id: organization._id,
                name: organization.name,
                industryType: organization.industryType,
                workspaceUrl: organization.workspaceUrl,
            }

            // ✅ NEW: Create BILLING CONTACT snapshot from BillingSettings
            const billingContactSnapshot = {
                registeredLegalName: billingSettings.registeredLegalName,
                tradingName: billingSettings.tradingName,
                registeredAddress: billingSettings.registeredAddress,
                gstin: billingSettings.gstin,
                pan: billingSettings.pan,
                cin: billingSettings.cin,
                email: billingSettings.billingContactEmail,
                placeOfSupply: billingSettings.placeOfSupply,
                baseCurrency: billingSettings.baseCurrency,
                taxRegime: billingSettings.taxRegime,
                defaultTaxRate: billingSettings.defaultTaxRate,
            }

            // ✅ NEW: Create BILLED TO snapshot from Organization
            const formatAddress = (address?: any): string => {
                if (!address) return ''
                const parts = [
                    address.addressLine1,
                    address.addressLine2,
                    address.city,
                    address.state,
                    address.pincode,
                    address.country,
                ].filter(Boolean)
                return parts.join(', ')
            }

            const billedToSnapshot = {
                id: organization._id,
                name: organization.name,
                address: formatAddress(organization.address),
                city: organization.address?.city,
                state: organization.address?.state,
                country: organization.address?.country,
                pincode: organization.address?.pincode,
                gstin: organization.business?.gstin,
                website: organization.business?.website,
                industryType: organization.industryType,
            }

            // Create invoice document with upgrade details
            const invoiceData: any = {
                number: invoiceNumber,
                organizationId: input.organizationId,
                subscriptionId: input.subscriptionId,
                planId: input.planId,
                planName: plan.name,
                planSnapshot: planSnapshot,

                // ✅ NEW: BILLING CONTACT (from BillingSettings)
                billingContactName: billingSettings.registeredLegalName,
                billingContactTradingName: billingSettings.tradingName,
                billingContactAddress: billingSettings.registeredAddress,
                billingContactGstin: billingSettings.gstin,
                billingContactEmail: billingSettings.billingContactEmail,
                billingContactSnapshot: billingContactSnapshot,

                // ✅ NEW: BILLED TO (from Organization)
                billedToName: organization.name,
                billedToAddress: formatAddress(organization.address),
                billedToGstin: organization.business?.gstin || '',
                billedToSnapshot: billedToSnapshot,

                // Legacy fields (backward compatibility)
                organizationName: organization.name,
                organizationSnapshot: organizationSnapshot,
                billingEmailSnapshot: organization.billingEmail || '',
                gstinSnapshot: (organization as any).business?.gstin || '',

                billingCycle: input.billingPeriodStart ? this.detectBillingCycle(input.billingPeriodStart, input.billingPeriodEnd) : 'monthly',
                billingPeriodStart: input.billingPeriodStart,
                billingPeriodEnd: input.billingPeriodEnd,
                issueDate: new Date(),
                dueDate: input.dueDate || this.calculateDueDate(new Date(), 14), // Default: 14 days
                subtotal: input.subtotal,
                subtotalBeforeDiscount: input.subtotalBeforeDiscount ?? input.subtotal,
                subtotalAfterDiscount: input.subtotalAfterDiscount ?? Math.max(0, input.subtotal - (input.discountAmount || 0)),
                discountPercentage: input.discountPercentage ?? 0,
                discountAmount: input.discountAmount || 0,
                creditAmount: input.creditAmount || 0,
                taxAmount: input.taxAmount,
                taxRate: input.taxRate ?? 18,
                totalAmount: input.totalAmount,
                currency: input.currency || 'USD',
                lineItems: input.lineItems,
                status: input.status || 'draft',
                paymentStatus: 'unpaid',
                tenantName: organization.name, // Legacy field
                tenantInitials: this.generateInitials(organization.name),
                tenantColor: this.generateColor(organization._id.toString()),
                amount: input.totalAmount, // Legacy field
            }

            // ✅ NEW: Add previous plan snapshot for upgrade invoices
            if (previousPlanSnapshot) {
                invoiceData.previousPlanId = previousPlanId
                invoiceData.previousPlanName = previousPlanName
                invoiceData.previousPlanSnapshot = previousPlanSnapshot
                invoiceData.upgradeDetails = input.upgradeDetails || {}
            }

            // Create invoice with optional transaction support
            let invoice: IBillingInvoice | null = null
            try {
                const savedDoc = await new BillingInvoice(invoiceData).save(session ? { session } : {})
                invoice = savedDoc as unknown as IBillingInvoice

                if (!invoice || !invoice._id) {
                    console.error(`[INVOICE-CREATE] FATAL: Invoice saved but missing _id`)
                    throw new AppError('Invoice saved but missing _id', 500)
                }

                console.log(`[INVOICE-CREATE] Invoice persisted: id=${invoice._id}, number=${invoice.number}, organizationId=${invoice.organizationId}, hasUpgradeDetails=${!!invoice.upgradeDetails}`)
            } catch (saveErr: any) {
                console.error(`[INVOICE-CREATE] FATAL: Invoice save failed:`, saveErr.message)
                if (saveErr instanceof AppError) {
                    throw saveErr
                }
                throw new AppError(`Invoice save failed: ${saveErr.message}`, 500)
            }

            if (!invoice) {
                throw new AppError('Failed to create invoice', 500)
            }

            // Update billing period with invoice reference
            if (input.billingPeriodStart && input.billingPeriodEnd) {
                await BillingPeriod.findOneAndUpdate(
                    {
                        subscriptionId: input.subscriptionId,
                        periodStart: input.billingPeriodStart,
                        periodEnd: input.billingPeriodEnd,
                    },
                    { invoiceId: invoice._id, invoiceGenerated: true },
                    { session }
                )
            }

            return invoice
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Invoice creation failed: ${err.message}`, 500)
        }
    }

    /**
     * Get invoice by ID
     * 
     * Enforces that organization can only access its own invoices
     * 
     * @param invoiceId Invoice ID
     * @param organizationId Organization ID (for authorization)
     * @returns Invoice document or null
     */
    async getInvoice(
        invoiceId: string | mongoose.Types.ObjectId,
        organizationId: string | mongoose.Types.ObjectId
    ): Promise<IBillingInvoice | null> {
        // Query by invoice number string (e.g., "BILLINGINVOICE-038")
        const invoice = await BillingInvoice.findOne({ number: String(invoiceId) }).lean()

        if (!invoice) {
            return null
        }

        // Verify authorization
        if (invoice.organizationId.toString() !== organizationId.toString()) {
            throw new AppError('Unauthorized access to invoice', 403)
        }

        return invoice as unknown as IBillingInvoice
    }

    /**
     * Query invoices with filtering
     * 
     * @param filters Query filters
     * @returns Array of invoices
     */
    async queryInvoices(filters: InvoiceQueryFilters): Promise<IBillingInvoice[]> {
        const query: Record<string, any> = {}

        if (filters.organizationId) {
            query.organizationId = filters.organizationId
        }

        if (filters.subscriptionId) {
            query.subscriptionId = filters.subscriptionId
        }

        if (filters.status) {
            query.status = filters.status
        }

        if (filters.paymentStatus) {
            query.paymentStatus = filters.paymentStatus
        }

        if (filters.startDate || filters.endDate) {
            query.issueDate = {}
            if (filters.startDate) {
                query.issueDate.$gte = filters.startDate
            }
            if (filters.endDate) {
                query.issueDate.$lte = filters.endDate
            }
        }

        const skip = filters.skip || 0
        const limit = Math.min(filters.limit || 50, 100) // Max 100 per query

        const invoices = await BillingInvoice.find(query)
            .sort({ issueDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec()

        return invoices as any
    }

    /**
     * Update invoice status
     * 
     * @param invoiceId Invoice ID
     * @param status New status
     * @param paidAt Optional payment date
     * @returns Updated invoice
     */
    async updateInvoiceStatus(
        invoiceId: string | mongoose.Types.ObjectId,
        status: 'draft' | 'issued' | 'pending' | 'paid' | 'failed' | 'overdue' | 'cancelled',
        paidAt?: Date
    ): Promise<IBillingInvoice> {
        const updateData: Record<string, any> = { status }

        if (status === 'paid') {
            updateData.paymentStatus = 'paid'
            updateData.paidAt = paidAt || new Date()
        } else if (status === 'failed') {
            updateData.paymentStatus = 'failed'
        }

        // Query by invoice number string (e.g., "BILLINGINVOICE-038")
        const invoice = await BillingInvoice.findOneAndUpdate(
            { number: String(invoiceId) },
            updateData,
            { new: true }
        )

        if (!invoice) {
            throw new AppError('Invoice not found', 404)
        }

        return invoice
    }

    /**
     * Mark invoice as paid
     * 
     * @param invoiceId Invoice ID
     * @returns Updated invoice
     */
    async markAsPaid(invoiceId: string | mongoose.Types.ObjectId): Promise<IBillingInvoice> {
        return this.updateInvoiceStatus(invoiceId, 'paid', new Date())
    }

    /**
     * Get invoices for a subscription
     * 
     * @param subscriptionId Subscription ID
     * @param limit Number of invoices to return
     * @returns Array of invoices sorted by most recent first
     */
    async getSubscriptionInvoices(
        subscriptionId: string | mongoose.Types.ObjectId,
        limit: number = 12
    ): Promise<IBillingInvoice[]> {
        const invoices = await BillingInvoice.find({ subscriptionId })
            .sort({ issueDate: -1 })
            .limit(Math.min(limit, 100))
            .lean()
            .exec()

        return invoices as any
    }

    /**
     * Get the most recent invoice for an organization
     * 
     * @param organizationId Organization ID
     * @returns Most recent invoice or null
     */
    async getLatestInvoice(organizationId: string | mongoose.Types.ObjectId): Promise<IBillingInvoice | null> {
        const invoice = await BillingInvoice.findOne({ organizationId })
            .sort({ issueDate: -1 })
            .lean()
            .exec()

        return invoice as any
    }

    // ── Helper Methods ──────────────────────────────────────────────────────

    /**
     * Detect billing cycle from period dates
     */
    private detectBillingCycle(
        periodStart: Date,
        periodEnd: Date
    ): 'monthly' | 'annual' {
        const days = Math.round(
            (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        return days > 200 ? 'annual' : 'monthly'
    }

    /**
     * Calculate due date (typically invoice date + N days)
     */
    private calculateDueDate(issueDate: Date, daysUntilDue: number): Date {
        const dueDate = new Date(issueDate)
        dueDate.setDate(dueDate.getDate() + daysUntilDue)
        return dueDate
    }

    /**
     * Generate initials from organization name
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
     * Generate a consistent color based on organization ID
     */
    private generateColor(organizationId: string): string {
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

        const hash = organizationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        return colors[hash % colors.length]
    }
}

export const invoiceService = new InvoiceService()
