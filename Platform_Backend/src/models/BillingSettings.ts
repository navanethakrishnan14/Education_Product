import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

// ── Sub-document interfaces ─────────────────────────────────────────────────

export interface ITaxRegistration {
  country: string
  taxId: string
  region: string
  status: 'Primary' | 'Active' | 'Pending'
  verifiedAt?: Date
}

export interface IPaymentGateway {
  name: 'razorpay' | 'stripe' | 'bank_transfer' | 'paypal'
  status: 'disabled' | 'sandbox' | 'live' | 'default'
  isEnabled: boolean
  configuration?: Record<string, any>
}

// ── Main interface ──────────────────────────────────────────────────────────

export interface IBillingSettings extends Document {
  // ── Billing Entity & Tax Registration ──
  registeredLegalName: string
  tradingName: string
  gstin: string
  pan: string
  cin: string
  registeredAddress: string
  placeOfSupply: string
  billingContactEmail: string
  settlementBankAccount: string
  additionalTaxRegistrations: ITaxRegistration[]

  // ── Currency & Rounding ──
  baseCurrency: string
  multiCurrencyEnabled: boolean
  fxRateUpdateTime: string
  roundingRule: 'nearest' | 'up' | 'down'
  amountDisplayFormat: 'indian_grouping' | 'standard'

  // ── Tax Defaults ──
  taxRegime: 'india_gst' | 'eu_vat' | 'us_sales_tax' | 'none'
  defaultTaxRate: number
  pricesAreTaxInclusive: boolean
  requireTenantTaxId: boolean
  reverseChargeEnabled: boolean

  // ── Billing Cycle Defaults ──
  defaultBillingCycle: 'monthly_anniversary' | 'monthly_1st' | 'annual_prepaid'
  defaultPaymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45'
  invoiceGeneratedDaysBefore: number
  defaultTrialLength: number

  // ── Payment Gateways ──
  paymentGateways: IPaymentGateway[]
  autoRetryFailedCharges: boolean

  // ── Dunning & Suspension ──
  gracePeriodDays: number
  latePaymentFeePercentage: number
  notifyOpsOnSuspension: boolean

  // ── Proration & Seat Counting ──
  proratiionMethod: 'immediate' | 'at_next_cycle' | 'no_proration'
  seatCountBasis: 'active_employees' | 'peak_seats' | 'seats_at_start'
  minimumBillableSeats: number | null
  chargeForSuspendedEmployees: boolean
  downgradeRefundsAsCredit: boolean

  // ── Invoice Numbering & Records ──
  invoiceNumberingFormat: string
  invoiceNumberingPrefix: string
  pdfLanguage: 'tenant_locale' | 'en'
  usageBreakdownIncluded: boolean
  invoiceRetentionDays: number

  // ── Metadata ──
  version: number
  lastModifiedBy: string
  createdAt: Date
  updatedAt: Date
}

// ── Sub-schemas ─────────────────────────────────────────────────────────────

const taxRegistrationSchema = new Schema<ITaxRegistration>(
  {
    country: { type: String, required: true, trim: true, uppercase: true, maxlength: 2 },
    taxId: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Primary', 'Active', 'Pending'],
      default: 'Pending',
    },
    verifiedAt: { type: Date },
  },
  { _id: true }
)

const paymentGatewaySchema = new Schema<IPaymentGateway>(
  {
    name: {
      type: String,
      enum: ['razorpay', 'stripe', 'bank_transfer', 'paypal'],
      required: true,
    },
    status: {
      type: String,
      enum: ['disabled', 'sandbox', 'live', 'default'],
      default: 'disabled',
    },
    isEnabled: { type: Boolean, default: false },
    configuration: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
)

// ── Main schema ─────────────────────────────────────────────────────────────

const billingSettingsSchema = new Schema<IBillingSettings>(
  {
    // ── Billing Entity & Tax Registration ──
    registeredLegalName: { type: String, required: true, trim: true, maxlength: 200 },
    tradingName: { type: String, required: true, trim: true, maxlength: 200 },
    gstin: { type: String, default: '', trim: true, uppercase: true, maxlength: 15 },
    pan: { type: String, default: '', trim: true, uppercase: true, maxlength: 10 },
    cin: { type: String, default: '', trim: true, uppercase: true, maxlength: 21 },
    registeredAddress: { type: String, default: '', trim: true, maxlength: 500 },
    placeOfSupply: { type: String, default: '', trim: true, maxlength: 2 },
    billingContactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    settlementBankAccount: { type: String, default: '', trim: true, maxlength: 200 },
    additionalTaxRegistrations: { type: [taxRegistrationSchema], default: [] },

    // ── Currency & Rounding ──
    baseCurrency: { type: String, default: 'INR', trim: true, uppercase: true, maxlength: 3 },
    multiCurrencyEnabled: { type: Boolean, default: false },
    fxRateUpdateTime: { type: String, default: '00:00', trim: true },
    roundingRule: { type: String, enum: ['nearest', 'up', 'down'], default: 'nearest' },
    amountDisplayFormat: {
      type: String,
      enum: ['indian_grouping', 'standard'],
      default: 'indian_grouping',
    },

    // ── Tax Defaults ──
    taxRegime: {
      type: String,
      enum: ['india_gst', 'eu_vat', 'us_sales_tax', 'none'],
      default: 'india_gst',
    },
    defaultTaxRate: { type: Number, default: 18, min: 0, max: 100 },
    pricesAreTaxInclusive: { type: Boolean, default: false },
    requireTenantTaxId: { type: Boolean, default: true },
    reverseChargeEnabled: { type: Boolean, default: false },

    // ── Billing Cycle Defaults ──
    defaultBillingCycle: {
      type: String,
      enum: ['monthly_anniversary', 'monthly_1st', 'annual_prepaid'],
      default: 'monthly_anniversary',
    },
    defaultPaymentTerms: {
      type: String,
      enum: ['due_on_receipt', 'net_15', 'net_30', 'net_45'],
      default: 'net_15',
    },
    invoiceGeneratedDaysBefore: { type: Number, default: 3, min: 0, max: 30 },
    defaultTrialLength: { type: Number, default: 14, min: 0, max: 90 },

    // ── Payment Gateways ──
    paymentGateways: { type: [paymentGatewaySchema], default: [] },
    autoRetryFailedCharges: { type: Boolean, default: true },

    // ── Dunning & Suspension ──
    gracePeriodDays: { type: Number, default: 14, min: 1, max: 90 },
    latePaymentFeePercentage: { type: Number, default: 0, min: 0, max: 100 },
    notifyOpsOnSuspension: { type: Boolean, default: true },

    // ── Proration & Seat Counting ──
    proratiionMethod: {
      type: String,
      enum: ['immediate', 'at_next_cycle', 'no_proration'],
      default: 'immediate',
    },
    seatCountBasis: {
      type: String,
      enum: ['active_employees', 'peak_seats', 'seats_at_start'],
      default: 'active_employees',
    },
    minimumBillableSeats: { type: Number, default: null },
    chargeForSuspendedEmployees: { type: Boolean, default: false },
    downgradeRefundsAsCredit: { type: Boolean, default: true },

    // ── Invoice Numbering & Records ──
    invoiceNumberingFormat: { type: String, default: 'PREFIX/FY/SEQ', trim: true },
    invoiceNumberingPrefix: { type: String, default: 'HRMS', trim: true, maxlength: 10 },
    pdfLanguage: { type: String, enum: ['tenant_locale', 'en'], default: 'en' },
    usageBreakdownIncluded: { type: Boolean, default: true },
    invoiceRetentionDays: { type: Number, default: 2555, min: 7, max: 999999 },

    // ── Metadata ──
    version: { type: Number, default: 1 },
    lastModifiedBy: { type: String, trim: true },
  },
  { timestamps: true }
)

// ── Indexes ─────────────────────────────────────────────────────────────────

billingSettingsSchema.index({ lastModifiedBy: 1 })
billingSettingsSchema.index({ updatedAt: -1 })

// ── Auto-increment plugin (optional) ──────────────────────────────────────

billingSettingsSchema.plugin(autoIncrementPlugin, { prefix: 'BSET' })

// ── Model ────────────────────────────────────────────────────────────────────

if (mongoose.models.BillingSettings) {
  delete mongoose.models.BillingSettings
}

export const BillingSettings = mongoose.model<IBillingSettings>(
  'BillingSettings',
  billingSettingsSchema
)
