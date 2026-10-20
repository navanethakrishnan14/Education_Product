import mongoose, { Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export type AssetStatus = 'Assigned' | 'Available' | 'Under Repair'

export interface IAsset {
  _id: string
  organizationId: string
  assetName: string
  assetId: string
  category: string
  brand?: string | null
  model?: string | null
  condition?: string | null
  serialNumber?: string | null
  department?: string | null
  assignedDate?: Date | null
  location?: string | null
  purchaseDate?: Date | null
  purchasePrice?: string | null
  vendor?: string | null
  warrantyExpiry?: Date | null
  status: AssetStatus
  assignedToEmployeeId?: string | null
  assignedToName?: string | null
  notes?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

const AssetSchema = new Schema<IAsset>(
  {
    _id: { type: String },
    organizationId: { type: String, ref: 'Organization', required: true, index: true },
    assetName: { type: String, required: true, trim: true, maxlength: 150 },
    assetId: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    brand: { type: String, trim: true, maxlength: 100, default: null },
    model: { type: String, trim: true, maxlength: 150, default: null },
    condition: { type: String, trim: true, maxlength: 50, default: null },
    serialNumber: { type: String, trim: true, maxlength: 150, default: null },
    department: { type: String, trim: true, maxlength: 100, default: null },
    assignedDate: { type: Date, default: null },
    location: { type: String, trim: true, maxlength: 150, default: null },
    purchaseDate: { type: Date, default: null },
    purchasePrice: { type: String, trim: true, maxlength: 100, default: null },
    vendor: { type: String, trim: true, maxlength: 150, default: null },
    warrantyExpiry: { type: Date, default: null },
    status: { type: String, enum: ['Assigned', 'Available', 'Under Repair'], default: 'Available' },
    assignedToEmployeeId: { type: String, ref: 'Employee', default: null, index: true },
    assignedToName: { type: String, trim: true, maxlength: 150, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: null },
    createdBy: { type: String, ref: 'Employee', default: null },
    updatedBy: { type: String, ref: 'Employee', default: null },
  },
  {
    timestamps: true,
  }
)

AssetSchema.index({ organizationId: 1, assetId: 1 }, { unique: true })
AssetSchema.index({ organizationId: 1, status: 1 })
AssetSchema.index({ organizationId: 1, category: 1 })

// Apply auto-increment plugin
AssetSchema.plugin(autoIncrementPlugin)

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema)
