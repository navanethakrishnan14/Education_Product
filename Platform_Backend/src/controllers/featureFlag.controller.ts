import { Request, Response } from 'express'
import { featureFlagService } from '../services/featureFlag.service'
import { sendSuccess } from '../utils/apiResponse'

export const featureFlagController = {
    /**
     * ── Get all feature flags ────────────────────────────────────────
     * @summary Retrieve all feature flags, optionally filtered by environment
     */
    async list(req: Request, res: Response): Promise<void> {
        const environment = (req.query.environment as string | undefined) as 'Production' | 'Staging' | undefined
        const flags = await featureFlagService.list(environment)
        sendSuccess(res, 200, 'Feature flags retrieved successfully', flags)
    },

    /**
     * ── Get feature flag by ID ───────────────────────────────────────
     * @summary Retrieve a single feature flag by ID
     */
    async getById(req: Request, res: Response): Promise<void> {
        const flag = await featureFlagService.getById(req.params.id)
        sendSuccess(res, 200, 'Feature flag retrieved successfully', flag)
    },

    /**
     * ── Create new feature flag ──────────────────────────────────────
     * @summary Create a new feature flag with specified parameters
     */
    async create(req: Request, res: Response): Promise<void> {
        const createdBy = (req as any).user?.email || 'system'
        const flag = await featureFlagService.create({
            ...req.body,
            createdBy,
        })
        sendSuccess(res, 201, 'Feature flag created successfully', flag)
    },

    /**
     * ── Update feature flag ──────────────────────────────────────────
     * @summary Update an existing feature flag
     */
    async update(req: Request, res: Response): Promise<void> {
        const updatedBy = (req as any).user?.email || 'system'
        const flag = await featureFlagService.update(req.params.id, {
            ...req.body,
            updatedBy,
        })
        sendSuccess(res, 200, 'Feature flag updated successfully', flag)
    },

    /**
     * ── Toggle feature flag ──────────────────────────────────────────
     * @summary Toggle a feature flag on/off or set to specific state
     */
    async toggle(req: Request, res: Response): Promise<void> {
        const { enabled } = req.body
        const flag = await featureFlagService.toggle(req.params.id, enabled)
        sendSuccess(res, 200, 'Feature flag toggled successfully', flag)
    },

    /**
     * ── Delete feature flag ──────────────────────────────────────────
     * @summary Delete a feature flag permanently
     */
    async delete(req: Request, res: Response): Promise<void> {
        await featureFlagService.delete(req.params.id)
        sendSuccess(res, 200, 'Feature flag deleted successfully')
    },

    /**
     * ── Add tenant override ──────────────────────────────────────────
     * @summary Add a tenant override to a feature flag
     */
    async addTenantOverride(req: Request, res: Response): Promise<void> {
        const flag = await featureFlagService.addTenantOverride(req.params.id, req.body)
        sendSuccess(res, 201, 'Tenant override added successfully', flag)
    },

    /**
     * ── Remove tenant override ───────────────────────────────────────
     * @summary Remove a tenant override from a feature flag
     */
    async removeTenantOverride(req: Request, res: Response): Promise<void> {
        const overrideIndex = parseInt(req.params.overrideIndex, 10)
        if (isNaN(overrideIndex)) {
            res.status(400).json({ success: false, message: 'Invalid override index' })
            return
        }
        const flag = await featureFlagService.removeTenantOverride(req.params.id, overrideIndex)
        sendSuccess(res, 200, 'Tenant override removed successfully', flag)
    },
}
