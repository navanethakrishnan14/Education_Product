import crypto from 'crypto'
import Razorpay from 'razorpay'
import { AppError } from '../middleware/errorHandler'
import env from '../config/env'

export interface CreateRazorpayOrderInput {
    amount: number
    currency?: string
    receipt: string
    notes?: Record<string, string>
}

class RazorpayService {
    private getClient(): Razorpay {
        if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
            throw new AppError('Razorpay credentials are not configured', 500)
        }

        return new Razorpay({
            key_id: env.RAZORPAY_KEY_ID,
            key_secret: env.RAZORPAY_KEY_SECRET,
        })
    }

    async createOrder(input: CreateRazorpayOrderInput): Promise<any> {
        const client = this.getClient()
        return client.orders.create({
            amount: Number(input.amount),
            currency: (input.currency || 'INR').toUpperCase(),
            receipt: input.receipt,
            notes: input.notes || {},
        })
    }

    async fetchOrder(orderId: string): Promise<any> {
        const client = this.getClient()
        return client.orders.fetch(orderId)
    }

    async fetchPayment(paymentId: string): Promise<any> {
        const client = this.getClient()
        return client.payments.fetch(paymentId)
    }

    verifyPaymentSignature(input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): boolean {
        if (!env.RAZORPAY_KEY_SECRET) {
            throw new AppError('Razorpay verification secret is missing', 500)
        }

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input
        const payload = `${razorpayOrderId}|${razorpayPaymentId}`
        const expected = crypto
            .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
            .update(payload)
            .digest('hex')

        return this.safeCompare(expected, razorpaySignature || '')
    }

    verifyWebhookSignature(rawBody: string | Buffer, expectedSignature: string): boolean {
        if (!env.RAZORPAY_WEBHOOK_SECRET) {
            throw new AppError('Razorpay webhook secret is missing', 500)
        }

        const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody)
        const expected = crypto
            .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
            .update(payload)
            .digest('hex')

        return this.safeCompare(expected, expectedSignature || '')
    }

    private safeCompare(expected: string, actual: string): boolean {
        if (!expected || !actual) return false
        if (expected.length !== actual.length) return false

        try {
            return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
        } catch {
            return false
        }
    }
}

export const razorpayService = new RazorpayService()
