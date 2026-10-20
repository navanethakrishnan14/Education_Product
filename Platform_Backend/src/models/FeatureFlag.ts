import mongoose, { Document, Schema } from 'mongoose'

export type FeatureFlagType = 'RELEASE' | 'EXPERIMENT' | 'OPS'
export type FeatureFlagEnvironment = 'Production' | 'Staging'
export type FeatureFlagOverrideStatus = 'forced-on' | 'forced-off' | 'blocked'

export interface IFeatureFlagOverride {
    name: string
    initials: string
    status: FeatureFlagOverrideStatus
    description?: string
    color: string
}

export interface IFeatureFlag extends Document {
    name: string
    key: string
    description: string
    type: FeatureFlagType
    environment: FeatureFlagEnvironment
    enabled: boolean
    rolloutPercentage: number
    allTenants: boolean
    tenantCount: number
    tenantOverrides: IFeatureFlagOverride[]
    createdBy: string
    updatedBy: string
    createdAt: Date
    updatedAt: Date
}

const FeatureFlagOverrideSchema = new Schema<IFeatureFlagOverride>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        initials: { type: String, required: true, trim: true, maxlength: 4 },
        status: { type: String, enum: ['forced-on', 'forced-off', 'blocked'], default: 'forced-off' },
        description: { type: String, default: '', trim: true },
        color: { type: String, default: '#64748b', trim: true },
    },
    { _id: false }
)

const FeatureFlagSchema = new Schema<IFeatureFlag>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        key: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
        description: { type: String, default: '', trim: true, maxlength: 500 },
        type: { type: String, enum: ['RELEASE', 'EXPERIMENT', 'OPS'], default: 'RELEASE' },
        environment: { type: String, enum: ['Production', 'Staging'], default: 'Production' },
        enabled: { type: Boolean, default: false },
        rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
        allTenants: { type: Boolean, default: false },
        tenantCount: { type: Number, min: 0, default: 0 },
        tenantOverrides: { type: [FeatureFlagOverrideSchema], default: [] },
        createdBy: { type: String, default: 'system' },
        updatedBy: { type: String, default: 'system' },
    },
    { timestamps: true }
)

FeatureFlagSchema.index({ key: 1, environment: 1 }, { unique: true })
FeatureFlagSchema.index({ environment: 1, enabled: 1 })

export const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema)
