import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export interface IAddon extends Omit<Document, '_id'> {
    _id: string
    moduleKey: 'asset_management' | 'announcement' | 'notification'
    moduleName: string
    identifier: string
    description?: string
    flatPrice: number
    currency: 'USD' | 'EUR' | 'INR'
    billingCycle: 'one_time' | 'monthly' | 'yearly'
    addonType: 'feature_module' | 'usage_based' | 'per_seat'
    trialPeriodDays: number
    trialPeriodUnit: 'days' | 'none'
    usageLimit?: string
    sortOrder: number
    applicablePlans: Array<'starter' | 'growth' | 'enterprise' | 'all'>
    status: 'active' | 'inactive'
}

const addonSchema = new Schema<IAddon>({
    _id: { type: String },
    moduleKey: { type: String, required: true, unique: true, enum: ['asset_management', 'announcement', 'notification'], lowercase: true, trim: true },
    moduleName: { type: String, required: true, trim: true, maxlength: 100 },
    identifier: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, maxlength: 100 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    flatPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['USD', 'EUR', 'INR'], default: 'USD' },
    billingCycle: { type: String, enum: ['one_time', 'monthly', 'yearly'], default: 'monthly' },
    addonType: { type: String, enum: ['feature_module', 'usage_based', 'per_seat'], default: 'feature_module' },
    trialPeriodDays: { type: Number, min: 0, default: 0 },
    trialPeriodUnit: { type: String, enum: ['days', 'none'], default: 'none' },
    usageLimit: { type: String, default: '', trim: true, maxlength: 120 },
    sortOrder: { type: Number, min: 0, default: 0 },
    applicablePlans: { type: [String], enum: ['starter', 'growth', 'enterprise', 'all'], default: ['all'] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
}, { timestamps: true })

// Keep MongoDB IDs string-based for new add-ons while preserving existing IDs.
addonSchema.plugin(autoIncrementPlugin, { prefix: 'ADDON', padLength: 4 })

export const Addon = mongoose.model<IAddon>('Addon', addonSchema)
