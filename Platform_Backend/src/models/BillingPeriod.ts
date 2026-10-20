import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

/**
 * Tracks billing periods for subscriptions
 * Each period represents a billing cycle (monthly/annual)
 */
export interface IBillingPeriod extends Document {
    // Identifiers
    organizationId: string
    subscriptionId: string

    // Plan info
    planId: string
    billingCycle: 'monthly' | 'annual'

    // Period dates
    periodStart: Date
    periodEnd: Date
    nextBillingDate: Date

    // Invoice info
    invoiceId?: string
    invoiceGenerated: boolean

    // Status
    status: 'active' | 'closed' | 'archived'

    // Timestamps
    createdAt: Date
    updatedAt: Date
}

const billingPeriodSchema = new Schema<IBillingPeriod>(
    {
        organizationId: { type: String, ref: 'Organization', required: true },
        subscriptionId: { type: String, ref: 'BillingSubscription', required: true },

        planId: { type: String, ref: 'BillingPlan', required: true },
        billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },

        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        nextBillingDate: { type: Date, required: true },

        invoiceId: { type: String, ref: 'BillingInvoice' },
        invoiceGenerated: { type: Boolean, default: false },

        status: { type: String, enum: ['active', 'closed', 'archived'], default: 'active' },
    },
    { timestamps: true }
)

// Indexes
billingPeriodSchema.index({ organizationId: 1, status: 1 })
billingPeriodSchema.index({ subscriptionId: 1, periodStart: 1, periodEnd: 1 })
billingPeriodSchema.index({ nextBillingDate: 1, status: 1 })

billingPeriodSchema.plugin(autoIncrementPlugin, { prefix: 'PERIOD' })

export const BillingPeriod = mongoose.model<IBillingPeriod>('BillingPeriod', billingPeriodSchema)
