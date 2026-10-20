import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Addon } from '../models/Addon'
import { sendSuccess, sendError } from '../utils/apiResponse'
import logger from '../utils/logger'

const keys = ['asset_management', 'announcement', 'notification'] as const
const currencies = ['USD', 'EUR', 'INR'] as const
const statuses = ['active', 'inactive'] as const
const billingCycles = ['one_time', 'monthly', 'yearly'] as const
const addonTypes = ['feature_module', 'usage_based', 'per_seat'] as const
const trialUnits = ['days', 'none'] as const
const applicablePlanValues = ['starter', 'growth', 'enterprise', 'all'] as const

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Invalid add-on request' }

function normalizeUsageLimit(value: unknown): string | null {
    const usageLimit = String(value ?? '').trim()
    if (!usageLimit) return null
    if (usageLimit.toLowerCase() === 'unlimited') return 'unlimited'
    return usageLimit
}

function addonIdQuery(addonId: string) {
    const ids: Array<string | mongoose.Types.ObjectId> = [addonId]
    if (mongoose.isValidObjectId(addonId)) ids.push(new mongoose.Types.ObjectId(addonId))
    return { _id: { $in: ids } }
}

export const addonController = {
    async list(_req: Request, res: Response) {
        try {
            const addons = await Addon.find().sort({ sortOrder: 1, moduleKey: 1 }).lean()
            sendSuccess(res, 200, 'Add-ons retrieved', { addons, total: addons.length })
        } catch (error) {
            logger.error('[AddonController] Error listing add-ons', error)
            sendError(res, 500, 'Failed to retrieve add-ons')
        }
    },
    async create(req: Request, res: Response) {
        try {
            const { moduleKey, moduleName, description = '', flatPrice, currency = 'USD', status = 'active', billingCycle = 'monthly', addonType = 'feature_module', trialPeriodDays = 0, trialPeriodUnit = 'none', usageLimit = '', sortOrder = 0, applicablePlans = ['all'] } = req.body
            const identifier = String(req.body.identifier || `${moduleName || ''}_addon`).trim().toLowerCase()

            // Validate moduleKey
            if (!moduleKey || !keys.includes(moduleKey)) {
                sendError(res, 400, 'Invalid module key. Must be one of: asset_management, announcement, notification')
                return
            }

            // Validate moduleName
            if (!moduleName || !String(moduleName).trim()) {
                sendError(res, 400, 'Module name is required and cannot be empty')
                return
            }

            if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(identifier)) {
                sendError(res, 400, 'Identifier must contain only lowercase letters, numbers, underscores, or hyphens')
                return
            }

            // Validate flatPrice
            if (!Number.isFinite(flatPrice) || flatPrice < 0) {
                sendError(res, 400, 'Price must be a number >= 0')
                return
            }

            // Validate currency
            if (!currencies.includes(currency)) {
                sendError(res, 400, 'Invalid currency. Must be one of: USD, EUR, INR')
                return
            }

            if (!billingCycles.includes(billingCycle) || !addonTypes.includes(addonType) || !trialUnits.includes(trialPeriodUnit)) {
                sendError(res, 400, 'Invalid billing cycle, add-on type, or trial unit')
                return
            }
            if (!Number.isInteger(trialPeriodDays) || trialPeriodDays < 0 || (trialPeriodUnit === 'none' && trialPeriodDays !== 0) || (trialPeriodUnit === 'days' && trialPeriodDays < 1)) {
                sendError(res, 400, 'Trial period must be zero for no trial or a positive whole number of days')
                return
            }
            const normalizedUsageLimit = normalizeUsageLimit(usageLimit)
            if (!normalizedUsageLimit) {
                sendError(res, 400, 'Usage limit must be a value or unlimited')
                return
            }
            if (!Number.isInteger(sortOrder) || sortOrder < 0) {
                sendError(res, 400, 'Sort order must be a non-negative whole number')
                return
            }
            if (!Array.isArray(applicablePlans) || applicablePlans.length === 0 || applicablePlans.some((plan: string) => !applicablePlanValues.includes(plan as typeof applicablePlanValues[number])) || (applicablePlans.includes('all') && applicablePlans.length > 1)) {
                sendError(res, 400, 'Applicable plans must contain All plans or one or more specific plans')
                return
            }

            // Validate status
            if (!statuses.includes(status)) {
                sendError(res, 400, 'Invalid status. Must be one of: active, inactive')
                return
            }

            const addon = await Addon.create({
                moduleKey,
                moduleName: moduleName.trim(),
                identifier,
                description: description?.trim() || '',
                flatPrice,
                currency,
                billingCycle,
                addonType,
                trialPeriodDays,
                trialPeriodUnit,
                usageLimit: normalizedUsageLimit,
                sortOrder,
                applicablePlans,
                status
            })

            logger.info('[AddonController] Add-on created', { moduleKey, moduleName, flatPrice, currency })
            sendSuccess(res, 201, 'Add-on created successfully', addon)
        } catch (error: any) {
            logger.error('[AddonController] Error creating add-on', error)

            // Handle duplicate key error
            if (error.code === 11000) {
                sendError(res, 409, 'This module key already exists. Each module can have only one add-on.')
                return
            }

            sendError(res, 400, errorMessage(error))
        }
    },
    async update(req: Request, res: Response) {
        try {
            const { addonId } = req.params
            const updates = { ...req.body }

            // Don't allow moduleKey to be changed
            if (updates.moduleKey !== undefined) {
                delete updates.moduleKey
            }

            if (updates.identifier !== undefined) {
                updates.identifier = String(updates.identifier).trim().toLowerCase()
                if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(updates.identifier)) {
                    sendError(res, 400, 'Identifier must contain only lowercase letters, numbers, underscores, or hyphens')
                    return
                }
            }

            // Validate and normalize inputs
            if (updates.moduleName !== undefined) {
                if (!String(updates.moduleName).trim()) {
                    sendError(res, 400, 'Module name cannot be empty')
                    return
                }
                updates.moduleName = String(updates.moduleName).trim()
            }

            if (updates.description !== undefined) {
                updates.description = String(updates.description).trim().substring(0, 500)
            }

            if (updates.flatPrice !== undefined) {
                if (!Number.isFinite(updates.flatPrice) || updates.flatPrice < 0) {
                    sendError(res, 400, 'Price must be a number >= 0')
                    return
                }
            }

            if (updates.currency !== undefined) {
                if (!currencies.includes(updates.currency)) {
                    sendError(res, 400, 'Invalid currency. Must be one of: USD, EUR, INR')
                    return
                }
            }

            if (updates.billingCycle !== undefined && !billingCycles.includes(updates.billingCycle)) {
                sendError(res, 400, 'Invalid billing cycle')
                return
            }
            if (updates.addonType !== undefined && !addonTypes.includes(updates.addonType)) {
                sendError(res, 400, 'Invalid add-on type')
                return
            }
            if (updates.trialPeriodUnit !== undefined && !trialUnits.includes(updates.trialPeriodUnit)) {
                sendError(res, 400, 'Invalid trial unit')
                return
            }
            if (updates.trialPeriodDays !== undefined && (!Number.isInteger(updates.trialPeriodDays) || updates.trialPeriodDays < 0)) {
                sendError(res, 400, 'Trial period must be a non-negative whole number')
                return
            }
            if (updates.usageLimit !== undefined) {
                const normalizedUsageLimit = normalizeUsageLimit(updates.usageLimit)
                if (!normalizedUsageLimit) {
                    sendError(res, 400, 'Usage limit must be a value or unlimited')
                    return
                }
                updates.usageLimit = normalizedUsageLimit
            }
            const currentAddon = await Addon.findOne(addonIdQuery(addonId)).select('trialPeriodDays trialPeriodUnit').lean()
            const trialDays = updates.trialPeriodDays ?? currentAddon?.trialPeriodDays ?? 0
            const trialUnit = updates.trialPeriodUnit ?? currentAddon?.trialPeriodUnit ?? 'none'
            if ((trialUnit === 'none' && trialDays !== 0) || (trialUnit === 'days' && trialDays < 1)) {
                sendError(res, 400, 'Trial period must be zero for no trial or a positive whole number of days')
                return
            }
            if (updates.sortOrder !== undefined && (!Number.isInteger(updates.sortOrder) || updates.sortOrder < 0)) {
                sendError(res, 400, 'Sort order must be a non-negative whole number')
                return
            }
            if (updates.applicablePlans !== undefined && (!Array.isArray(updates.applicablePlans) || updates.applicablePlans.length === 0 || updates.applicablePlans.some((plan: string) => !applicablePlanValues.includes(plan as typeof applicablePlanValues[number])) || (updates.applicablePlans.includes('all') && updates.applicablePlans.length > 1))) {
                sendError(res, 400, 'Applicable plans must contain All plans or one or more specific plans')
                return
            }

            if (updates.status !== undefined) {
                if (!statuses.includes(updates.status)) {
                    sendError(res, 400, 'Invalid status. Must be one of: active, inactive')
                    return
                }
                
                // If changing status to inactive, trigger cascade deactivation in organization backend
                if (updates.status === 'inactive') {
                    try {
                        // Call organization backend to cascade deactivate this addon
                        const orgBackendUrl = process.env.ORG_BACKEND_URL || 'http://localhost:5000'
                        await fetch(`${orgBackendUrl}/api/v1/organization-addons/handle-deactivation`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Internal-Auth': process.env.INTERNAL_SERVICE_AUTH_TOKEN || 'internal-secret',
                            },
                            body: JSON.stringify({ addonPlanId: addonId }),
                        })
                    } catch (cascadeError) {
                        // Log but don't fail the Platform deactivation
                        logger.error('[AddonController] Failed to cascade deactivate addon in organization backend', {
                            addonPlanId: addonId,
                            error: cascadeError instanceof Error ? cascadeError.message : String(cascadeError),
                        })
                    }
                }
            }

            const addon = await Addon.findOneAndUpdate(addonIdQuery(addonId), updates, { new: true, runValidators: true }).lean()

            if (!addon) {
                sendError(res, 404, 'Add-on not found')
                return
            }

            logger.info('[AddonController] Add-on updated', { addonId, updates })
            sendSuccess(res, 200, 'Add-on updated successfully', addon)
        } catch (error: any) {
            logger.error('[AddonController] Error updating add-on', error)
            sendError(res, 400, errorMessage(error))
        }
    },
    async remove(req: Request, res: Response) {
        try {
            const { addonId } = req.params
            const addon = await Addon.findOneAndDelete(addonIdQuery(addonId))

            if (!addon) {
                sendError(res, 404, 'Add-on not found')
                return
            }

            logger.info('[AddonController] Add-on deleted', { addonId, moduleKey: addon.moduleKey })
            sendSuccess(res, 200, 'Add-on deleted successfully', addon)
        } catch (error: any) {
            logger.error('[AddonController] Error deleting add-on', error)
            sendError(res, 500, 'Failed to delete add-on')
        }
    },
}
