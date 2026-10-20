import mongoose from 'mongoose'
import { BillingInvoice } from '../models/BillingInvoice'
import { BillingSubscription } from '../models/BillingSubscription'
import { Organization } from '../models/Organization'
import { Payment } from '../models/Payment'
import { AppError } from '../middleware/errorHandler'
import { razorpayService } from './razorpay.service'
import env from '../config/env'

export interface CreatePaymentOrderInput {
    organizationId: string
    planId?: string
    billingCycle?: 'monthly' | 'annual'
    user?: { aud?: 'platform' | 'organization'; organizationId?: string }
}

export interface VerifyPaymentInput {
    razorpayPaymentId: string
    razorpayOrderId: string
    razorpaySignature: string
    user?: { aud?: 'platform' | 'organization'; organizationId?: string }
}

class PaymentService {
    async createOrder(input: CreatePaymentOrderInput) {
        const { organizationId, user } = input

        if (user?.aud === 'organization' && user.organizationId && user.organizationId !== organizationId) {
            throw new AppError('You are not authorized to pay for this organization', 403)
        }

        const organization = await Organization.findById(organizationId).lean()
        if (!organization) {
            throw new AppError('Organization not found', 404)
        }

        const invoice = await BillingInvoice.findOne({
            organizationId,
            status: { $in: ['issued', 'pending', 'draft'] },
        }).sort({ issueDate: -1 }).lean()

        if (!invoice) {
            throw new AppError('No pending invoice found for this organization', 404)
        }

        const amount = Number(invoice.totalAmount ?? 0)
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new AppError('Invoice total is invalid for payment', 400)
        }

        const pending = await Payment.findOne({
            organizationId,
            invoiceId: String(invoice._id),
            status: { $in: ['created', 'pending', 'authorized'] },
        }).sort({ createdAt: -1 }).lean()

        if (pending?.razorpayOrderId) {
            return {
                paymentId: pending._id,
                invoiceId: String(invoice._id),
                razorpayOrderId: pending.razorpayOrderId,
                razorpayKeyId: env.RAZORPAY_KEY_ID,
                amount,
                currency: (invoice.currency || 'INR').toUpperCase(),
            }
        }

        const order = await razorpayService.createOrder({
            amount,
            currency: (invoice.currency || 'INR').toUpperCase(),
            receipt: String(invoice.number || 'INV'),
            notes: {
                organizationId: String(organizationId),
                invoiceId: String(invoice._id),
                planId: String(invoice.planId || ''),
            },
        })

        const payment = await Payment.create({
            organizationId: String(organizationId),
            invoiceId: String(invoice._id),
            subscriptionId: String(invoice.subscriptionId),
            planId: String(invoice.planId),
            amount,
            currency: (invoice.currency || 'INR').toUpperCase(),
            status: 'created',
            razorpayOrderId: order.id,
            metadata: {
                invoiceNumber: invoice.number,
                billingCycle: invoice.billingCycle,
                orderAmount: order.amount,
            },
        })

        return {
            paymentId: payment._id,
            invoiceId: String(invoice._id),
            razorpayOrderId: order.id,
            razorpayKeyId: env.RAZORPAY_KEY_ID,
            amount: Number(order.amount || amount),
            currency: (invoice.currency || 'INR').toUpperCase(),
        }
    }

    async verifyPayment(input: VerifyPaymentInput) {
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature, user } = input

        if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
            throw new AppError('Missing Razorpay payment identifiers', 400)
        }

        const validSignature = razorpayService.verifyPaymentSignature({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        })

        if (!validSignature) {
            throw new AppError('Payment signature verification failed', 400)
        }

        const paymentRecord = await Payment.findOne({ razorpayOrderId }).lean()
        if (!paymentRecord) {
            throw new AppError('Payment record not found for this Razorpay order', 404)
        }

        if (user?.aud === 'organization' && user.organizationId && user.organizationId !== paymentRecord.organizationId) {
            throw new AppError('You are not authorized to verify this payment', 403)
        }

        const invoice = await BillingInvoice.findOne(
            { number: String(paymentRecord.invoiceId) }
        ).lean()
        if (!invoice) {
            throw new AppError('Invoice not found for this payment', 404)
        }

        if (invoice.organizationId.toString() !== paymentRecord.organizationId.toString()) {
            throw new AppError('Invoice organization mismatch', 400)
        }

        const order = await razorpayService.fetchOrder(razorpayOrderId)
        const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId)

        const expectedAmount = Number(invoice.totalAmount || 0)
        if (Number(order.amount) !== expectedAmount || Number(razorpayPayment.amount) !== expectedAmount) {
            throw new AppError('Payment amount mismatch', 400)
        }

        if ((order.currency || 'INR').toUpperCase() !== (invoice.currency || 'INR').toUpperCase()) {
            throw new AppError('Payment currency mismatch', 400)
        }

        const session = await mongoose.startSession()
        let updatedPayment: any

        try {
            await session.withTransaction(async () => {
                updatedPayment = await Payment.findOneAndUpdate(
                    { razorpayOrderId },
                    {
                        status: 'captured',
                        razorpayPaymentId,
                        razorpaySignature,
                        paymentMethod: razorpayPayment.method || 'card',
                        paidAt: new Date(),
                        metadata: {
                            ...(paymentRecord.metadata || {}),
                            orderStatus: order.status,
                            paymentStatus: razorpayPayment.status,
                            razorpayCapturedAt: razorpayPayment.created_at ? new Date(razorpayPayment.created_at * 1000) : undefined,
                        },
                    },
                    { new: true, session }
                )

                await BillingInvoice.findByIdAndUpdate(
                    invoice._id,
                    {
                        status: 'paid',
                        paymentStatus: 'paid',
                        paidAt: new Date(),
                        paymentId: updatedPayment?._id || paymentRecord._id,
                        razorpayOrderId,
                        razorpayPaymentId,
                    },
                    { session }
                )

                const subscription = await BillingSubscription.findOne({
                    organizationId: paymentRecord.organizationId,
                    status: { $in: ['active', 'trial', 'expired', 'past_due', 'cancelled'] },
                }).sort({ createdAt: -1 }).session(session)

                if (subscription) {
                    subscription.currentPlanId = String(invoice.planId)
                    subscription.status = 'active'
                    subscription.lastPlanChangeDate = new Date()
                    if (!subscription.previousPlanId) {
                        subscription.previousPlanId = subscription.currentPlanId
                    }
                    await subscription.save({ session })
                }

                await Organization.findByIdAndUpdate(
                    paymentRecord.organizationId,
                    { planId: String(invoice.planId) },
                    { session }
                )
            })
        } finally {
            await session.endSession()
        }

        return {
            success: true,
            message: 'Payment verified successfully',
            data: {
                paymentId: updatedPayment?._id || paymentRecord._id,
                invoiceId: String(invoice._id),
                status: 'captured',
            },
        }
    }

    async processWebhook(rawBody: string | Buffer, razorpaySignature: string) {
        if (!razorpaySignature) {
            throw new AppError('Missing Razorpay webhook signature', 400)
        }

        const isValid = razorpayService.verifyWebhookSignature(rawBody, razorpaySignature)
        if (!isValid) {
            throw new AppError('Webhook signature mismatch', 400)
        }

        let payload: any
        try {
            payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString() : rawBody)
        } catch {
            throw new AppError('Invalid Razorpay webhook payload', 400)
        }

        const event = payload.event
        const paymentEntity = payload?.payload?.payment?.entity || {}
        const orderEntity = payload?.payload?.order?.entity || {}
        const orderId = paymentEntity.order_id || orderEntity.id
        const paymentId = paymentEntity.id
        const eventId = payload?.event_id || `${event}:${orderId || paymentId || Date.now()}`

        if (!orderId) {
            return { success: true, message: 'Ignored webhook event without order details' }
        }

        const existingPayment = await Payment.findOne({ razorpayOrderId: orderId }).lean()
        if (!existingPayment) {
            return { success: true, message: 'No payment record found for this webhook' }
        }

        const processedEvents: string[] = Array.isArray((existingPayment.metadata as any)?.processedWebhookEvents)
            ? (existingPayment.metadata as any).processedWebhookEvents
            : []

        if (processedEvents.includes(eventId)) {
            return { success: true, message: 'Webhook already processed' }
        }

        if (event === 'payment.captured' || event === 'order.paid') {
            await this.verifyPayment({
                razorpayPaymentId: paymentId,
                razorpayOrderId: orderId,
                razorpaySignature: 'webhook-verified',
            })
        } else if (event === 'payment.failed') {
            await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, {
                status: 'failed',
                failureReason: paymentEntity?.error_description || 'Payment failed',
            })

            await BillingInvoice.findOneAndUpdate({ organizationId: existingPayment.organizationId, number: String(existingPayment.invoiceId) }, {
                status: 'failed',
                paymentStatus: 'failed',
            })
        }

        await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, {
            $set: {
                'metadata.processedWebhookEvents': [...processedEvents, eventId],
            },
        })

        return { success: true, message: 'Webhook processed', event }
    }
}

export const paymentService = new PaymentService()
