import { Request, Response } from 'express'
import { leaveService } from '../services/leave.service'
import { sendSuccess } from '../utils/apiResponse'

export const leaveController = {
  async create(req: Request, res: Response): Promise<void> {
    const organizationId = req.user?.organizationId
    if (!organizationId && req.user?.role !== 'admin') {
      throw new Error('Organization ID required')
    }

    const input = {
      employeeId: req.user!.userId,
      organizationId: organizationId ?? null,
      employeeName: req.body.employeeName,
      leaveType: req.body.leaveType,
      fromDate: new Date(req.body.fromDate),
      toDate: new Date(req.body.toDate),
      reason: req.body.reason,
      supportingDocument: req.body.supportingDocument,
    }

    const leave = await leaveService.createLeave(input)
    sendSuccess(res, 201, 'Leave request submitted', {
      leave,
    })
  },

  async list(req: Request, res: Response): Promise<void> {
    const organizationId = req.user?.organizationId
    if (!organizationId && req.user?.role !== 'admin') {
      throw new Error('Organization ID required')
    }

    const leaves = await leaveService.listLeaves({
      organizationId: organizationId ?? undefined,
      role: req.user!.role,
      userId: req.user!.userId,
      status: req.query.status as string | undefined,
      employeeId: req.query.employeeId as string | undefined,
    })

    sendSuccess(res, 200, 'Leave requests retrieved', { leaves })
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const organizationId = req.user?.organizationId
    if (!organizationId && req.user?.role !== 'admin') {
      throw new Error('Organization ID required')
    }

    const leave = await leaveService.updateLeaveStatus(
      req.params.id,
      organizationId ?? undefined,
      req.body.status,
      req.user!.userId,
    )

    sendSuccess(res, 200, 'Leave request status updated', {
      leave,
    })
  },
}
