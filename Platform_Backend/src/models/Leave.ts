import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'

export interface ILeave extends Omit<Document, '_id'> {
  _id: string
  employeeId: string
  organizationId: string | null
  employeeName: string
  leaveType: string
  fromDate: Date
  toDate: Date
  reason: string
  status: LeaveStatus
  supportingDocument?: string | null
  reviewedBy?: string | null
  reviewedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const LeaveSchema = new Schema<ILeave>(
  {
    _id: { type: String },
    employeeId: { type: String, ref: 'Employee', required: true, index: true },
    organizationId: { type: String, ref: 'Organization', required: false, index: true, default: null },
    employeeName: { type: String, required: true, trim: true, maxlength: 150 },
    leaveType: { type: String, required: true, trim: true, maxlength: 100 },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    supportingDocument: { type: String, default: null },
    reviewedBy: { type: String, ref: 'Employee', default: null },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

LeaveSchema.index({ organizationId: 1, status: 1 })

// Apply auto-increment plugin to generate string _id
LeaveSchema.plugin(autoIncrementPlugin)

export const Leave = mongoose.model<ILeave>('Leave', LeaveSchema)
