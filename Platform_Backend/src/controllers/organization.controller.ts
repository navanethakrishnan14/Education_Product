import { Request, Response } from 'express'
import { organizationService } from '../services/organization.service'
import { BillingPlan } from '../models/BillingPlan'
import { sendSuccess } from '../utils/apiResponse'

export const organizationController = {
  /**
   * POST /platform/organizations
   * Create a new organization (5-step wizard or legacy single-form).
   */
  async create(req: Request, res: Response): Promise<void> {
    const result = await organizationService.create(req.body)

    // Optionally enrich response with plan details
    let planData: unknown = undefined
    if (result.organization.planId) {
      planData = await BillingPlan.findById(result.organization.planId).lean()
    }

    sendSuccess(res, 201, 'Organization created successfully.', {
      organization: result.organization,
      admin: result.organization.adminSetup
        ? { email: result.organization.adminSetup.adminEmail }
        : null,
      plan: planData ?? null,
      ...(result.temporaryPassword ? { temporaryPassword: result.temporaryPassword } : {}),
    })
  },

  async list(req: Request, res: Response): Promise<void> {
    const result = await organizationService.list(req.query as never)
    const { data, ...pagination } = result
    sendSuccess(res, 200, 'Organizations retrieved', data, pagination)
  },

  async getById(req: Request, res: Response): Promise<void> {
    const org = await organizationService.getById(req.params.id)
    sendSuccess(res, 200, 'Organization retrieved', org)
  },

  async getDetailedMetrics(req: Request, res: Response): Promise<void> {
    const metrics = await organizationService.getDetailedMetrics(req.params.id)
    sendSuccess(res, 200, 'Metrics retrieved', metrics)
  },

  async update(req: Request, res: Response): Promise<void> {
    const org = await organizationService.update(req.params.id, req.body)
    sendSuccess(res, 200, 'Organization updated successfully', org)
  },

  async delete(req: Request, res: Response): Promise<void> {
    await organizationService.delete(req.params.id)
    sendSuccess(res, 200, 'Organization deleted successfully')
  },
}
