import { BillingSettings, IBillingSettings, ITaxRegistration, IPaymentGateway } from '../models/BillingSettings'
import { AppError } from '../middleware/errorHandler'
import logger from '../utils/logger'
import mongoose from 'mongoose'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
}

// ── Billing Settings Service ────────────────────────────────────────────────

class BillingSettingsService {
  /**
   * Get current platform-wide billing settings
   * Returns default settings if none exist
   *
   * @returns Current or default billing settings
   */
  static async getSettings(): Promise<IBillingSettings> {
    try {
      console.log('[Service] Querying BillingSettings collection...')
      
      let settings = await BillingSettings.findOne()
      console.log('[Service] Query result:', settings ? 'Found' : 'Not found')

      if (!settings) {
        // Initialize with defaults if not exists
        logger.info('No billing settings found, initializing defaults')
        console.log('[Service] Initializing with defaults...')
        const newSettings = await this.initializeSettings()
        console.log('[Service] Defaults initialized successfully')
        return newSettings
      }

      // Ensure we return a plain object, not a Mongoose document
      try {
        const settingsObj = settings.toObject ? settings.toObject() : JSON.parse(JSON.stringify(settings))
        console.log('[Service] Settings converted to plain object')
        return settingsObj as unknown as IBillingSettings
      } catch (conversionError) {
        console.error('[Service] Error converting to object:', conversionError)
        // Fallback: return settings directly
        return settings as unknown as IBillingSettings
      }
    } catch (error) {
      console.error('[Service] Error retrieving billing settings:', error)
      logger.error('Error retrieving billing settings', error)
      throw new AppError('Failed to retrieve billing settings: ' + (error as any).message, 500)
    }
  }

  /**
   * Update platform billing settings
   * Validates all fields and logs audit trail
   *
   * @param updates Partial settings to update
   * @param userId User making the update
   * @returns Updated settings
   */
  static async updateSettings(
    updates: Partial<IBillingSettings>,
    userId: string
  ): Promise<IBillingSettings> {
    try {
      // Validate all provided fields
      const validation = this.validateAllSettings(updates)
      if (!validation.valid) {
        throw new AppError(`Validation failed: ${validation.error}`, 400)
      }

      // Add audit metadata
      const updateData = {
        ...updates,
        lastModifiedBy: userId,
        version: (updates.version || 0) + 1,
      }

      // Get existing settings to track changes
      const existingSettings = await BillingSettings.findOne()
      
      if (!existingSettings) {
        // Create new settings document
        const newSettings = new BillingSettings(updateData)
        await newSettings.save()
        logger.info(`Billing settings initialized by user ${userId}`)
        return newSettings as IBillingSettings
      }

      // Update existing settings
      const updated = await BillingSettings.findOneAndUpdate({}, updateData, {
        new: true,
      })

      logger.info(`Billing settings updated by user ${userId}`, {
        changedFields: Object.keys(updates),
      })

      return updated?.toObject() as unknown as IBillingSettings
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error updating billing settings', error)
      throw new AppError('Failed to update billing settings', 500)
    }
  }

  /**
   * Get default settings for new deployment
   * Called when no settings exist
   *
   * @returns Default settings object
   */
  static getDefaultSettings(): Partial<IBillingSettings> {
    return {
      // Billing Entity
      registeredLegalName: 'Your Company Name',
      tradingName: 'Your Trading Name',
      gstin: '',
      pan: '',
      cin: '',
      registeredAddress: '',
      placeOfSupply: '',
      billingContactEmail: '',
      settlementBankAccount: '',
      additionalTaxRegistrations: [],

      // Currency & Rounding
      baseCurrency: 'INR',
      multiCurrencyEnabled: false,
      fxRateUpdateTime: '00:00',
      roundingRule: 'nearest',
      amountDisplayFormat: 'indian_grouping',

      // Tax Defaults
      taxRegime: 'india_gst',
      defaultTaxRate: 18,
      pricesAreTaxInclusive: false,
      requireTenantTaxId: true,
      reverseChargeEnabled: false,

      // Billing Cycle Defaults
      defaultBillingCycle: 'monthly_anniversary',
      defaultPaymentTerms: 'net_15',
      invoiceGeneratedDaysBefore: 3,
      defaultTrialLength: 14,

      // Payment Gateways
      paymentGateways: [
        { name: 'razorpay', status: 'disabled', isEnabled: false, configuration: {} },
        { name: 'stripe', status: 'disabled', isEnabled: false, configuration: {} },
        { name: 'bank_transfer', status: 'disabled', isEnabled: false, configuration: {} },
        { name: 'paypal', status: 'disabled', isEnabled: false, configuration: {} },
      ],
      autoRetryFailedCharges: true,

      // Dunning & Suspension
      gracePeriodDays: 14,
      latePaymentFeePercentage: 0,
      notifyOpsOnSuspension: true,

      // Proration & Seat Counting
      proratiionMethod: 'immediate',
      seatCountBasis: 'active_employees',
      minimumBillableSeats: 10,
      chargeForSuspendedEmployees: false,
      downgradeRefundsAsCredit: true,

      // Invoice Numbering & Records
      invoiceNumberingFormat: 'PREFIX/FY/SEQ',
      invoiceNumberingPrefix: 'HRMS',
      pdfLanguage: 'en',
      usageBreakdownIncluded: true,
      invoiceRetentionDays: 2555,

      // Metadata
      version: 1,
      lastModifiedBy: 'system',
    }
  }

  /**
   * Initialize settings with defaults
   * Called on first deployment or when no settings exist
   *
   * @returns Initialized settings
   */
  static async initializeSettings(): Promise<IBillingSettings> {
    try {
      const defaults = this.getDefaultSettings()
      const settings = new BillingSettings(defaults)
      await settings.save()
      logger.info('Billing settings initialized with defaults')
      return settings as IBillingSettings
    } catch (error) {
      logger.error('Error initializing billing settings', error)
      throw new AppError('Failed to initialize billing settings', 500)
    }
  }

  /**
   * Get all additional tax registrations
   *
   * @returns Array of tax registrations
   */
  static async getTaxRegistrations(): Promise<ITaxRegistration[]> {
    try {
      const settings = await BillingSettings.findOne()
      return settings?.additionalTaxRegistrations || []
    } catch (error) {
      logger.error('Error retrieving tax registrations', error)
      throw new AppError('Failed to retrieve tax registrations', 500)
    }
  }

  /**
   * Add new tax registration
   * Validates country code and tax ID format
   *
   * @param data Tax registration data
   * @param userId User adding the registration
   * @returns Added registration
   */
  static async addTaxRegistration(
    data: ITaxRegistration,
    userId: string
  ): Promise<ITaxRegistration> {
    try {
      // Validate input
      if (!data.country || data.country.length !== 2) {
        throw new AppError('Country code must be 2 characters', 400)
      }
      if (!data.taxId || data.taxId.trim().length === 0) {
        throw new AppError('Tax ID is required', 400)
      }
      if (!data.region || data.region.trim().length === 0) {
        throw new AppError('Region is required', 400)
      }

      // Validate country-specific tax ID format
      const validation = this.validateTaxIdByCountry(data.taxId, data.country)
      if (!validation.valid) {
        throw new AppError(validation.error || 'Invalid tax ID format', 400)
      }

      // Create new registration
      const newRegistration: ITaxRegistration = {
        country: data.country.toUpperCase(),
        taxId: data.taxId.toUpperCase(),
        region: data.region,
        status: data.status || 'Pending',
      }

      // Add to database
      const updated = await BillingSettings.findOneAndUpdate(
        {},
        { $push: { additionalTaxRegistrations: newRegistration } },
        { new: true }
      )

      logger.info(`Tax registration added by user ${userId}`, { country: data.country })

      // Return the newly added registration
      const registrations = updated?.additionalTaxRegistrations || []
      return registrations[registrations.length - 1] || newRegistration
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error adding tax registration', error)
      throw new AppError('Failed to add tax registration', 500)
    }
  }

  /**
   * Remove tax registration by ID
   * Prevents deletion of Primary registrations
   *
   * @param registrationId ID of registration to delete
   * @param userId User deleting the registration
   */
  static async removeTaxRegistration(registrationId: string, userId: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(registrationId)) {
        throw new AppError('Invalid registration ID', 400)
      }

      // Find the registration first
      const settings = await BillingSettings.findOne()
      const registration = settings?.additionalTaxRegistrations?.find(
        (r: any) => r._id?.toString() === registrationId
      )

      if (!registration) {
        throw new AppError('Tax registration not found', 404)
      }

      // Prevent deletion of Primary status
      if (registration.status === 'Primary') {
        throw new AppError('Cannot delete primary tax registration', 400)
      }

      // Remove from database
      await BillingSettings.findOneAndUpdate(
        {},
        { $pull: { additionalTaxRegistrations: { _id: new mongoose.Types.ObjectId(registrationId) } } },
        { new: true }
      )

      logger.info(`Tax registration deleted by user ${userId}`, {
        country: registration.country,
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error removing tax registration', error)
      throw new AppError('Failed to remove tax registration', 500)
    }
  }

  /**
   * Validate all settings before saving
   * Runs all individual validations
   *
   * @param settings Partial settings to validate
   * @returns Validation result
   */
  static validateAllSettings(settings: Partial<IBillingSettings>): ValidationResult {
    // Required field validations
    if (settings.registeredLegalName && settings.registeredLegalName.trim().length === 0) {
      return { valid: false, error: 'Registered legal name is required' }
    }
    if (settings.tradingName && settings.tradingName.trim().length === 0) {
      return { valid: false, error: 'Trading name is required' }
    }
    if (settings.billingContactEmail) {
      const emailValidation = this.validateEmail(settings.billingContactEmail)
      if (!emailValidation.valid) return emailValidation
    }
    if (settings.gstin) {
      const gstinValidation = this.validateGSTIN(settings.gstin)
      if (!gstinValidation.valid) return gstinValidation
    }
    if (settings.pan) {
      const panValidation = this.validatePAN(settings.pan)
      if (!panValidation.valid) return panValidation
    }
    if (settings.cin) {
      const cinValidation = this.validateCIN(settings.cin)
      if (!cinValidation.valid) return cinValidation
    }

    // Range validations
    if (settings.defaultTaxRate !== undefined) {
      if (settings.defaultTaxRate < 0 || settings.defaultTaxRate > 100) {
        return { valid: false, error: 'Default tax rate must be between 0 and 100' }
      }
    }
    if (settings.gracePeriodDays !== undefined) {
      if (settings.gracePeriodDays < 1 || settings.gracePeriodDays > 90) {
        return { valid: false, error: 'Grace period must be between 1 and 90 days' }
      }
    }
    if (settings.latePaymentFeePercentage !== undefined) {
      if (settings.latePaymentFeePercentage < 0 || settings.latePaymentFeePercentage > 100) {
        return { valid: false, error: 'Late payment fee must be between 0 and 100' }
      }
    }

    // Enum validations
    if (settings.baseCurrency && !['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD'].includes(settings.baseCurrency)) {
      return { valid: false, error: 'Invalid base currency' }
    }
    if (settings.taxRegime && !['india_gst', 'eu_vat', 'us_sales_tax', 'none'].includes(settings.taxRegime)) {
      return { valid: false, error: 'Invalid tax regime' }
    }

    return { valid: true }
  }

  // ── Validation Methods ──────────────────────────────────────────────────

  static validateGSTIN(gstin: string): ValidationResult {
    gstin = gstin.toUpperCase().trim()

    if (!gstin) return { valid: false, error: 'GSTIN is required' }
    if (gstin.length !== 15) return { valid: false, error: 'GSTIN must be 15 characters' }
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return { valid: false, error: 'GSTIN format is invalid' }
    }

    return { valid: true }
  }

  static validatePAN(pan: string): ValidationResult {
    pan = pan.toUpperCase().trim()

    if (!pan) return { valid: false, error: 'PAN is required' }
    if (pan.length !== 10) return { valid: false, error: 'PAN must be 10 characters' }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return { valid: false, error: 'PAN format is invalid' }
    }

    return { valid: true }
  }

  static validateCIN(cin: string): ValidationResult {
    cin = cin.toUpperCase().trim()

    if (!cin) return { valid: false, error: 'CIN is required' }
    if (cin.length !== 21) return { valid: false, error: 'CIN must be 21 characters' }
    if (!/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)) {
      return { valid: false, error: 'CIN format is invalid' }
    }

    return { valid: true }
  }

  static validateTaxIdByCountry(taxId: string, country: string): ValidationResult {
    taxId = taxId.toUpperCase().trim()

    const patterns: Record<string, RegExp> = {
      IN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, // GSTIN
      AE: /^\d{15}$/, // TRN (15 digits)
      NL: /^NL\d{12}$/, // VAT
      DE: /^DE\d{9}$/, // VAT
      FR: /^FR\d{11}$/, // VAT
      IT: /^IT\d{11}$/, // VAT
      ES: /^ES[0-9A-Z]\d{7}[0-9A-Z]$/, // VAT
      BE: /^BE\d{10}$/, // VAT
      AT: /^AT\d{8}$/, // VAT
      GB: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, // VAT
    }

    const pattern = patterns[country]
    if (!pattern) {
      return { valid: false, error: `VAT validation not supported for ${country}` }
    }
    if (!pattern.test(taxId)) {
      return { valid: false, error: `Invalid ${country} tax ID format` }
    }

    return { valid: true }
  }

  static validateEmail(email: string): ValidationResult {
    email = email.trim()

    if (!email) return { valid: false, error: 'Email is required' }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' }
    }

    return { valid: true }
  }
}

export const billingSettingsService = BillingSettingsService
