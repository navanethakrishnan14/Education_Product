/**
 * INVOICE ROUTES
 * 
 * Platform admin invoice endpoints
 * All routes require authentication
 */

import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { invoiceController } from '../controllers/invoiceController'

const router = Router()

// ── Authentication Requirement ──────────────────────────────────────────────
// All invoice endpoints require admin authentication
router.use(authenticate)

// ── Read - List & Filter ────────────────────────────────────────────────────

/**
 * @route GET /platform/invoices
 * @description List invoices with advanced filtering
 * @query {organizationId?, subscriptionId?, status?, paymentStatus?, startDate?, endDate?, limit?, skip?}
 * @returns Array of invoices with pagination
 * 
 * Example:
 * GET /platform/invoices?status=paid&organizationId=ORG123&limit=50
 * GET /platform/invoices?paymentStatus=unpaid&startDate=2026-01-01&endDate=2026-12-31
 */
router.get('/', invoiceController.listInvoices)

/**
 * @route GET /platform/invoices/overdue/list
 * @description Get overdue invoices (past due date, unpaid)
 * @returns Array of overdue invoices with days overdue
 */
router.get('/overdue/list', invoiceController.getOverdueInvoices)

// ── Read - Specific Invoice ─────────────────────────────────────────────────

/**
 * @route GET /platform/invoices/:invoiceId
 * @description Get detailed invoice information
 * @param invoiceId Invoice ID
 * @returns Complete invoice details with line items
 */
router.get('/:invoiceId', invoiceController.getInvoice)

// ── Update Status ───────────────────────────────────────────────────────────

/**
 * @route PATCH /platform/invoices/:invoiceId/status
 * @description Update invoice status
 * @param invoiceId Invoice ID
 * @body {status, paidAt?}
 * @returns Updated invoice
 * 
 * Valid statuses:
 * - draft: Not yet sent
 * - issued: Sent to customer
 * - pending: Awaiting payment
 * - paid: Payment received
 * - failed: Payment failed
 * - overdue: Past due date
 * - cancelled: Cancelled
 */
router.patch('/:invoiceId/status', invoiceController.updateInvoiceStatus)

/**
 * @route POST /platform/invoices/:invoiceId/mark-paid
 * @description Convenience endpoint to mark invoice as paid
 * @param invoiceId Invoice ID
 * @body {paidAt?} Optional paid date (defaults to now)
 * @returns Updated invoice
 */
router.post('/:invoiceId/mark-paid', invoiceController.markAsPaid)

// ── Related Resources ───────────────────────────────────────────────────────

/**
 * @route GET /platform/subscriptions/:subscriptionId/invoices
 * @description Get all invoices for a subscription
 * @param subscriptionId Subscription ID
 * @query {limit?} Max results (default: 12, max: 100)
 * @returns Array of invoices for subscription
 */
router.get('/subscription/:subscriptionId/invoices', invoiceController.getSubscriptionInvoices)

/**
 * @route GET /platform/organizations/:organizationId/invoices
 * @description Get invoices for organization
 * @param organizationId Organization ID
 * @query {limit?, status?}
 * @returns Array of invoices for organization
 */
router.get('/organization/:organizationId/invoices', invoiceController.getOrganizationInvoices)

export default router
