import { Request, Response } from 'express'
import { billingService } from '../services/billing.service'
import { sendSuccess } from '../utils/apiResponse'

export const billingController = {
    async listPlans(_req: Request, res: Response): Promise<void> {
        const data = await billingService.listPlans()
        sendSuccess(res, 200, 'Plans retrieved', data)
    },

    async getPlan(req: Request, res: Response): Promise<void> {
        const data = await billingService.getPlan(req.params.id)
        sendSuccess(res, 200, 'Plan retrieved', data)
    },

    async createPlan(req: Request, res: Response): Promise<void> {
        const data = await billingService.createPlan(req.body)
        sendSuccess(res, 201, 'Plan created successfully', data)
    },

    async updatePlan(req: Request, res: Response): Promise<void> {
        const data = await billingService.updatePlan(req.params.id, req.body)
        sendSuccess(res, 200, 'Plan updated successfully', data)
    },

    async deletePlan(req: Request, res: Response): Promise<void> {
        await billingService.deletePlan(req.params.id)
        sendSuccess(res, 200, 'Plan deleted successfully')
    },

    async listModulesPublic(_req: Request, res: Response): Promise<void> {
        const data = billingService.getModuleCatalog()
        sendSuccess(res, 200, 'Modules retrieved', data)
    },

    async listModules(_req: Request, res: Response): Promise<void> {
        const data = billingService.getModuleCatalog()
        sendSuccess(res, 200, 'Modules retrieved', data)
    },

    async listInvoices(req: Request, res: Response): Promise<void> {
        const limit = Number(req.query.limit ?? 5)
        const data = await billingService.listInvoices(Number.isFinite(limit) ? limit : 5)
        sendSuccess(res, 200, 'Invoices retrieved', data)
    },

    async listRenewals(req: Request, res: Response): Promise<void> {
        const limit = Number(req.query.limit ?? 5)
        const data = await billingService.listRenewals(Number.isFinite(limit) ? limit : 5)
        sendSuccess(res, 200, 'Renewals retrieved', data)
    },

    async getRevenueOverview(_req: Request, res: Response): Promise<void> {
        const data = await billingService.getRevenueOverview()
        sendSuccess(res, 200, 'Revenue overview retrieved', data)
    },
}
