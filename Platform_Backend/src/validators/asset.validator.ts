import Joi from 'joi'

const assetStatusSchema = Joi.string().valid('Assigned', 'Available', 'Under Repair')

export const createAssetSchema = Joi.object({
  organizationId: Joi.string().optional(),
  assetName: Joi.string().max(150).required(),
  assetId: Joi.string().max(100).optional().allow('', null),
  category: Joi.string().max(100).required(),
  brand: Joi.string().max(100).optional().allow('', null),
  model: Joi.string().max(150).optional().allow('', null),
  condition: Joi.string().max(50).optional().allow('', null),
  serialNumber: Joi.string().max(150).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  assignedDate: Joi.date().iso().optional().allow(null),
  location: Joi.string().max(150).optional().allow('', null),
  purchaseDate: Joi.date().iso().optional().allow(null),
  purchasePrice: Joi.string().max(100).optional().allow('', null),
  vendor: Joi.string().max(150).optional().allow('', null),
  warrantyExpiry: Joi.date().iso().optional().allow(null),
  status: assetStatusSchema.optional(),
  assignedToEmployeeId: Joi.string().optional().allow('', null),
  assignedToName: Joi.string().max(150).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
})

export const listAssetSchema = Joi.object({
  organizationId: Joi.string().optional(),
  search: Joi.string().max(150).optional(),
  category: Joi.string().max(100).optional(),
  status: assetStatusSchema.optional(),
  assignedToEmployeeId: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
})

export const updateAssetSchema = Joi.object({
  assetName: Joi.string().max(150).optional(),
  assetId: Joi.string().max(100).optional(),
  category: Joi.string().max(100).optional(),
  brand: Joi.string().max(100).optional().allow('', null),
  model: Joi.string().max(150).optional().allow('', null),
  condition: Joi.string().max(50).optional().allow('', null),
  serialNumber: Joi.string().max(150).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  assignedDate: Joi.date().iso().optional().allow(null),
  location: Joi.string().max(150).optional().allow('', null),
  purchaseDate: Joi.date().iso().optional().allow(null),
  purchasePrice: Joi.string().max(100).optional().allow('', null),
  vendor: Joi.string().max(150).optional().allow('', null),
  warrantyExpiry: Joi.date().iso().optional().allow(null),
  status: assetStatusSchema.optional(),
  assignedToEmployeeId: Joi.string().optional().allow('', null),
  assignedToName: Joi.string().max(150).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
}).min(1)
