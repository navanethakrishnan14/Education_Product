import { Employee, IEmployee } from '../models/Employee'
import { Organization } from '../models/Organization'
import { User } from '../models/User'
import { AppError } from '../middleware/errorHandler'
import type { PaginatedResult, PaginationQuery } from '../types'

export interface EmployeeRegisterInput {
  // Personal
  firstName: string
  lastName: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth?: string
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  phoneNumber?: string
  address?: string

  // Auth identity (login)
  email: string
  password?: string
  role?: 'employee' | 'manager' | 'hr_admin' | 'org_admin' | 'admin'
  organizationId: string

  // Profile photo
  avatarUrl?: string | null

  // Roles (HR app roles/labels, distinct from auth role)
  roles?: string[]

  // Job & Work
  jobTitle?: string
  department?: string
  employmentType?: string
  workLocation?: string
  joiningDate?: string
  workEmail?: string

  // Pay & Bank
  salaryAmount?: number
  bankName?: string
  accountHolderName?: string
  accountNumber?: string
  ifscOrRoutingNumber?: string

  // Emergency
  emergencyName?: string
  emergencyRelation?: string
  emergencyPhoneNumber?: string

  // Reporting
  reportsToUserId?: string

  // Documents
  documents?: {
    idProof?: { name?: string; url: string; mimeType?: string; sizeBytes?: number }
    resume?: { name?: string; url: string; mimeType?: string; sizeBytes?: number }
    appointmentLetterOrContract?: { name?: string; url: string; mimeType?: string; sizeBytes?: number }
    certificates?: Array<{ name?: string; url?: string; mimeType?: string; sizeBytes?: number }>
  }
}

async function generateEmployeeId(organizationId: string): Promise<string> {
  const organization = await Organization.findById(organizationId).select('platformSettings.employeeIdPrefix').lean()
  const prefix = organization?.platformSettings?.employeeIdPrefix || 'EMP'
  const idRegex = `^${prefix}-(\\d+)$`

  const result = await Employee.aggregate([
    {
      $match: {
        organizationId,
        employeeId: { $regex: idRegex },
      },
    },
    {
      $project: {
        numericSuffix: {
          $toInt: {
            $arrayElemAt: [{ $split: ['$employeeId', `${prefix}-`] }, 1],
          },
        },
      },
    },
    { $sort: { numericSuffix: -1 } },
    { $limit: 1 },
  ])

  let nextNumber = 1
  if (result.length > 0 && typeof result[0].numericSuffix === 'number') {
    nextNumber = result[0].numericSuffix + 1
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`
}

function generateTempPassword(): string {
  // Meets existing Joi rules: >=8, 1 uppercase, 1 number
  const rand = Math.random().toString(36).slice(2, 8)
  return `Temp${rand}9A`
}

export class EmployeeService {
  async registerEmployee(
    input: EmployeeRegisterInput
  ): Promise<{ employee: IEmployee; temporaryPassword?: string }> {
    const existingUser = await User.findOne({ email: input.email })
    const existingEmployee = await Employee.findOne({ email: input.email })
    if (existingUser || existingEmployee) throw new AppError('Email already in use', 409)

    let employeeId = await generateEmployeeId(input.organizationId)
    let attempts = 0
    const maxAttempts = 5
    let employee

    const password = input.password ?? generateTempPassword()
    const temporaryPassword = input.password ? undefined : password

    while (true) {
      try {
        employee = await Employee.create({
          name: `${input.firstName} ${input.lastName}`.trim(),
          email: input.email,
          password,
          role: input.role ?? 'employee',
          organizationId: input.organizationId,
          avatarUrl: input.avatarUrl ?? null,
          employeeId,
          employeeProfile: {
            personal: {
              firstName: input.firstName,
              lastName: input.lastName,
              gender: input.gender,
              dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
              bloodType: input.bloodType,
              phoneNumber: input.phoneNumber,
              address: input.address,
            },
            job: {
              jobTitle: input.jobTitle,
              department: input.department,
              employmentType: input.employmentType,
              workLocation: input.workLocation,
              joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
              workEmail: input.workEmail,
            },
            pay: {
              salaryAmount: input.salaryAmount,
              bankName: input.bankName,
              accountHolderName: input.accountHolderName,
              accountNumber: input.accountNumber,
              ifscOrRoutingNumber: input.ifscOrRoutingNumber,
            },
            emergency: {
              name: input.emergencyName,
              relation: input.emergencyRelation,
              phoneNumber: input.emergencyPhoneNumber,
            },
            reporting: {
              reportsToUserId: input.reportsToUserId,
            },
            roles: input.roles ?? [],
            documents: input.documents
              ? {
                idProof: input.documents.idProof,
                resume: input.documents.resume,
                appointmentLetterOrContract: input.documents.appointmentLetterOrContract,
                certificates: input.documents.certificates ?? [],
              }
              : undefined,
          },
        })
        break
      } catch (error: any) {
        if (error?.code === 11000 && attempts < maxAttempts) {
          attempts += 1
          employeeId = await generateEmployeeId(input.organizationId)
          continue
        }
        throw error
      }
    }

    return { employee: employee as IEmployee, ...(temporaryPassword ? { temporaryPassword } : {}) }
  }

  async listEmployees(
    query?: PaginationQuery & { search?: string; organizationId?: string }
  ): Promise<PaginatedResult<IEmployee>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, organizationId } = query || {}

    const filter: Record<string, unknown> = {}

    if (organizationId) {
      filter.organizationId = organizationId
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employeeId: new RegExp(search, 'i') },
      ]
    }

    const [data, total] = await Promise.all([
      Employee.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Employee.countDocuments(filter),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getEmployeeById(id: string): Promise<IEmployee> {
    const employee = await Employee.findById(id)
    if (!employee) throw new AppError('Employee not found', 404)
    return employee
  }

  async deleteEmployee(id: string): Promise<void> {
    const result = await Employee.findByIdAndDelete(id)
    if (!result) throw new AppError('Employee not found', 404)
  }
}

export const employeeService = new EmployeeService()

