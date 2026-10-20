import mongoose, { Document, Schema } from 'mongoose'
import { autoIncrementPlugin } from '../plugins/autoIncrement'

export interface IAttendance extends Omit<Document, '_id'> {
  _id: string
  employeeId: string
  organizationId?: string
  status: 'present' | 'absent'
  checkInTime: Date
  checkInLocation: {
    lat: number
    lng: number
  }
  checkInPremises: string
  checkOutTime?: Date
  checkOutLocation?: {
    lat: number
    lng: number
  }
  checkOutPremises?: string
  date: Date
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    _id: { type: String },
    employeeId: { type: String, ref: 'Employee', required: true },
    organizationId: { type: String, ref: 'Organization', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'absent', index: true },
    checkInTime: { type: Date, required: true },
    checkInLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    checkInPremises: { type: String, required: true },
    checkOutTime: { type: Date },
    checkOutLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    checkOutPremises: { type: String },
    date: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
AttendanceSchema.index({ employeeId: 1, date: 1 })
AttendanceSchema.index({ organizationId: 1, date: 1 })

// Apply auto-increment plugin
AttendanceSchema.plugin(autoIncrementPlugin)

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema)
