import { AppError } from '../middleware/errorHandler'
import { Leave, type ILeave, type LeaveStatus } from '../models/Leave'
import type { PaginationQuery } from '../types'

interface CreateLeaveInput {
  employeeId: string
  organizationId?: string | null
  employeeName: string
  leaveType: string
  fromDate: Date
  toDate: Date
  reason: string
  supportingDocument?: string | null
}

interface ListLeaveQuery extends PaginationQuery {
  organizationId?: string
  role: string
  userId: string
  status?: string
  employeeId?: string
}

export class LeaveService {
  async createLeave(input: CreateLeaveInput): Promise<ILeave> {
    if (input.toDate < input.fromDate) {
      throw new AppError('To date must be the same or later than from date', 400)
    }

    const leave = await Leave.create({
      employeeId: input.employeeId,
      organizationId: input.organizationId ?? null,
      employeeName: input.employeeName,
      leaveType: input.leaveType,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason,
      supportingDocument: input.supportingDocument ?? null,
      status: 'Pending',
    })

    return leave
  }

  async listLeaves(query: ListLeaveQuery): Promise<ILeave[]> {
    const filter: Record<string, unknown> = {}
    if (query.organizationId) {
      filter.organizationId = query.organizationId
    }

    if (query.status) {
      filter.status = query.status
    }

    const canViewAll = ['org_admin', 'hr_admin', 'admin'].includes(query.role)
    if (!canViewAll) {
      filter.employeeId = query.userId
    } else if (query.employeeId) {
      filter.employeeId = query.employeeId
    }

    return await Leave.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit ?? 50)
  }

  async getLeaveById(id: string, organizationId?: string): Promise<ILeave> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new AppError('Invalid leave request ID', 400)
    }

    const query: Record<string, unknown> = { _id: id }
    if (organizationId) {
      query.organizationId = organizationId
    }

    const leave = await Leave.findOne(query)
    if (!leave) {
      throw new AppError('Leave request not found', 404)
    }

    return leave
  }

  async updateLeaveStatus(id: string, organizationId: string | undefined, status: LeaveStatus, reviewerId: string): Promise<ILeave> {
    const leave = await this.getLeaveById(id, organizationId)
    if (leave.status === status) {
      return leave
    }

    leave.status = status
    leave.reviewedBy = reviewerId
    leave.reviewedAt = new Date()
    await leave.save()
    return leave
  }
}

export const leaveService = new LeaveService()
