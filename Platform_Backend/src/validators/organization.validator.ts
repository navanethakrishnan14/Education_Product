import Joi from 'joi'

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin setup — supports both new wizard (firstName/lastName) and legacy (adminName).
 * The service normalises firstName + lastName → adminName.
 */
const adminSetupSchema = Joi.object({
  profilePhotoUrl: Joi.string().uri().allow(null, '').optional(),
  // Legacy field — kept for backward compatibility
  adminName: Joi.string().min(1).max(100).optional(),
  // New wizard fields
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  adminEmail: Joi.string().email().required(),
  adminPhone: Joi.string().allow('').max(30).optional(),
  adminPassword: Joi.string().min(8).max(128).required(),
  timezone: Joi.string().allow('').max(100).optional(),
  currency: Joi.string().allow('').max(50).optional(),
  region: Joi.string().allow('').max(100).optional(),
}).options({ allowUnknown: false })

const adminSetupUpdateSchema = Joi.object({
  profilePhotoUrl: Joi.string().uri().allow(null, '').optional(),
  adminName: Joi.string().min(1).max(100).optional(),
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  adminEmail: Joi.string().email().optional(),
  adminPhone: Joi.string().allow('').max(30).optional(),
  adminPassword: Joi.string().min(8).max(128).optional(),
  timezone: Joi.string().allow('').max(100).optional(),
  currency: Joi.string().allow('').max(50).optional(),
  region: Joi.string().allow('').max(100).optional(),
})

/** Indian GSTIN format: 15 chars — 2 digits + 10 PAN chars + 1 digit + 1 alpha + 1 alpha/digit */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

/** Business address */
const addressSchema = Joi.object({
  addressLine1: Joi.string().max(200).required().messages({
    'any.required': 'Address line 1 is required.',
    'string.empty': 'Address line 1 cannot be empty.',
  }),
  addressLine2: Joi.string().max(200).allow('').optional(),
  city: Joi.string().max(100).required().messages({
    'any.required': 'City is required.',
  }),
  state: Joi.string().max(100).required().messages({
    'any.required': 'State is required.',
  }),
  country: Joi.string().max(100).required().messages({
    'any.required': 'Country is required.',
  }),
  pincode: Joi.string().max(20).required().messages({
    'any.required': 'Pincode / ZIP code is required.',
  }),
})

/** Optional address — all fields optional (used in update) */
const addressUpdateSchema = Joi.object({
  addressLine1: Joi.string().max(200).optional(),
  addressLine2: Joi.string().max(200).allow('').optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  country: Joi.string().max(100).optional(),
  pincode: Joi.string().max(20).optional(),
})

/** Business information */
const businessSchema = Joi.object({
  gstin: Joi.string()
    .trim()
    .uppercase()
    .max(20)
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (value && !GSTIN_REGEX.test(value)) {
        return helpers.error('any.invalid')
      }
      return value
    })
    .messages({
      'any.invalid': 'GSTIN must be a valid 15-character Indian GST identification number (e.g. 22AAAAA0000A1Z5).',
    }),
  website: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).allow('', null).optional().messages({
    'string.uri': 'Website must be a valid URL (e.g. https://company.com).',
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Accepted industry values (open-ended — "Other" always accepted)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Create schema
// ─────────────────────────────────────────────────────────────────────────────

export const createOrganizationSchema = Joi.object({
  // ── Core (required by wizard step 1) ────────────────────────────────────
  name: Joi.string().min(1).max(200).required().messages({
    'any.required': 'Organization name is required.',
    'string.empty': 'Organization name cannot be empty.',
  }),

  // workspaceUrl keeps the organization URL slug for the workspace
  workspaceUrl: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .messages({
      'string.pattern.base': 'Workspace URL must be a valid slug (lowercase letters, numbers, hyphens).',
    }),

  logoUrl: Joi.string().uri().allow(null, '').optional(),

  // industryType — open string, no hard enum so new industry values are accepted
  industryType: Joi.string().max(100).optional(),

  // ── New wizard fields ────────────────────────────────────────────────────
  industry: Joi.string().max(100).optional(),         // alias — mapped in service
  companySize: Joi.string().max(50).optional(),
  billingEmail: Joi.string().email().max(254).optional().messages({
    'string.email': 'Billing email must be a valid email address.',
  }),
  phoneNumber: Joi.string().allow('').max(30).optional(),
  currency: Joi.string().trim().uppercase().max(10).allow('', null).optional(),

  // Business address — required when wizard submits; backward-compat callers omit it
  address: addressSchema.optional(),

  // Business information
  business: businessSchema.optional(),

  // ── Plan & modules ───────────────────────────────────────────────────────
  planId: Joi.string().trim().allow(null, '').optional().messages({
    'string.base': 'Plan ID must be a valid identifier.',
  }),
  modules: Joi.array().items(Joi.string().max(80)).optional(),

  // ── Admin setup ──────────────────────────────────────────────────────────
  adminSetup: adminSetupSchema.optional(),

  // ── Status ───────────────────────────────────────────────────────────────
  isActive: Joi.boolean().optional(),

  // ── Legacy / deprecated (still accepted for backward compat) ────────────
  //   locationAttendance and platformSettings were used by the old wizard
  locationAttendance: Joi.object().optional(),
  platformSettings: Joi.object().optional(),
}).options({ allowUnknown: false })

// ─────────────────────────────────────────────────────────────────────────────
// Update schema — everything optional
// ─────────────────────────────────────────────────────────────────────────────

export const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  workspaceUrl: Joi.string()
    .min(1).max(100)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .messages({ 'string.pattern.base': 'Workspace URL must be a valid slug.' }),
  logoUrl: Joi.string().uri().allow(null, '').optional(),
  industryType: Joi.string().max(100).optional(),
  industry: Joi.string().max(100).optional(),
  companySize: Joi.string().max(50).optional(),
  billingEmail: Joi.string().email().max(254).optional(),
  phoneNumber: Joi.string().allow('').max(30).optional(),
  currency: Joi.string().trim().uppercase().max(10).allow('', null).optional(),
  address: addressUpdateSchema.optional(),
  business: businessSchema.optional(),
  planId: Joi.string().trim().allow(null, '').optional(),
  discountPercentage: Joi.number().min(0).max(100).optional(),
  modules: Joi.array().items(Joi.string().max(80)).optional(),
  adminSetup: adminSetupUpdateSchema.optional(),
  isActive: Joi.boolean().optional(),
  locationAttendance: Joi.object().optional(),
  platformSettings: Joi.object().optional(),
}).options({ allowUnknown: false })

// ─────────────────────────────────────────────────────────────────────────────
// List / query schema
// ─────────────────────────────────────────────────────────────────────────────

export const listOrganizationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('name', 'createdAt', 'industryType').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional(),
})
