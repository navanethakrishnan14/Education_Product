import { Router } from 'express'
import { authenticateForAudience } from '../middleware/auth.middleware'
import { requirePlatformAdmin } from '../middleware/requirePlatformAdmin'
import { billingSettingsController } from '../controllers/billingSettings.controller'

/**
 * BILLING SETTINGS ROUTES
 *
 * All routes require:
 * 1. JWT authentication for 'platform' audience
 * 2. Platform Admin role
 *
 * Base path: /api/v1/platform/settings/billing
 */

const router = Router()

// ── Apply middleware to all routes ──────────────────────────────────────────
// All routes require authentication + admin role
router.use(authenticateForAudience('platform'))
router.use(requirePlatformAdmin)

// ── Settings CRUD ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/platform/settings/billing
 * Retrieve current platform billing settings
 *
 * Response:
 * {
 *   registeredLegalName: string,
 *   tradingName: string,
 *   gstin: string,
 *   ... all other settings
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */
router.get('/', billingSettingsController.getSettings)

/**
 * PUT /api/v1/platform/settings/billing
 * Update platform billing settings
 *
 * Request Body (partial update):
 * {
 *   "registeredLegalName": "New Company Name",
 *   "defaultTaxRate": 18,
 *   // ... any fields to update
 * }
 *
 * Response: Updated settings object
 */
router.put('/', billingSettingsController.updateSettings)

/**
 * POST /api/v1/platform/settings/billing/validate
 * Validate settings without saving
 *
 * Request Body (partial):
 * {
 *   "gstin": "29AABCH1234MIZP",
 *   "defaultTaxRate": 18
 * }
 *
 * Response:
 * {
 *   "valid": true/false,
 *   "error": "error message if invalid"
 * }
 */
router.post('/validate', billingSettingsController.validateSettings)

// ── Tax Registrations ───────────────────────────────────────────────────────

/**
 * GET /api/v1/platform/settings/billing/tax-registrations
 * List all additional tax registrations
 *
 * Response:
 * [
 *   {
 *     "_id": "ObjectId",
 *     "country": "IN",
 *     "taxId": "29AABCH1234MIZP",
 *     "region": "Karnataka",
 *     "status": "Primary"
 *   },
 *   ...
 * ]
 */
router.get('/tax-registrations', billingSettingsController.getTaxRegistrations)

/**
 * POST /api/v1/platform/settings/billing/tax-registrations
 * Add a new tax registration
 *
 * Request Body:
 * {
 *   "country": "AE",
 *   "taxId": "100123456700003",
 *   "region": "Dubai",
 *   "status": "Active"  // optional, defaults to "Pending"
 * }
 *
 * Response: Created registration object with _id
 */
router.post('/tax-registrations', billingSettingsController.addTaxRegistration)

/**
 * DELETE /api/v1/platform/settings/billing/tax-registrations/:id
 * Remove a tax registration
 *
 * URL Params:
 * - id: MongoDB ObjectId of the registration
 *
 * Response: { success: true }
 *
 * Error Cases:
 * - 404: Registration not found
 * - 400: Cannot delete Primary registration
 */
router.delete('/tax-registrations/:id', billingSettingsController.removeTaxRegistration)

export default router
