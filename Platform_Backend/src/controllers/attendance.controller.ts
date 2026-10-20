import { Request, Response } from 'express'
import { attendanceService } from '../services/attendance.service'
import { sendSuccess } from '../utils/apiResponse'
import { IAttendance } from '../models/Attendance'

export const attendanceController = {
  async checkIn(req: Request, res: Response): Promise<void> {
    if (!req.user!.organizationId) {
      throw new Error('Organization ID required')
    }

    const input = {
      employeeId: req.user!.userId,
      organizationId: req.user!.organizationId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      premises: req.body.premises,
    }

    const attendance = await attendanceService.checkIn(input)
    sendSuccess(res, 201, 'Checked in successfully', {
      attendance: {
        id: attendance._id,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        checkInLocation: attendance.checkInLocation,
        checkInPremises: attendance.checkInPremises,
        date: attendance.date,
      },
    })
  },

  async checkOut(req: Request, res: Response): Promise<void> {
    if (!req.user!.organizationId) {
      throw new Error('Organization ID required')
    }

    const input = {
      employeeId: req.user!.userId,
      organizationId: req.user!.organizationId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      premises: req.body.premises,
    }

    const attendance = await attendanceService.checkOut(input)
    sendSuccess(res, 200, 'Checked out successfully', {
      attendance: {
        id: attendance._id,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        checkInLocation: attendance.checkInLocation,
        checkInPremises: attendance.checkInPremises,
        checkOutTime: attendance.checkOutTime,
        checkOutLocation: attendance.checkOutLocation,
        checkOutPremises: attendance.checkOutPremises,
        date: attendance.date,
      },
    })
  },

  async getAttendance(req: Request, res: Response): Promise<void> {
    if (!req.user!.organizationId) {
      throw new Error('Organization ID required')
    }

    const employeeId = req.params.employeeId || req.user!.userId
    const organizationId = req.user!.organizationId
    const date = req.query.date ? new Date(req.query.date as string) : undefined

    // If requesting another employee's attendance, check permissions
    if (employeeId !== req.user!.userId && req.user!.role !== 'org_admin' && req.user!.role !== 'hr_admin') {
      throw new Error('Access denied')
    }

    const attendance = await attendanceService.getAttendance(employeeId, organizationId, date)
    sendSuccess(res, 200, 'Attendance retrieved successfully', {
      attendance: attendance.map((record: IAttendance) => ({
        id: record._id,
        status: record.status,
        checkInTime: record.checkInTime,
        checkInLocation: record.checkInLocation,
        checkInPremises: record.checkInPremises,
        checkOutTime: record.checkOutTime,
        checkOutLocation: record.checkOutLocation,
        checkOutPremises: record.checkOutPremises,
        date: record.date,
      })),
    })
  },
}