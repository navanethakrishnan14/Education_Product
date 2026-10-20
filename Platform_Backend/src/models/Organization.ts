import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminSetup:
 *       type: object
 *       properties:
 *         profilePhotoUrl:
 *           type: string
 *           nullable: true
 *           example: https://cdn.trimsel.com/photos/admin.png
 *         adminName:
 *           type: string
 *           example: John Doe
 *         adminEmail:
 *           type: string
 *           format: email
 *           example: admin@acme.com
 *         adminPassword:
 *           type: string
 *           format: password
 *           example: "********"
 *         role:
 *           type: string
 *           example: Key Admin / Super Admin
 *         enabled:
 *           type: boolean
 *           default: true
 *
 *     Organization:
 *       type: object
 *       required: [name, workspaceUrl]
 *       properties:
 *         _id:
 *           type: string
 *           example: 664a1f3e2b4c5d6e7f8a9b0c
 *         name:
 *           type: string
 *           example: Acme Corporation
 *         workspaceUrl:
 *           type: string
 *           description: Unique workspace slug (e.g. acme-corp → acme-corp.trimsel.com)
 *           example: acme-corp
 *         logoUrl:
 *           type: string
 *           nullable: true
 *           description: URL of the organization logo (SVG, PNG, or JPG, max 800x400px)
 *           example: https://cdn.trimsel.com/logos/acme-corp.png
 *         industryType:
 *           type: string
 *           enum: [Technology, Healthcare, Finance, Education, Retail, Other]
 *           example: Technology
 *         planId:
 *           type: string
 *           nullable: true
 *           description: Reference to the selected plan
 *           example: 664a1f3e2b4c5d6e7f8a9b0c
 *         adminSetup:
 *           $ref: '#/components/schemas/AdminSetup'
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ── Sub-document interfaces ──────────────────────────────────────────

export interface IAdminSetup {
  profilePhotoUrl?: string | null
  adminName?: string  // optional — falls back to adminEmail in service when not provided
  adminEmail: string
  adminPhone?: string
  adminPassword: string
  timezone?: string
  currency?: string
  region?: string
}

export interface ILocationAttendance {
  attendanceDays: string[]
  shiftStartTime: string
  shiftEndTime: string
}

export interface IPlatformSettings {
  annualLeave: number
  sickLeave: number
  casualLeave: number
  employeeIdPrefix: string
}

/** Business address embedded sub-document */
export interface IAddress {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
}

/** Business information embedded sub-document */
export interface IBusinessInfo {
  gstin?: string
  website?: string
}

// ── Root interface ───────────────────────────────────────────────────

export interface IOrganization extends Omit<Document, '_id'> {
  _id: string
  name: string
  workspaceUrl: string
  logoUrl?: string | null
  industryType: string
  companySize?: string
  billingEmail?: string
  phoneNumber?: string
  currency?: string
  address?: IAddress
  business?: IBusinessInfo
  planId?: string
  discountPercentage?: number
  modules?: string[]
  adminSetup?: IAdminSetup
  locationAttendance?: ILocationAttendance
  platformSettings?: IPlatformSettings
  isActive: boolean
}

// ── Sub-schemas ──────────────────────────────────────────────────────

const AdminSetupSchema = new Schema<IAdminSetup>(
  {
    profilePhotoUrl: { type: String, default: null },
    adminName: { type: String, required: false, trim: true, maxlength: 100 }, // optional — falls back to adminEmail
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    adminPhone: { type: String, default: '', trim: true, maxlength: 30 },
    adminPassword: { type: String, required: false, select: false },
    timezone: { type: String, default: '', trim: true },
    currency: { type: String, default: '', trim: true },
    region: { type: String, default: '', trim: true },
  },
  { _id: false }
)

const LocationAttendanceSchema = new Schema<ILocationAttendance>(
  {
    attendanceDays: { type: [String], default: [] },
    shiftStartTime: { type: String, default: '' },
    shiftEndTime: { type: String, default: '' },
  },
  { _id: false }
)

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    annualLeave: { type: Number, default: 18, min: 0 },
    sickLeave: { type: Number, default: 6, min: 0 },
    casualLeave: { type: Number, default: 6, min: 0 },
    employeeIdPrefix: { type: String, default: 'EMP', trim: true, uppercase: true, maxlength: 6, match: [/^[A-Z0-9]{2,6}$/, 'Prefix must be 2-6 alphanumeric characters'] },
  },
  { _id: false }
)

const AddressSchema = new Schema<IAddress>(
  {
    addressLine1: { type: String, trim: true, maxlength: 200 },
    addressLine2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false }
)

const BusinessInfoSchema = new Schema<IBusinessInfo>(
  {
    gstin: { type: String, trim: true, maxlength: 20, uppercase: true },
    website: { type: String, trim: true, maxlength: 2048 },
  },
  { _id: false }
)

// ── Main schema ──────────────────────────────────────────────────────

const OrganizationSchema = new Schema<IOrganization>(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    workspaceUrl: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Workspace URL must be a valid slug (lowercase letters, numbers, hyphens)'],
    },
    logoUrl: { type: String, default: null },
    // Existing field — extended enum to accept any string for forward-compatibility
    industryType: {
      type: String,
      required: false,
      default: 'Other',
    },
    // NEW: company size (e.g. "1-50", "51-200")
    companySize: { type: String, trim: true, maxlength: 50, default: null },
    // NEW: billing contact email
    billingEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: null },
    // NEW: organization phone number
    phoneNumber: { type: String, trim: true, maxlength: 30, default: null },
    currency: { type: String, trim: true, uppercase: true, default: null },
    // NEW: business address
    address: { type: AddressSchema, default: undefined },
    // NEW: business information (GSTIN, website)
    business: { type: BusinessInfoSchema, default: undefined },
    adminSetup: { type: AdminSetupSchema, default: undefined },
    locationAttendance: { type: LocationAttendanceSchema, default: undefined },
    planId: { type: String, ref: 'BillingPlan', default: null },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    // NEW: enabled module keys (e.g. ['attendance', 'leave', 'payroll'])
    modules: { type: [String], default: [] },
    platformSettings: { type: PlatformSettingsSchema, default: undefined },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Apply auto-increment plugin with 'ORG' prefix
OrganizationSchema.plugin(autoIncrementPlugin, { prefix: 'ORG' })

// Indexes
OrganizationSchema.index({ name: 1 })
OrganizationSchema.index({ workspaceUrl: 1 }, { unique: true })
OrganizationSchema.index({ isActive: 1 })
OrganizationSchema.index({ planId: 1 })

// Use a safer model export that handles hot-reloading correctly
if (process.env.NODE_ENV === 'development' && mongoose.models.Organization) {
  delete mongoose.models.Organization;
}

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema)
