import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { autoIncrementPlugin } from '../plugins/autoIncrement'
import type { UserRole } from '../types'

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           example: 664a1f3e2b4c5d6e7f8a9b0c
 *         name:
 *           type: string
 *           example: Jane Doe
 *         email:
 *           type: string
 *           format: email
 *           example: jane@trimsel.com
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 *         isVerified:
 *           type: boolean
 *           default: false
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *           example: https://cdn.trimsel.com/avatars/jane.png
 *         employeeId:
 *           type: string
 *           nullable: true
 *           example: EMP-2026-123456
 *         employeeProfile:
 *           type: object
 *           nullable: true
 *           properties:
 *             personal:
 *               type: object
 *               properties:
 *                 firstName: { type: string, example: John }
 *                 lastName: { type: string, example: Doe }
 *                 gender: { type: string, enum: [male, female, other], example: male }
 *                 dateOfBirth: { type: string, format: date, example: 1998-01-15 }
 *                 bloodType: { type: string, enum: [A+, A-, B+, B-, AB+, AB-, O+, O-], example: O+ }
 *                 phoneNumber: { type: string, example: "+1 (555) 123-4567" }
 *                 address: { type: string, example: "123 Main st, Anytown, USA" }
 *             job:
 *               type: object
 *               properties:
 *                 jobTitle: { type: string, example: "UI/UX Designer" }
 *                 department: { type: string, example: Design }
 *                 employmentType: { type: string, example: "Full-time" }
 *                 workLocation: { type: string, example: Chennai }
 *                 joiningDate: { type: string, format: date, example: 2026-03-01 }
 *                 workEmail: { type: string, format: email, example: john.doe@company.com }
 *             pay:
 *               type: object
 *               properties:
 *                 salaryAmount: { type: number, example: 8000 }
 *                 bankName: { type: string, example: "Bank of India" }
 *                 accountHolderName: { type: string, example: "John Doe" }
 *                 accountNumber: { type: string, example: "1234567890" }
 *                 ifscOrRoutingNumber: { type: string, example: "SBIN0001234" }
 *             emergency:
 *               type: object
 *               properties:
 *                 name: { type: string, example: Jane }
 *                 relation: { type: string, example: Spouse }
 *                 phoneNumber: { type: string, example: "+1 (555) 765-4321" }
 *             reporting:
 *               type: object
 *               properties:
 *                 reportsToUserId: { type: string, example: 664a1f3e2b4c5d6e7f8a9b0c }
 *             roles:
 *               type: array
 *               items: { type: string }
 *               example: ["UI/UX Designer"]
 *             documents:
 *               type: object
 *               properties:
 *                 idProof:
 *                   type: object
 *                   properties:
 *                     name: { type: string, example: "aadhaar_scan.pdf" }
 *                     url: { type: string, example: "https://cdn.trimsel.com/docs/aadhaar_scan.pdf" }
 *                     mimeType: { type: string, example: "application/pdf" }
 *                     sizeBytes: { type: integer, example: 3355443 }
 *                 resume:
 *                   type: object
 *                   properties:
 *                     name: { type: string, example: "resume.pdf" }
 *                     url: { type: string, example: "https://cdn.trimsel.com/docs/resume.pdf" }
 *                     mimeType: { type: string, example: "application/pdf" }
 *                     sizeBytes: { type: integer, example: 1048576 }
 *                 appointmentLetterOrContract:
 *                   type: object
 *                   properties:
 *                     name: { type: string, example: "appointment_letter.pdf" }
 *                     url: { type: string, example: "https://cdn.trimsel.com/docs/appointment_letter.pdf" }
 *                     mimeType: { type: string, example: "application/pdf" }
 *                     sizeBytes: { type: integer, example: 524288 }
 *                 certificates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string, example: "certificate.pdf" }
 *                       url: { type: string, example: "https://cdn.trimsel.com/docs/certificate.pdf" }
 *                       mimeType: { type: string, example: "application/pdf" }
 *                       sizeBytes: { type: integer, example: 2097152 }
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserPublic:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         isVerified:
 *           type: boolean
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *         employeeId:
 *           type: string
 *           nullable: true
 *         employeeProfile:
 *           type: object
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export interface IUser extends Omit<Document, '_id'> {
  _id: string
  name: string
  email: string
  password: string
  role: UserRole
  isVerified: boolean
  avatarUrl?: string
  employeeId?: string
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
  toPublic(): Omit<IUser, 'password' | 'refreshToken'>
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['user', 'employee', 'manager', 'hr_admin', 'org_admin', 'Org_superadmin', 'admin', 'platform_admin', 'super_admin', 'support'],
      default: 'admin',
    },
    isVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: null },
    employeeId: { type: String, index: true, sparse: true },
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

// Hash password before save
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Apply auto-increment plugin to generate string _id with 'USR' prefix
UserSchema.plugin(autoIncrementPlugin, { prefix: 'USR' })

// Instance method — compare passwords
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

// Instance method — strip sensitive fields
UserSchema.methods.toPublic = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  return obj
}

// Use a safer model export that handles hot-reloading correctly
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
  delete mongoose.models.User;
}

export const User = mongoose.model<IUser>('User', UserSchema)
