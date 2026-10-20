import { Document, Schema, model } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export type PlanUpgradeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface IPlanUpgradeRequest extends Document {
    organizationId: string
    currentPlanId: string
    requestedPlanId: string
    status: PlanUpgradeRequestStatus
    rejectionReason?: string
    reviewedAt?: Date
    createdAt: Date
    updatedAt: Date
}

const planUpgradeRequestSchema = new Schema<IPlanUpgradeRequest>(
    {
        organizationId: { type: String, required: true, index: true },
        currentPlanId: { type: String, required: true },
        requestedPlanId: { type: String, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
        rejectionReason: { type: String, trim: true },
        reviewedAt: { type: Date },
    },
    { timestamps: true },
)

planUpgradeRequestSchema.index({ organizationId: 1, status: 1 })
planUpgradeRequestSchema.plugin(autoIncrementPlugin, { prefix: 'PUR' })

export const PlanUpgradeRequest = model<IPlanUpgradeRequest>('PlanUpgradeRequest', planUpgradeRequestSchema)
