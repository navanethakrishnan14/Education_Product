import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export type PaymentStatus =
    | 'created'
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'refunded'
    | 'partially_refunded'

export interface IPayment extends Document {
    _id: string
    organizationId: string
    invoiceId: string
    subscriptionId?: string
    planId?: string
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
    amount: number
    currency: string
    status: PaymentStatus
    paymentMethod?: string
    failureReason?: string
    metadata?: Record<string, any>
    paidAt?: Date
    createdAt: Date
    updatedAt: Date
}

const paymentSchema = new Schema<IPayment>(
    {
        _id: { type: String },
        organizationId: { type: String, ref: 'Organization', required: true, index: true },
        invoiceId: { type: String, ref: 'BillingInvoice', required: true, index: true },
        subscriptionId: { type: String, ref: 'BillingSubscription', default: null },
        planId: { type: String, ref: 'BillingPlan', default: null },
        razorpayOrderId: { type: String, unique: true, sparse: true, trim: true },
        razorpayPaymentId: { type: String, trim: true },
        razorpaySignature: { type: String, trim: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, default: 'INR', uppercase: true, maxlength: 3 },
        status: {
            type: String,
            enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
            default: 'created',
            index: true,
        },
        paymentMethod: { type: String, trim: true },
        failureReason: { type: String, trim: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
        paidAt: { type: Date },
    },
    {
        timestamps: true,
    }
)

paymentSchema.plugin(autoIncrementPlugin, { prefix: 'PAY' })

if (process.env.NODE_ENV === 'development' && mongoose.models.Payment) {
    delete mongoose.models.Payment
}

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema)
