import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

/**
 * @swagger
 * components:
 *   schemas:
 *     OrgUser:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [super_admin, platform_admin, Org_superadmin, support]
 *         isActive:
 *           type: boolean
 *         lastLogin:
 *           type: string
 *           format: date-time
 */

export interface IOrgUser extends Omit<Document, '_id'> {
  _id: string
  name: string
  email: string
  password: string
  role: 'super_admin' | 'platform_admin' | 'Org_superadmin' | 'support'
  isActive: boolean
  organizationId?: string
  lastLogin?: Date
  refreshToken?: string
  comparePassword(candidate: string): Promise<boolean>
}

const OrgUserSchema = new Schema<IOrgUser>(
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
      enum: ['super_admin', 'platform_admin', 'Org_superadmin', 'support'],
      default: 'platform_admin'
    },
    isActive: { type: Boolean, default: true },
    organizationId: { type: String, ref: 'Organization', default: null },
    lastLogin: { type: Date },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    collection: 'org_users' // Explicitly set collection name to org_users
  }
)

// Hash password before saving
OrgUserSchema.pre<IOrgUser>('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
OrgUserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

// Instance method — strip sensitive fields
OrgUserSchema.methods.toPublic = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  return obj
}

// Apply auto-increment plugin with 'OUS' (Org User) prefix to avoid collision with Organization (ORG)
OrgUserSchema.plugin(autoIncrementPlugin, { prefix: 'OUS' })

// Use a safer model export that handles hot-reloading correctly
if (process.env.NODE_ENV === 'development' && mongoose.models.OrgUser) {
  delete mongoose.models.OrgUser;
}

export const OrgUser = mongoose.model<IOrgUser>('OrgUser', OrgUserSchema)
