import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export interface BillingPlanModule {
    key: string
    label: string
    description: string
    enabled: boolean
}

export interface IBillingPlan extends Omit<Document, '_id'> {
    _id: string
    name: string
    description: string
    code: string
    status: 'active' | 'draft'
    monthlyPrice: number
    annualPrice: number
    discountPercentage: number
    currency: 'USD' | 'EUR' | 'GBP' | 'INR'
    freeTrial: 'none' | '7 days' | '14 days' | '30 days'
    trialPeriodDays: number
    modules: BillingPlanModule[]
    maxSeats: number
    maxBranches: number
    storageGb: number
    supportTier: 'email' | 'priority' | '24/7'
    visibleOnPricingPage: boolean
    tenantCount: number
    isHighlighted: boolean
    createdAt: Date
    updatedAt: Date
}

const billingPlanModuleSchema = new Schema<BillingPlanModule>(
    {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        enabled: { type: Boolean, default: false },
    },
    { _id: false }
)

const billingPlanSchema = new Schema<IBillingPlan>(
    {
        _id: { type: String },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, default: '', trim: true, maxlength: 1000 },
        code: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
        status: { type: String, enum: ['active', 'draft'], default: 'draft' },
        monthlyPrice: { type: Number, required: true, min: 0 },
        annualPrice: { type: Number, required: true, min: 0 },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'INR'], default: 'USD' },
        freeTrial: { type: String, enum: ['none', '7 days', '14 days', '30 days'], default: 'none' },
        trialPeriodDays: { type: Number, default: 0, min: 0 },
        modules: { type: [billingPlanModuleSchema], default: [] },
        maxSeats: { type: Number, default: 0, min: 0 },
        maxBranches: { type: Number, default: 1, min: 0 },
        storageGb: { type: Number, required: true, min: 10 },
        supportTier: { type: String, enum: ['email', 'priority', '24/7'], default: 'email' },
        visibleOnPricingPage: { type: Boolean, default: true },
        tenantCount: { type: Number, default: 0 },
        isHighlighted: { type: Boolean, default: false },
    },
    { timestamps: true }
)

billingPlanSchema.plugin(autoIncrementPlugin, { prefix: 'PLN' })

export const BillingPlan = mongoose.model<IBillingPlan>('BillingPlan', billingPlanSchema)
