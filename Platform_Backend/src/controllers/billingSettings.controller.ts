import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { billingSettingsService } from '../services/billingSettings.service'
import { AppError } from '../middleware/errorHandler'
import logger from '../utils/logger'

/**
 * BILLING SETTINGS CONTROLLER
 *
 * Handles all HTTP requests for platform billing settings management
 * All endpoints require Platform Admin authentication
 */

export const billingSettingsController = {
  /**
   * GET /api/v1/platform/settings/billing
   * Retrieve current platform billing settings
   *
   * Authorization: Platform Admin
   * Response: IBillingSettings | DefaultSettings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      console.log('[BillingSettings] getSettings called')
      
      // Disable caching to prevent 304 responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      
      const settings = await billingSettingsService.getSettings()
      
      console.log('[BillingSettings] Settings retrieved successfully')
      sendSuccess(res, 200, 'Billing settings retrieved', settings)
    } catch (err: any) {
      console.error('[BillingSettings] Error retrieving settings:', err.message)
      
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.message)
        return
      }
      
      logger.error('Error retrieving billing settings', err)
      sendError(res, 500, 'Failed to retrieve billing settings: ' + err.message)
    }
  },

  /**
   * PUT /api/v1/platform/settings/billing
   * Update platform billing settings
   * Validates all fields before saving
   *
   * Authorization: Platform Admin
   * Request Body: Partial<IBillingSettings>
   * Response: Updated IBillingSettings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        sendError(res, 401, 'User context missing')
        return
      }

      // Validate the update payload
      const validation = billingSettingsService.validateAllSettings(req.body)
      if (!validation.valid) {
        sendError(res, 400, `Validation failed: ${validation.error}`)
        return
      }

      // Update settings
      const updatedSettings = await billingSettingsService.updateSettings(req.body, userId)

      sendSuccess(res, 200, 'Billing settings updated successfully', updatedSettings)
    } catch (err: any) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.message)
        return
      }
      logger.error('Error updating billing settings', err)
      sendError(res, 500, 'Failed to update billing settings')
    }
  },

  /**
   * POST /api/v1/platform/settings/billing/validate
   * Validate settings without saving
   *
   * Authorization: Platform Admin
   * Request Body: Partial<IBillingSettings>
   * Response: { valid: boolean, error?: string }
   */
  async validateSettings(req: Request, res: Response): Promise<void> {
    try {
      const validation = billingSettingsService.validateAllSettings(req.body)

      if (!validation.valid) {
        sendSuccess(res, 400, 'Validation failed', {
          valid: false,
          error: validation.error,
        })
        return
      }

      sendSuccess(res, 200, 'Settings validation passed', {
        valid: true,
      })
    } catch (err: any) {
      logger.error('Error validating settings', err)
      sendError(res, 500, 'Failed to validate settings')
    }
  },

  /**
   * GET /api/v1/platform/settings/billing/tax-registrations
   * Retrieve all additional tax registrations
   *
   * Authorization: Platform Admin
   * Response: ITaxRegistration[]
   */
  async getTaxRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const registrations = await billingSettingsService.getTaxRegistrations()
      sendSuccess(res, 200, 'Tax registrations retrieved', registrations)
    } catch (err: any) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.message)
        return
      }
      logger.error('Error retrieving tax registrations', err)
      sendError(res, 500, 'Failed to retrieve tax registrations')
    }
  },

  /**
   * POST /api/v1/platform/settings/billing/tax-registrations
   * Add a new tax registration
   *
   * Authorization: Platform Admin
   * Request Body: { country, taxId, region, status? }
   * Response: ITaxRegistration
   */
  async addTaxRegistration(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        sendError(res, 401, 'User context missing')
        return
      }

      const { country, taxId, region, status } = req.body

      // Basic validation
      if (!country || !taxId || !region) {
        sendError(res, 400, 'country, taxId, and region are required')
        return
      }

      // Add registration
      const registration = await billingSettingsService.addTaxRegistration(
        { country, taxId, region, status },
        userId
      )

      sendSuccess(res, 201, 'Tax registration added successfully', registration)
    } catch (err: any) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.message)
        return
      }
      logger.error('Error adding tax registration', err)
      sendError(res, 500, 'Failed to add tax registration')
    }
  },

  /**
   * DELETE /api/v1/platform/settings/billing/tax-registrations/:id
   * Remove a tax registration
   *
   * Authorization: Platform Admin
   * URL Params: id - Registration MongoDB ObjectId
   * Response: { success: true }
   */
  async removeTaxRegistration(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        sendError(res, 401, 'User context missing')
        return
      }

      const { id } = req.params

      if (!id) {
        sendError(res, 400, 'Registration ID is required')
        return
      }

      // Remove registration
      await billingSettingsService.removeTaxRegistration(id, userId)

      sendSuccess(res, 200, 'Tax registration removed successfully', { success: true })
    } catch (err: any) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.message)
        return
      }
      logger.error('Error removing tax registration', err)
      sendError(res, 500, 'Failed to remove tax registration')
    }
  },
}
