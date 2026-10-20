import Joi from 'joi'

const employeeDocumentSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  url: Joi.string().uri().required(),
  mimeType: Joi.string().max(100).optional(),
  sizeBytes: Joi.number().integer().min(0).optional(),
})

export const employeeRegisterSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  dateOfBirth: Joi.date().iso().optional(),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  phoneNumber: Joi.string().max(30).optional(),
  address: Joi.string().max(500).optional(),

  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .optional()
    .messages({
      'string.pattern.name': 'Password must contain at least one {#name} character',
    }),
  organizationId: Joi.string().optional(),

  avatarUrl: Joi.string().uri().allow(null).optional(),
  role: Joi.string().valid('employee', 'manager', 'hr_admin', 'org_admin', 'admin').default('employee'),
  roles: Joi.array().items(Joi.string().min(1).max(100)).default([]),

  jobTitle: Joi.string().max(150).optional(),
  department: Joi.string().max(150).optional(),
  employmentType: Joi.string().max(100).optional(),
  workLocation: Joi.string().max(150).optional(),
  joiningDate: Joi.date().iso().optional(),
  workEmail: Joi.string().email().optional(),

  salaryAmount: Joi.number().min(0).optional(),
  bankName: Joi.string().max(150).optional(),
  accountHolderName: Joi.string().max(150).optional(),
  accountNumber: Joi.string().max(50).optional(),
  ifscOrRoutingNumber: Joi.string().max(50).optional(),

  emergencyName: Joi.string().max(150).optional(),
  emergencyRelation: Joi.string().max(100).optional(),
  emergencyPhoneNumber: Joi.string().max(30).optional(),

  reportsToUserId: Joi.string().optional(),

  documents: Joi.object({
    idProof: employeeDocumentSchema.optional(),
    resume: employeeDocumentSchema.optional(),
    appointmentLetterOrContract: employeeDocumentSchema.optional(),
    certificates: Joi.array().items(employeeDocumentSchema).default([]),
  }).optional(),
})

