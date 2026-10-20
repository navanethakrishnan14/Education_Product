import { Attendance, IAttendance } from '../models/Attendance'
import { Employee } from '../models/Employee'
import { Organization } from '../models/Organization'
import { AppError } from '../middleware/errorHandler'

export interface CheckInInput {
  employeeId: string
  organizationId?: string
  latitude: number
  longitude: number
  premises: string
}

export interface CheckOutInput {
  employeeId: string
  organizationId?: string
  latitude: number
  longitude: number
  premises: string
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

async function ensureAttendanceThroughToday(employee: IEmployeeLike, today: Date): Promise<void> {
  const joiningDate = employee.employeeProfile?.job?.joiningDate ?? employee.createdAt
  const firstDay = startOfDay(new Date(joiningDate))
  if (firstDay > today) return

  const dates: Date[] = []
  for (const date = new Date(firstDay); date <= today; date.setDate(date.getDate() + 1)) {
    dates.push(new Date(date))
  }

  await Attendance.bulkWrite(
    dates.map((date) => ({
      updateOne: {
        filter: { employeeId: employee._id, organizationId: employee.organizationId, date },
        update: { $setOnInsert: { employeeId: employee._id, organizationId: employee.organizationId, date, status: 'absent' } },
        upsert: true,
      },
    }))
  )
}

type IEmployeeLike = Pick<EmployeeDocument, '_id' | 'organizationId' | 'createdAt' | 'employeeProfile'>
type EmployeeDocument = {
  _id: string
  organizationId: string
  createdAt: Date
  employeeProfile?: { job?: { joiningDate?: Date } }
}

export const attendanceService = {
  async checkIn(input: CheckInInput): Promise<IAttendance> {
    // Verify employee exists and belongs to organization
    const employee = await Employee.findOne({
      _id: input.employeeId,
      organizationId: input.organizationId,
    })
    if (!employee) {
      throw new AppError('Employee not found or does not belong to this organization', 404)
    }

    // Check if organization exists
    const organization = await Organization.findById(input.organizationId)
    if (!organization) {
      throw new AppError('Organization not found', 404)
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const existingAttendance = await Attendance.findOne({
      employeeId: input.employeeId,
      date: today,
    })

    if (existingAttendance?.status === 'present') {
      throw new AppError('Employee already checked in today', 400)
    }

    const attendance = existingAttendance ?? new Attendance({
      employeeId: input.employeeId,
      organizationId: input.organizationId,
      date: today,
    })
    attendance.status = 'present'
    attendance.checkInTime = now
    attendance.checkInLocation = { lat: input.latitude, lng: input.longitude }
    attendance.checkInPremises = input.premises

    return await attendance.save()
  },

  async checkOut(input: CheckOutInput): Promise<IAttendance> {
    // Verify employee exists and belongs to organization
    const employee = await Employee.findOne({
      _id: input.employeeId,
      organizationId: input.organizationId,
    })
    if (!employee) {
      throw new AppError('Employee not found or does not belong to this organization', 404)
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Find today's check-in record without check-out
    const attendance = await Attendance.findOne({
      employeeId: input.employeeId,
      date: today,
      status: 'present',
      checkOutTime: { $exists: false },
    })

    if (!attendance) {
      throw new AppError('No active check-in found for today', 404)
    }

    // Update with check-out details
    attendance.checkOutTime = now
    attendance.checkOutLocation = {
      lat: input.latitude,
      lng: input.longitude,
    }
    attendance.checkOutPremises = input.premises

    return await attendance.save()
  },

  async getAttendance(employeeId: string, organizationId: string, date?: Date): Promise<IAttendance[]> {
    const employee = await Employee.findOne({ _id: employeeId, organizationId })
    if (!employee) throw new AppError('Employee not found or does not belong to this organization', 404)

    const today = startOfDay(new Date())
    const requestedDay = date ? startOfDay(date) : undefined
    if (requestedDay && requestedDay > today) return []

    await ensureAttendanceThroughToday(employee as unknown as IEmployeeLike, today)

    const query: Record<string, unknown> = { employeeId, organizationId, date: { $lte: today } }

    if (requestedDay) {
      const endOfDay = new Date(requestedDay)
      endOfDay.setDate(endOfDay.getDate() + 1)
      query.date = { $gte: requestedDay, $lt: endOfDay, $lte: today }
    }

    return await Attendance.find(query).sort({ date: -1, checkInTime: -1 })
  },
}