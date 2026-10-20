import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export interface IBillingSubscription extends Document {
    // Identifiers
    organizationId: string
    currentPlanId: string
    discountPercentage: number

    // Legacy fields (retained for backward compatibility)
    tenantName?: string
    tenantInitials?: string
    tenantColor?: string
    planName?: string
    planType?: string

    // Billing cycle info
    billingCycle: 'monthly' | 'annual'
    subscriptionStartDate: Date
    currentPeriodStart: Date
    currentPeriodEnd: Date
    nextBillingDate: Date
    trialEndsAt?: Date | null

    // Plan change tracking
    previousPlanId?: string
    lastPlanChangeDate?: Date
    scheduledPlanId?: string | null
    scheduledChangeDate?: Date | null

    // Status
    status: 'active' | 'trial' | 'cancelled' | 'expired' | 'past_due'

    // Billing info
    currency: string

    // Legacy fields (deprecated but kept for compatibility)
    monthlyAmount?: number
    renewalDate?: Date
    seatCount?: number
    isActive?: boolean

    // Timestamps
    createdAt: Date
    updatedAt: Date
}

const billingSubscriptionSchema = new Schema<IBillingSubscription>(
    {
        // Core fields
        organizationId: { type: String, ref: 'Organization', required: true },
        currentPlanId: { type: String, ref: 'BillingPlan', required: true },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },

        // Legacy fields
        tenantName: { type: String, trim: true },
        tenantInitials: { type: String, trim: true, maxlength: 4 },
        tenantColor: { type: String, trim: true },
        planName: { type: String, trim: true },
        planType: { type: String, trim: true },

        // Billing cycle
        billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },
        subscriptionStartDate: { type: Date, required: true },
        currentPeriodStart: { type: Date, required: true },
        currentPeriodEnd: { type: Date, required: true },
        nextBillingDate: { type: Date, required: true },
        trialEndsAt: { type: Date, default: null },

        // Plan changes
        previousPlanId: { type: String, ref: 'BillingPlan' },
        lastPlanChangeDate: { type: Date },
        scheduledPlanId: { type: String, ref: 'BillingPlan', default: null },
        scheduledChangeDate: { type: Date, default: null },

        // Status
        status: { type: String, enum: ['active', 'trial', 'cancelled', 'expired', 'past_due'], default: 'active', index: true },

        // Currency
        currency: { type: String, default: 'USD' },

        // Legacy fields (deprecated)
        monthlyAmount: { type: Number, min: 0 },
        renewalDate: { type: Date },
        seatCount: { type: Number, default: 1, min: 1 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
)

// Indexes for efficient querying
billingSubscriptionSchema.index({ organizationId: 1, status: 1 })
billingSubscriptionSchema.index({ nextBillingDate: 1, status: 1 })
billingSubscriptionSchema.index({ currentPeriodStart: 1, currentPeriodEnd: 1 })

billingSubscriptionSchema.plugin(autoIncrementPlugin, { prefix: 'SUB' })

export const BillingSubscription = mongoose.model<IBillingSubscription>('BillingSubscription', billingSubscriptionSchema)
