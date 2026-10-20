import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { autoIncrementPlugin } from '../plugins/autoIncrement'
import type { UserRole } from '../types'

export interface IEmployee extends Omit<Document, '_id'> {
  _id: string
  name: string
  email: string
  password: string
  role: UserRole
  isVerified: boolean
  organizationId: string
  avatarUrl?: string
  employeeId: string
  employeeProfile?: {
    personal?: {
      firstName?: string
      lastName?: string
      gender?: 'male' | 'female' | 'other'
      dateOfBirth?: Date
      bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
      phoneNumber?: string
      address?: string
    }
    job?: {
      jobTitle?: string
      department?: string
      employmentType?: string
      workLocation?: string
      joiningDate?: Date
      workEmail?: string
    }
    pay?: {
      salaryAmount?: number
      bankName?: string
      accountHolderName?: string
      accountNumber?: string
      ifscOrRoutingNumber?: string
    }
    emergency?: {
      name?: string
      relation?: string
      phoneNumber?: string
    }
    reporting?: {
      reportsToUserId?: string
    }
    roles?: string[]
    documents?: {
      idProof?: { name?: string; url?: string; mimeType?: string; sizeBytes?: number }
      resume?: { name?: string; url?: string; mimeType?: string; sizeBytes?: number }
      appointmentLetterOrContract?: { name?: string; url?: string; mimeType?: string; sizeBytes?: number }
      certificates?: Array<{ name?: string; url?: string; mimeType?: string; sizeBytes?: number }>
    }
  }
  refreshToken?: string
  comparePassword(candidate: string): Promise<boolean>
  toPublic(): Omit<IEmployee, 'password' | 'refreshToken'>
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['employee', 'manager', 'hr_admin', 'org_admin', 'Org_superadmin', 'admin'], default: 'employee' },
    isVerified: { type: Boolean, default: false },
    organizationId: { type: String, ref: 'Organization', required: true, index: true },
    avatarUrl: { type: String, default: null },
    employeeId: { type: String, required: true, index: true },
    employeeProfile: {
      personal: {
        firstName: { type: String, trim: true, maxlength: 100 },
        lastName: { type: String, trim: true, maxlength: 100 },
        gender: { type: String, enum: ['male', 'female', 'other'] },
        dateOfBirth: { type: Date },
        bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        phoneNumber: { type: String, trim: true, maxlength: 30 },
        address: { type: String, trim: true, maxlength: 500 },
      },
      job: {
        jobTitle: { type: String, trim: true, maxlength: 150 },
        department: { type: String, trim: true, maxlength: 150 },
        employmentType: { type: String, trim: true, maxlength: 100 },
        workLocation: { type: String, trim: true, maxlength: 150 },
        joiningDate: { type: Date },
        workEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
      },
      pay: {
        salaryAmount: { type: Number, min: 0 },
        bankName: { type: String, trim: true, maxlength: 150 },
        accountHolderName: { type: String, trim: true, maxlength: 150 },
        accountNumber: { type: String, trim: true, maxlength: 50 },
        ifscOrRoutingNumber: { type: String, trim: true, maxlength: 50 },
      },
      emergency: {
        name: { type: String, trim: true, maxlength: 150 },
        relation: { type: String, trim: true, maxlength: 100 },
        phoneNumber: { type: String, trim: true, maxlength: 30 },
      },
      reporting: {
        reportsToUserId: { type: String, trim: true },
      },
      roles: [{ type: String, trim: true, maxlength: 100 }],
      documents: {
        idProof: {
          name: { type: String, trim: true, maxlength: 255 },
          url: { type: String, trim: true, maxlength: 2048 },
          mimeType: { type: String, trim: true, maxlength: 100 },
          sizeBytes: { type: Number, min: 0 },
        },
        resume: {
          name: { type: String, trim: true, maxlength: 255 },
          url: { type: String, trim: true, maxlength: 2048 },
          mimeType: { type: String, trim: true, maxlength: 100 },
          sizeBytes: { type: Number, min: 0 },
        },
        appointmentLetterOrContract: {
          name: { type: String, trim: true, maxlength: 255 },
          url: { type: String, trim: true, maxlength: 2048 },
          mimeType: { type: String, trim: true, maxlength: 100 },
          sizeBytes: { type: Number, min: 0 },
        },
        certificates: [
          {
            name: { type: String, trim: true, maxlength: 255 },
            url: { type: String, trim: true, maxlength: 2048 },
            mimeType: { type: String, trim: true, maxlength: 100 },
            sizeBytes: { type: Number, min: 0 },
          },
        ],
      },
    },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

EmployeeSchema.pre<IEmployee>('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

EmployeeSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

EmployeeSchema.methods.toPublic = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  return obj
}

// Indexes
EmployeeSchema.index({ organizationId: 1, email: 1 }, { unique: true })
EmployeeSchema.index({ name: 1 })
EmployeeSchema.index({ employeeId: 1 })

// Apply auto-increment plugin with 'EMP' prefix
EmployeeSchema.plugin(autoIncrementPlugin, { prefix: 'EMP' })

// Use a safer model export that handles hot-reloading correctly
if (process.env.NODE_ENV === 'development' && mongoose.models.Employee) {
  delete mongoose.models.Employee;
}

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema)
