/**
 * INVOICE CONTROLLER
 * 
 * Platform admin endpoints for invoice management
 * Admins can view, filter, and manage all invoices
 */

import { Request, Response } from 'express'
import { invoiceService } from '../services/invoiceService'
import { IBillingInvoice } from '../models/BillingInvoice'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { AppError } from '../middleware/errorHandler'

export const invoiceController = {
    /**
     * List invoices with filters
     * GET /platform/invoices?organizationId=...&status=paid&paymentStatus=paid&limit=50&skip=0&startDate=...&endDate=...
     * 
     * Query params:
     * - organizationId: filter by org
     * - subscriptionId: filter by subscription
     * - status: "draft" | "issued" | "pending" | "paid" | "failed" | "overdue" | "cancelled"
     * - paymentStatus: "unpaid" | "paid" | "partially_paid" | "failed"
     * - startDate: ISO date (filter by issue date >= startDate)
     * - endDate: ISO date (filter by issue date <= endDate)
     * - limit: max results (default: 50, max: 100)
     * - skip: pagination offset
     */
    async listInvoices(req: Request, res: Response): Promise<void> {
        try {
            const {
                organizationId,
                subscriptionId,
                status,
                paymentStatus,
                startDate,
                endDate,
                limit = 50,
                skip = 0,
            } = req.query

            const invoices = await invoiceService.queryInvoices({
                organizationId: organizationId as string,
                subscriptionId: subscriptionId as string,
                status: status as string,
                paymentStatus: paymentStatus as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: Math.min(parseInt(limit as string) || 50, 100),
                skip: parseInt(skip as string) || 0,
            })

            sendSuccess(res, 200, 'Invoices retrieved', {
                invoices: invoices.map((inv: any) => ({
                    id: inv._id,
                    number: inv.number,
                    organizationId: inv.organizationId,
                    organizationName: inv.organizationName,
                    planName: inv.planName,
                    totalAmount: inv.totalAmount,
                    currency: inv.currency,
                    status: inv.status,
                    paymentStatus: inv.paymentStatus,
                    issueDate: inv.issueDate,
                    dueDate: inv.dueDate,
                    paidAt: inv.paidAt,
                    billingPeriodStart: inv.billingPeriodStart,
                    billingPeriodEnd: inv.billingPeriodEnd,
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve invoices')
        }
    },

    /**
     * Get specific invoice details
     * GET /platform/invoices/:invoiceId
     */
    async getInvoice(req: Request, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params

            if (!invoiceId) {
                sendError(res, 400, 'invoiceId is required')
                return
            }

            // For admin, use admin as org context (no restriction)
            const invoice = await invoiceService.getInvoice(invoiceId, 'admin')

            if (!invoice) {
                sendError(res, 404, 'Invoice not found')
                return
            }

            sendSuccess(res, 200, 'Invoice retrieved', {
                invoice: {
                    id: invoice._id,
                    number: invoice.number,
                    organizationId: invoice.organizationId,
                    organizationName: invoice.organizationName,
                    billingEmailSnapshot: invoice.billingEmailSnapshot,
                    gstinSnapshot: invoice.gstinSnapshot,
                    planName: invoice.planName,
                    billingCycle: invoice.billingCycle,
                    billingPeriodStart: invoice.billingPeriodStart,
                    billingPeriodEnd: invoice.billingPeriodEnd,
                    issueDate: invoice.issueDate,
                    dueDate: invoice.dueDate,
                    subtotal: invoice.subtotal,
                    discountAmount: invoice.discountAmount,
                    creditAmount: invoice.creditAmount,
                    taxAmount: invoice.taxAmount,
                    totalAmount: invoice.totalAmount,
                    currency: invoice.currency,
                    lineItems: invoice.lineItems,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    paidAt: invoice.paidAt,
                    createdAt: invoice.createdAt,
                    updatedAt: invoice.updatedAt,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve invoice')
        }
    },

    /**
     * Update invoice status
     * PATCH /platform/invoices/:invoiceId/status
     * 
     * Body: {
     *   status: "draft" | "issued" | "pending" | "paid" | "failed" | "overdue" | "cancelled"
     *   paidAt?: ISO date string (for paid status)
     * }
     */
    async updateInvoiceStatus(req: Request, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params
            const { status, paidAt } = req.body

            if (!invoiceId) {
                sendError(res, 400, 'invoiceId is required')
                return
            }

            if (!status) {
                sendError(res, 400, 'status is required')
                return
            }

            const validStatuses = ['draft', 'issued', 'pending', 'paid', 'failed', 'overdue', 'cancelled']
            if (!validStatuses.includes(status)) {
                sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
                return
            }

            const invoice = await invoiceService.updateInvoiceStatus(
                invoiceId,
                status,
                paidAt ? new Date(paidAt) : undefined
            )

            sendSuccess(res, 200, `Invoice status updated to ${status}`, {
                invoice: {
                    id: invoice._id,
                    number: invoice.number,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    paidAt: invoice.paidAt,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to update invoice status')
        }
    },

    /**
     * Mark invoice as paid
     * POST /platform/invoices/:invoiceId/mark-paid
     * 
     * Body: { paidAt?: ISO date string }
     */
    async markAsPaid(req: Request, res: Response): Promise<void> {
        try {
            const { invoiceId } = req.params
            // paidAt can be used in future for payment timestamp tracking

            if (!invoiceId) {
                sendError(res, 400, 'invoiceId is required')
                return
            }

        const invoice = await invoiceService.markAsPaid(invoiceId) as any as IBillingInvoice

            sendSuccess(res, 200, 'Invoice marked as paid', {
                invoice: {
                    id: invoice._id,
                    number: invoice.number,
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    paidAt: invoice.paidAt,
                },
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to mark invoice as paid')
        }
    },

    /**
     * Get invoices for a subscription
     * GET /platform/subscriptions/:subscriptionId/invoices?limit=12
     */
    async getSubscriptionInvoices(req: Request, res: Response): Promise<void> {
        try {
            const { subscriptionId } = req.params
            const { limit = 12 } = req.query

            if (!subscriptionId) {
                sendError(res, 400, 'subscriptionId is required')
                return
            }

            const limitNum = Math.min(parseInt(limit as string) || 12, 100)

            const invoices = await invoiceService.getSubscriptionInvoices(subscriptionId, limitNum)

            sendSuccess(res, 200, 'Subscription invoices retrieved', {
                count: invoices.length,
                invoices: invoices.map((inv: any) => ({
                    id: inv._id,
                    number: inv.number,
                    totalAmount: inv.totalAmount,
                    currency: inv.currency,
                    status: inv.status,
                    paymentStatus: inv.paymentStatus,
                    issueDate: inv.issueDate,
                    dueDate: inv.dueDate,
                    billingPeriodStart: inv.billingPeriodStart,
                    billingPeriodEnd: inv.billingPeriodEnd,
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve subscription invoices')
        }
    },

    /**
     * Get organization invoices (for platform view)
     * GET /platform/organizations/:organizationId/invoices?limit=12&status=...
     */
    async getOrganizationInvoices(req: Request, res: Response): Promise<void> {
        try {
            const { organizationId } = req.params
            const { limit = 12, status } = req.query

            if (!organizationId) {
                sendError(res, 400, 'organizationId is required')
                return
            }

            const limitNum = Math.min(parseInt(limit as string) || 12, 100)

            const invoices = await invoiceService.queryInvoices({
                organizationId,
                status: status as string,
                limit: limitNum,
                skip: 0,
            })

            sendSuccess(res, 200, 'Organization invoices retrieved', {
                count: invoices.length,
                invoices: invoices.map((inv: any) => ({
                    id: inv._id,
                    number: inv.number,
                    totalAmount: inv.totalAmount,
                    currency: inv.currency,
                    status: inv.status,
                    paymentStatus: inv.paymentStatus,
                    issueDate: inv.issueDate,
                    dueDate: inv.dueDate,
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve organization invoices')
        }
    },

    /**
     * Get invoices due for payment (overdue)
     * GET /platform/invoices/overdue/list
     */
    async getOverdueInvoices(_req: Request, res: Response): Promise<void> {
        try {
            const now = new Date()

            const invoices = await invoiceService.queryInvoices({
                status: 'overdue',
                endDate: now,
            })

            sendSuccess(res, 200, 'Overdue invoices retrieved', {
                count: invoices.length,
                invoices: invoices.map((inv: any) => ({
                    id: inv._id,
                    number: inv.number,
                    organizationName: inv.organizationName,
                    totalAmount: inv.totalAmount,
                    currency: inv.currency,
                    dueDate: inv.dueDate,
                    daysOverdue: Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
                })),
            })
        } catch (err: any) {
            if (err instanceof AppError) {
                sendError(res, err.statusCode, err.message)
                return
            }
            sendError(res, 500, err.message || 'Failed to retrieve overdue invoices')
        }
    },
}
