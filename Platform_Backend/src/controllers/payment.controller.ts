import { Request, Response } from 'express'
import { paymentService } from '../services/payment.service'
import { sendError, sendSuccess } from '../utils/apiResponse'

export const paymentController = {
    async createOrder(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId, planId, billingCycle } = req.body || {}
            if (!organizationId) {
                sendError(res, 400, 'organizationId is required')
                return
            }

            const result = await paymentService.createOrder({
                organizationId,
                planId,
                billingCycle,
                user: req.user,
            })

            sendSuccess(res, 200, 'Razorpay order created', result)
        } catch (error: any) {
            sendError(res, error.statusCode || 500, error.message || 'Failed to create payment order')
        }
    },

    async verifyPayment(req: Request, res: Response): Promise<void> {
        try {
            const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body || {}
            if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
                sendError(res, 400, 'razorpayPaymentId, razorpayOrderId and razorpaySignature are required')
                return
            }

            const result = await paymentService.verifyPayment({
                razorpayPaymentId,
                razorpayOrderId,
                razorpaySignature,
                user: req.user,
            })

            sendSuccess(res, 200, 'Payment verified successfully', result.data || result)
        } catch (error: any) {
            sendError(res, error.statusCode || 500, error.message || 'Payment verification failed')
        }
    },

    async webhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = String(req.headers['x-razorpay-signature'] || '')
            const rawBody = req.body
            const result = await paymentService.processWebhook(rawBody, signature)
            sendSuccess(res, 200, result.message || 'Webhook processed', { success: result.success })
        } catch (error: any) {
            sendError(res, error.statusCode || 500, error.message || 'Webhook processing failed')
        }
    },
}
