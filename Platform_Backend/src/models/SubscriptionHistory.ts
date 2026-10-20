import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

/**
 * Tracks all changes to subscriptions for audit trail and historical reference
 */
export interface ISubscriptionHistory extends Document {
    // Identifiers
    organizationId: string
    subscriptionId: string

    // Change details
    changeType: 'initial' | 'upgrade' | 'downgrade' | 'renewal' | 'admin_change' | 'cancellation'

    // Plan change
    previousPlanId?: string
    previousPlanName?: string
    newPlanId: string
    newPlanName: string

    // Period info
    effectiveDate: Date
    previousPeriodStart: Date
    previousPeriodEnd: Date
    newPeriodStart: Date
    newPeriodEnd: Date

    // Financial impact
    oldPlanAmount: number
    newPlanAmount: number
    proratedCredit: number
    proratedCharge: number
    finalAmount: number

    // Related documents
    invoiceId?: string

    // Metadata
    changedBy?: string // admin email or 'system'
    notes?: string

    createdAt: Date
}

const subscriptionHistorySchema = new Schema<ISubscriptionHistory>(
    {
        organizationId: { type: String, ref: 'Organization', required: true, index: true },
        subscriptionId: { type: String, ref: 'BillingSubscription', required: true, index: true },

        changeType: {
            type: String,
            enum: ['initial', 'upgrade', 'downgrade', 'renewal', 'admin_change', 'cancellation'],
            required: true,
            index: true
        },

        previousPlanId: { type: String, ref: 'BillingPlan' },
        previousPlanName: { type: String, trim: true },
        newPlanId: { type: String, ref: 'BillingPlan', required: true },
        newPlanName: { type: String, required: true, trim: true },

        effectiveDate: { type: Date, required: true },
        previousPeriodStart: { type: Date, required: true },
        previousPeriodEnd: { type: Date, required: true },
        newPeriodStart: { type: Date, required: true },
        newPeriodEnd: { type: Date, required: true },

        oldPlanAmount: { type: Number, required: true, min: 0 },
        newPlanAmount: { type: Number, required: true, min: 0 },
        proratedCredit: { type: Number, default: 0, min: 0 },
        proratedCharge: { type: Number, default: 0, min: 0 },
        finalAmount: { type: Number, required: true, min: 0 },

        invoiceId: { type: String, ref: 'BillingInvoice' },

        changedBy: { type: String, trim: true },
        notes: { type: String, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
)

// Indexes
subscriptionHistorySchema.index({ organizationId: 1, subscriptionId: 1, effectiveDate: -1 })
subscriptionHistorySchema.index({ subscriptionId: 1, effectiveDate: -1 })

subscriptionHistorySchema.plugin(autoIncrementPlugin, { prefix: 'SUBHIST' })

export const SubscriptionHistory = mongoose.model<ISubscriptionHistory>('SubscriptionHistory', subscriptionHistorySchema)
