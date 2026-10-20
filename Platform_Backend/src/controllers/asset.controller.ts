import { Request, Response } from 'express'
import { sendSuccess } from '../utils/apiResponse'
import { AppError } from '../middleware/errorHandler'
import { assetService } from '../services/asset.service'

function resolveOrganizationId(req: Request): string {
  const fromToken = req.user?.organizationId
  const fromPayload = req.body.organizationId || req.query.organizationId

  if (fromToken) return fromToken
  if (req.user?.role === 'admin' && typeof fromPayload === 'string' && fromPayload.trim()) {
    return fromPayload
  }
  throw new AppError('Organization ID required', 400)
}

export const assetController = {
  async create(req: Request, res: Response): Promise<void> {
    const organizationId = resolveOrganizationId(req)
    const asset = await assetService.createAsset({
      organizationId,
      assetName: req.body.assetName,
      assetId: req.body.assetId,
      category: req.body.category,
      brand: req.body.brand,
      model: req.body.model,
      condition: req.body.condition,
      serialNumber: req.body.serialNumber,
      department: req.body.department,
      assignedDate: req.body.assignedDate,
      location: req.body.location,
      purchaseDate: req.body.purchaseDate,
      purchasePrice: req.body.purchasePrice,
      vendor: req.body.vendor,
      warrantyExpiry: req.body.warrantyExpiry,
      status: req.body.status,
      assignedToEmployeeId: req.body.assignedToEmployeeId,
      assignedToName: req.body.assignedToName,
      notes: req.body.notes,
      actorId: req.user?.userId,
    })

    sendSuccess(res, 201, 'Asset created successfully', { asset })
  },

  async list(req: Request, res: Response): Promise<void> {
    const organizationIdFromToken = req.user?.organizationId
    const organizationIdFromQuery =
      typeof req.query.organizationId === 'string' && req.query.organizationId.trim()
        ? req.query.organizationId.trim()
        : undefined

    const organizationId =
      organizationIdFromToken ?? (req.user?.role === 'admin' ? organizationIdFromQuery : undefined)

    if (!organizationId && req.user?.role !== 'admin') {
      throw new AppError('Organization ID required', 400)
    }

    const listQuery = {
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      status: req.query.status as 'Assigned' | 'Available' | 'Under Repair' | undefined,
      assignedToEmployeeId: req.query.assignedToEmployeeId as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }

    const result = await assetService.listAssets(
      organizationId ? { ...listQuery, organizationId } : listQuery,
    )

    sendSuccess(res, 200, 'Assets retrieved', { assets: result.assets }, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const organizationId = resolveOrganizationId(req)
    const asset = await assetService.updateAsset({
      id: req.params.id,
      organizationId,
      assetName: req.body.assetName,
      assetId: req.body.assetId,
      category: req.body.category,
      brand: req.body.brand,
      model: req.body.model,
      condition: req.body.condition,
      serialNumber: req.body.serialNumber,
      department: req.body.department,
      assignedDate: req.body.assignedDate,
      location: req.body.location,
      purchaseDate: req.body.purchaseDate,
      purchasePrice: req.body.purchasePrice,
      vendor: req.body.vendor,
      warrantyExpiry: req.body.warrantyExpiry,
      status: req.body.status,
      assignedToEmployeeId: req.body.assignedToEmployeeId,
      assignedToName: req.body.assignedToName,
      notes: req.body.notes,
      actorId: req.user?.userId,
    })

    sendSuccess(res, 200, 'Asset updated successfully', { asset })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const organizationId = resolveOrganizationId(req)
    await assetService.deleteAsset(req.params.id, organizationId)
    sendSuccess(res, 200, 'Asset deleted successfully')
  },
}
