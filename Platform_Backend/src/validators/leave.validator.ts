import Joi from 'joi'

export const createLeaveSchema = Joi.object({
  employeeName: Joi.string().max(150).required(),
  leaveType: Joi.string().max(100).required(),
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().required(),
  reason: Joi.string().max(1000).required(),
  supportingDocument: Joi.string().max(2048).optional().allow(null, ''),
})

export const updateLeaveStatusSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Rejected').required(),
})
