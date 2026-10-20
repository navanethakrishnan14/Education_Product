import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

// ── Invoice Item (sub-document) ─────────────────────────────────────────────

export interface IInvoiceItem {
    description: string
    planId?: string
    planName?: string
    quantity: number
    unitPrice: number
    amount: number
    type: 'subscription' | 'upgrade' | 'prorated_charge' | 'prorated_credit' | 'tax' | 'discount'
}

export interface IUpgradeDetails {
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

// ── Billing Invoice ─────────────────────────────────────────────────────────

export interface IBillingInvoice extends Omit<Document, '_id'> {
    // Identity (String _id in INV-YYYY-XXXXXX format)
    _id: string
    number: string
    organizationId: string
    subscriptionId: string

    // Plan info (snapshot at invoice time)
    planId: string
    planName: string
    planSnapshot?: Record<string, any>

    // Previous plan info (for upgrade invoices)
    previousPlanId?: string
    previousPlanName?: string
    previousPlanSnapshot?: Record<string, any>

    // Upgrade details (for upgrade invoices)
    upgradeDetails?: IUpgradeDetails

    // ── Billing Contact Info (from BillingSettings collection) ──
    billingContactName: string          // registeredLegalName
    billingContactTradingName?: string  // tradingName
    billingContactAddress: string       // registeredAddress
    billingContactGstin: string         // gstin
    billingContactEmail: string         // billingContactEmail
    billingContactSnapshot?: Record<string, any>  // Full BillingSettings snapshot

    // ── Billed To Info (from Organization collection) ──
    billedToName: string                // organization.name
    billedToAddress?: string            // Formatted address
    billedToGstin?: string              // organization.business.gstin
    billedToSnapshot?: Record<string, any>  // Full Organization snapshot

    // Legacy organization info (kept for backward compatibility)
    organizationName: string
    organizationSnapshot?: Record<string, any>
    billingEmailSnapshot?: string
    gstinSnapshot?: string

    // Billing period
    billingCycle: 'monthly' | 'annual'
    billingPeriodStart: Date
    billingPeriodEnd: Date

    // Invoice dates
    issueDate: Date
    dueDate?: Date

    // Amount breakdown (all in currency decimals)
    subtotal: number
    subtotalBeforeDiscount?: number
    subtotalAfterDiscount?: number
    discountPercentage: number
    discountAmount: number
    creditAmount: number
    taxAmount: number
    taxRate?: number
    totalAmount: number
    currency: string

    // Line items
    lineItems: IInvoiceItem[]

    // Status tracking
    status: 'draft' | 'issued' | 'pending' | 'paid' | 'failed' | 'overdue' | 'cancelled'
    paymentStatus: 'unpaid' | 'paid' | 'partially_paid' | 'failed'
    paidAt?: Date

    // Legacy fields (for backward compatibility)
    tenantName?: string
    tenantInitials?: string
    tenantColor?: string
    amount?: number

    createdAt: Date
    updatedAt: Date
}

// ── Sub-schema ──────────────────────────────────────────────────────────────

const InvoiceItemSchema = new Schema<IInvoiceItem>(
    {
        description: { type: String, required: true, trim: true },
        planId: { type: String, ref: 'BillingPlan' },
        planName: { type: String, trim: true },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true },
        amount: { type: Number, required: true },
        type: {
            type: String,
            enum: ['subscription', 'upgrade', 'prorated_charge', 'prorated_credit', 'tax', 'discount'],
            required: true
        },
    },
    { _id: false }
)

// ── Main schema ─────────────────────────────────────────────────────────────

const billingInvoiceSchema = new Schema<IBillingInvoice>(
    {
        // Identity (String _id in INV-YYYY-XXXXXX format)
        _id: { type: String, required: true },
        number: { type: String, required: true, unique: true, trim: true, index: true },
        organizationId: { type: String, ref: 'Organization', required: true, index: true },
        subscriptionId: { type: String, ref: 'BillingSubscription', required: true, index: true },

        // Plan info
        planId: { type: String, ref: 'BillingPlan', required: true },
        planName: { type: String, required: true, trim: true },
        planSnapshot: { type: Schema.Types.Mixed, default: {} },

        // Previous plan info (for upgrade invoices)
        previousPlanId: { type: String, ref: 'BillingPlan' },
        previousPlanName: { type: String, trim: true },
        previousPlanSnapshot: { type: Schema.Types.Mixed, default: {} },

        // Upgrade details
        upgradeDetails: { type: Schema.Types.Mixed, default: {} },

        // Billing Contact Info (from BillingSettings)
        billingContactName: { type: String, required: true, trim: true },
        billingContactTradingName: { type: String, trim: true, default: null },
        billingContactAddress: { type: String, required: true, trim: true },
        billingContactGstin: { type: String, trim: true, default: '' },
        billingContactEmail: { type: String, trim: true, lowercase: true, default: '' },
        billingContactSnapshot: { type: Schema.Types.Mixed, default: {} },

        // Billed To Info (from Organization)
        billedToName: { type: String, required: true, trim: true },
        billedToAddress: { type: String, trim: true, default: '' },
        billedToGstin: { type: String, trim: true, default: '' },
        billedToSnapshot: { type: Schema.Types.Mixed, default: {} },

        // Legacy organization info (for backward compatibility)
        organizationName: { type: String, required: true, trim: true },
        organizationSnapshot: { type: Schema.Types.Mixed, default: {} },
        billingEmailSnapshot: { type: String, trim: true, lowercase: true },
        gstinSnapshot: { type: String, trim: true },

        // Billing period
        billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },
        billingPeriodStart: { type: Date, required: true, index: true },
        billingPeriodEnd: { type: Date, required: true, index: true },

        // Invoice dates
        issueDate: { type: Date, required: true },
        dueDate: { type: Date },

        // Amounts (stored as integers representing smallest currency unit for precision)
        subtotal: { type: Number, required: true, min: 0 },
        subtotalBeforeDiscount: { type: Number, min: 0 },
        subtotalAfterDiscount: { type: Number, min: 0 },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        discountAmount: { type: Number, default: 0, min: 0 },
        creditAmount: { type: Number, default: 0, min: 0 },
        taxAmount: { type: Number, default: 0, min: 0 },
        taxRate: { type: Number, default: 18, min: 0, max: 100 },
        totalAmount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'USD' },

        // Line items
        lineItems: { type: [InvoiceItemSchema], default: [] },

        // Status
        status: {
            type: String,
            enum: ['draft', 'issued', 'pending', 'paid', 'failed', 'overdue', 'cancelled'],
            default: 'draft',
            index: true
        },
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'partially_paid', 'failed'],
            default: 'unpaid',
            index: true
        },
        paidAt: { type: Date },

        // Legacy fields (backward compatibility)
        tenantName: { type: String, trim: true },
        tenantInitials: { type: String, trim: true, maxlength: 4 },
        tenantColor: { type: String, trim: true },
        amount: { type: Number, min: 0 }, // Maps to totalAmount
    },
    { timestamps: true }
)

// Indexes
billingInvoiceSchema.index({ organizationId: 1, status: 1 })
billingInvoiceSchema.index({ billingPeriodStart: 1, billingPeriodEnd: 1 })
billingInvoiceSchema.index({ issueDate: 1 })

billingInvoiceSchema.plugin(autoIncrementPlugin)

export const BillingInvoice = mongoose.model<IBillingInvoice>('BillingInvoice', billingInvoiceSchema)
