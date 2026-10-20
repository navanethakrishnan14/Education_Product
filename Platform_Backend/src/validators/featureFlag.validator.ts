import Joi from 'joi'

/**
 * ── Tenant Override Schema ────────────────────────────────────────
 */
const tenantOverrideSchema = Joi.object({
    name: Joi.string().min(1).max(120).required().messages({
        'string.empty': 'Tenant name is required',
        'string.max': 'Tenant name cannot exceed 120 characters',
    }),
    initials: Joi.string().min(1).max(4).required().messages({
        'string.empty': 'Tenant initials are required',
        'string.max': 'Initials cannot exceed 4 characters',
    }),
    status: Joi.string()
        .valid('forced-on', 'forced-off', 'blocked')
        .required()
        .messages({
            'any.only': 'Status must be one of: forced-on, forced-off, or blocked',
        }),
    description: Joi.string().allow('').max(500).optional().messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    color: Joi.string().default('#64748b').optional().messages({
        'string.pattern.base': 'Invalid color format',
    }),
})

/**
 * ── Create Feature Flag Schema ───────────────────────────────────
 */
export const createFeatureFlagSchema = Joi.object({
    name: Joi.string().min(1).max(120).required().messages({
        'string.empty': 'Feature flag name is required',
        'string.max': 'Feature flag name cannot exceed 120 characters',
    }),
    key: Joi.string().min(1).max(120).required().messages({
        'string.empty': 'Feature flag key is required',
        'string.max': 'Feature flag key cannot exceed 120 characters',
    }),
    description: Joi.string().allow('').max(500).default('').optional().messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    type: Joi.string()
        .valid('RELEASE', 'EXPERIMENT', 'OPS')
        .default('RELEASE')
        .optional()
        .messages({
            'any.only': 'Type must be one of: RELEASE, EXPERIMENT, or OPS',
        }),
    environment: Joi.string()
        .valid('Production', 'Staging')
        .default('Production')
        .optional()
        .messages({
            'any.only': 'Environment must be either Production or Staging',
        }),
    enabled: Joi.boolean().default(false).optional(),
    rolloutPercentage: Joi.number().integer().min(0).max(100).default(0).optional().messages({
        'number.min': 'Rollout percentage cannot be less than 0',
        'number.max': 'Rollout percentage cannot exceed 100',
    }),
    allTenants: Joi.boolean().default(false).optional(),
    tenantCount: Joi.number().integer().min(0).default(0).optional(),
    tenantOverrides: Joi.array().items(tenantOverrideSchema).default([]).optional(),
})

/**
 * ── Update Feature Flag Schema ───────────────────────────────────
 */
export const updateFeatureFlagSchema = Joi.object({
    name: Joi.string().min(1).max(120).optional().messages({
        'string.empty': 'Feature flag name is required',
        'string.max': 'Feature flag name cannot exceed 120 characters',
    }),
    key: Joi.string().min(1).max(120).optional().messages({
        'string.empty': 'Feature flag key is required',
        'string.max': 'Feature flag key cannot exceed 120 characters',
    }),
    description: Joi.string().allow('').max(500).optional().messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    type: Joi.string()
        .valid('RELEASE', 'EXPERIMENT', 'OPS')
        .optional()
        .messages({
            'any.only': 'Type must be one of: RELEASE, EXPERIMENT, or OPS',
        }),
    environment: Joi.string()
        .valid('Production', 'Staging')
        .optional()
        .messages({
            'any.only': 'Environment must be either Production or Staging',
        }),
    enabled: Joi.boolean().optional(),
    rolloutPercentage: Joi.number().integer().min(0).max(100).optional().messages({
        'number.min': 'Rollout percentage cannot be less than 0',
        'number.max': 'Rollout percentage cannot exceed 100',
    }),
    allTenants: Joi.boolean().optional(),
    tenantCount: Joi.number().integer().min(0).optional(),
    tenantOverrides: Joi.array().items(tenantOverrideSchema).optional(),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
})

/**
 * ── List Feature Flags Schema ───────────────────────────────────
 */
export const listFeatureFlagsSchema = Joi.object({
    environment: Joi.string().valid('Production', 'Staging').optional().messages({
        'any.only': 'Environment must be either Production or Staging',
    }),
})

/**
 * ── Toggle Feature Flag Schema ──────────────────────────────────
 */
export const toggleFeatureFlagSchema = Joi.object({
    enabled: Joi.boolean().optional(),
})

/**
 * ── Add Tenant Override Schema ──────────────────────────────────
 */
export const addTenantOverrideSchema = Joi.object({
    name: Joi.string().min(1).max(120).required().messages({
        'string.empty': 'Tenant name is required',
        'string.max': 'Tenant name cannot exceed 120 characters',
    }),
    initials: Joi.string().min(1).max(4).required().messages({
        'string.empty': 'Tenant initials are required',
        'string.max': 'Initials cannot exceed 4 characters',
    }),
    status: Joi.string()
        .valid('forced-on', 'forced-off', 'blocked')
        .required()
        .messages({
            'any.only': 'Status must be one of: forced-on, forced-off, or blocked',
        }),
    description: Joi.string().allow('').max(500).default('').optional().messages({
        'string.max': 'Description cannot exceed 500 characters',
    }),
    color: Joi.string().default('#64748b').optional(),
})
