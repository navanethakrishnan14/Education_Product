import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { platformDashboardService } from '../services/platformDashboard.service'
import { platformAnalyticsService } from '../services/platformAnalytics.service'
import { featureFlagService } from '../services/featureFlag.service'
import { AppError } from '../middleware/errorHandler'

export const platformController = {
    async getDashboard(_req: Request, res: Response): Promise<void> {
        const data = await platformDashboardService.getDashboard()
        sendSuccess(res, 200, 'Dashboard data retrieved', data.data)
    },

    async getAnalytics(req: Request, res: Response): Promise<void> {
        const period = typeof req.query.period === 'string' ? req.query.period : '30d'
        if (!['7d', '30d', 'QTD', '12m'].includes(period)) {
            sendError(res, 400, 'Invalid period. Supported values: 7d, 30d, QTD, 12m')
            return
        }
        const data = await platformAnalyticsService.getAnalytics(period)
        sendSuccess(res, 200, 'Analytics data retrieved', data.data)
    },

    async listFeatureFlags(req: Request, res: Response): Promise<void> {
        const env = typeof req.query.environment === 'string' ? req.query.environment as 'Production' | 'Staging' : undefined
        if (env && !['Production', 'Staging'].includes(env)) {
            sendError(res, 400, 'Invalid environment filter. Use Production or Staging.')
            return
        }
        const data = await featureFlagService.list(env)
        sendSuccess(res, 200, 'Feature flags retrieved', data)
    },

    async getFeatureFlag(req: Request, res: Response): Promise<void> {
        const data = await featureFlagService.getById(req.params.id)
        sendSuccess(res, 200, 'Feature flag retrieved', data)
    },

    async createFeatureFlag(req: Request, res: Response): Promise<void> {
        const data = await featureFlagService.create(req.body)
        sendSuccess(res, 201, 'Feature flag created successfully', data)
    },

    async updateFeatureFlag(req: Request, res: Response): Promise<void> {
        const data = await featureFlagService.update(req.params.id, req.body)
        sendSuccess(res, 200, 'Feature flag updated successfully', data)
    },

    async toggleFeatureFlag(req: Request, res: Response): Promise<void> {
        const enabled = req.body && typeof req.body.enabled === 'boolean' ? req.body.enabled : undefined
        const data = await featureFlagService.toggle(req.params.id, enabled)
        sendSuccess(res, 200, 'Feature flag updated successfully', data)
    },

    async deleteFeatureFlag(req: Request, res: Response): Promise<void> {
        await featureFlagService.delete(req.params.id)
        sendSuccess(res, 200, 'Feature flag deleted successfully')
    },

    async seedDemoFeatureFlags(_req: Request, res: Response): Promise<void> {
        const { FeatureFlag } = await import('../models/FeatureFlag')
        const count = await FeatureFlag.countDocuments()
        if (count > 0) {
            sendSuccess(res, 200, 'Feature flags already seeded', { inserted: 0 })
            return
        }

        const seed = [
            {
                name: 'new_payroll_engine',
                key: 'new_payroll_engine',
                description: 'Next-gen payroll calculation with multi-country tax packs.',
                type: 'RELEASE',
                environment: 'Production',
                enabled: true,
                rolloutPercentage: 25,
                allTenants: false,
                tenantCount: 62,
                tenantOverrides: [
                    { name: 'Acme Corp', initials: 'AC', status: 'forced-on', description: 'trial enabled', color: 'bg-teal-500' },
                    { name: 'Novato Labs', initials: 'NV', status: 'forced-on', description: 'trial enabled', color: 'bg-blue-500' },
                    { name: 'Brightway Health', initials: 'BH', status: 'blocked', color: 'bg-red-500' },
                ],
                createdBy: 'payroll-team',
                updatedBy: 'payroll-team',
            },
            {
                name: 'digital_id_v2',
                key: 'digital_id_v2',
                description: 'Redesigned digital ID card with rotating QR access.',
                type: 'RELEASE',
                environment: 'Production',
                enabled: true,
                rolloutPercentage: 100,
                allTenants: true,
                tenantCount: 238,
                tenantOverrides: [],
                createdBy: 'platform-team',
                updatedBy: 'platform-team',
            },
            {
                name: 'ai_leave_suggestions',
                key: 'ai_leave_suggestions',
                description: 'Suggest optimal leave dates based on team coverage.',
                type: 'EXPERIMENT',
                environment: 'Production',
                enabled: true,
                rolloutPercentage: 10,
                allTenants: false,
                tenantCount: 24,
                tenantOverrides: [],
                createdBy: 'ai-team',
                updatedBy: 'ai-team',
            },
            {
                name: 'maintenance_banner',
                key: 'maintenance_banner',
                description: 'Show a scheduled-maintenance banner to all users.',
                type: 'OPS',
                environment: 'Production',
                enabled: false,
                rolloutPercentage: 0,
                allTenants: false,
                tenantCount: 0,
                tenantOverrides: [],
                createdBy: 'ops-team',
                updatedBy: 'ops-team',
            },
        ]

        await FeatureFlag.insertMany(seed)
        sendSuccess(res, 201, 'Feature flags seeded successfully', { inserted: seed.length })
    },
}
