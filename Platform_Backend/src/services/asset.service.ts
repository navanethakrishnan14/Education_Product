import { AppError } from '../middleware/errorHandler'
import { Asset, type AssetStatus, type IAsset } from '../models/Asset'

interface BaseScopedQuery {
  organizationId: string
}

export interface CreateAssetInput extends BaseScopedQuery {
  assetName: string
  assetId?: string | null
  category: string
  brand?: string | null
  model?: string | null
  condition?: string | null
  serialNumber?: string | null
  department?: string | null
  assignedDate?: string | null
  location?: string | null
  purchaseDate?: string | null
  purchasePrice?: string | null
  vendor?: string | null
  warrantyExpiry?: string | null
  status?: AssetStatus
  assignedToEmployeeId?: string | null
  assignedToName?: string | null
  notes?: string | null
  actorId?: string
}

export interface ListAssetQuery {
  organizationId?: string
  search?: string
  category?: string
  status?: AssetStatus
  assignedToEmployeeId?: string
  page?: number
  limit?: number
}

export interface UpdateAssetInput {
  id: string
  organizationId: string
  assetName?: string
  assetId?: string
  category?: string
  brand?: string | null
  model?: string | null
  condition?: string | null
  serialNumber?: string | null
  department?: string | null
  assignedDate?: string | null
  location?: string | null
  purchaseDate?: string | null
  purchasePrice?: string | null
  vendor?: string | null
  warrantyExpiry?: string | null
  status?: AssetStatus
  assignedToEmployeeId?: string | null
  assignedToName?: string | null
  notes?: string | null
  actorId?: string
}

export class AssetService {
  private async generateAssetId(organizationId: string): Promise<string> {
    const prefix = 'AST'
    const idRegex = `^${prefix}-(\\d+)$`
    const result = await Asset.aggregate([
      {
        $match: {
          organizationId: organizationId,
          assetId: { $regex: idRegex },
        },
      },
      {
        $project: {
          numericSuffix: {
            $toInt: {
              $arrayElemAt: [{ $split: ['$assetId', `${prefix}-`] }, 1],
            },
          },
        },
      },
      { $sort: { numericSuffix: -1 } },
      { $limit: 1 },
    ])

    const nextNumber =
      result.length > 0 && typeof result[0].numericSuffix === 'number'
        ? result[0].numericSuffix + 1
        : 1
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`
  }

  private normalizeNullableText(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined
    if (value === null) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private normalizePurchaseDate(value?: string | null): Date | null | undefined {
    if (value === undefined) return undefined
    if (!value) return null
    return new Date(value)
  }

  private toStringOrNull(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined
    if (!value) return null
    const trimmed = value.trim()
    if (trimmed.length === 0) return null
    return trimmed
  }

  async createAsset(input: CreateAssetInput): Promise<IAsset> {
    const maxAttempts = 5
    let attempts = 0
    let resolvedAssetId = this.normalizeNullableText(input.assetId) ?? undefined

    while (attempts < maxAttempts) {
      try {
        if (!resolvedAssetId) {
          resolvedAssetId = await this.generateAssetId(input.organizationId)
        }

        const asset = await Asset.create({
          organizationId: input.organizationId,
          assetName: input.assetName,
          assetId: resolvedAssetId,
          category: input.category,
          brand: this.normalizeNullableText(input.brand) ?? null,
          model: this.normalizeNullableText(input.model) ?? null,
          condition: this.normalizeNullableText(input.condition) ?? null,
          serialNumber: this.normalizeNullableText(input.serialNumber) ?? null,
          department: this.normalizeNullableText(input.department) ?? null,
          assignedDate: this.normalizePurchaseDate(input.assignedDate) ?? null,
          location: this.normalizeNullableText(input.location) ?? null,
          purchaseDate: this.normalizePurchaseDate(input.purchaseDate) ?? null,
          purchasePrice: this.normalizeNullableText(input.purchasePrice) ?? null,
          vendor: this.normalizeNullableText(input.vendor) ?? null,
          warrantyExpiry: this.normalizePurchaseDate(input.warrantyExpiry) ?? null,
          status: input.status ?? 'Available',
          assignedToEmployeeId: this.toStringOrNull(input.assignedToEmployeeId) ?? null,
          assignedToName: this.normalizeNullableText(input.assignedToName) ?? null,
          notes: this.normalizeNullableText(input.notes) ?? null,
          createdBy: input.actorId ?? null,
          updatedBy: input.actorId ?? null,
        })
        return asset
      } catch (error: any) {
        if (error?.code === 11000) {
          const duplicateAssetId = (error?.keyValue?.assetId as string | undefined) ?? resolvedAssetId
          if (input.assetId && duplicateAssetId === input.assetId) {
            throw new AppError('Asset ID already exists', 409)
          }
          resolvedAssetId = undefined
          attempts += 1
          continue
        }
        throw error
      }
    }

    throw new AppError('Unable to generate unique asset ID. Please try again.', 500)
  }

  async listAssets(
    query: ListAssetQuery,
  ): Promise<{ assets: IAsset[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 50

    const filter: Record<string, unknown> = {}
    if (query.organizationId) {
      filter.organizationId = query.organizationId
    }

    if (query.search) {
      filter.$or = [
        { assetName: new RegExp(query.search, 'i') },
        { assetId: new RegExp(query.search, 'i') },
        { serialNumber: new RegExp(query.search, 'i') },
        { assignedToName: new RegExp(query.search, 'i') },
      ]
    }
    if (query.category) {
      filter.category = query.category
    }
    if (query.status) {
      filter.status = query.status
    }
    if (query.assignedToEmployeeId) {
      filter.assignedToEmployeeId = query.assignedToEmployeeId
    }

    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Asset.countDocuments(filter),
    ])

    return {
      assets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    }
  }

  async updateAsset(input: UpdateAssetInput): Promise<IAsset> {
    if (typeof input.id !== 'string' || input.id.trim().length === 0) {
      throw new AppError('Invalid asset ID', 400)
    }

    const asset = await Asset.findOne({
      _id: input.id,
      organizationId: input.organizationId,
    })
    if (!asset) {
      throw new AppError('Asset not found', 404)
    }

    if (input.assetName !== undefined) asset.assetName = input.assetName
    if (input.assetId !== undefined) asset.assetId = input.assetId
    if (input.category !== undefined) asset.category = input.category
    if (input.brand !== undefined) asset.brand = this.normalizeNullableText(input.brand) ?? null
    if (input.model !== undefined) {
      asset.set('model', this.normalizeNullableText(input.model) ?? null)
    }
    if (input.condition !== undefined) asset.condition = this.normalizeNullableText(input.condition) ?? null
    if (input.serialNumber !== undefined) asset.serialNumber = this.normalizeNullableText(input.serialNumber) ?? null
    if (input.department !== undefined) asset.department = this.normalizeNullableText(input.department) ?? null
    if (input.assignedDate !== undefined) asset.assignedDate = this.normalizePurchaseDate(input.assignedDate) ?? null
    if (input.location !== undefined) asset.location = this.normalizeNullableText(input.location) ?? null
    if (input.purchaseDate !== undefined) asset.purchaseDate = this.normalizePurchaseDate(input.purchaseDate) ?? null
    if (input.purchasePrice !== undefined) asset.purchasePrice = this.normalizeNullableText(input.purchasePrice) ?? null
    if (input.vendor !== undefined) asset.vendor = this.normalizeNullableText(input.vendor) ?? null
    if (input.warrantyExpiry !== undefined) {
      asset.warrantyExpiry = this.normalizePurchaseDate(input.warrantyExpiry) ?? null
    }
    if (input.status !== undefined) asset.status = input.status
    if (input.assignedToEmployeeId !== undefined) {
      asset.assignedToEmployeeId = this.toStringOrNull(input.assignedToEmployeeId) ?? null
    }
    if (input.assignedToName !== undefined) asset.assignedToName = this.normalizeNullableText(input.assignedToName) ?? null
    if (input.notes !== undefined) asset.notes = this.normalizeNullableText(input.notes) ?? null
    if (input.actorId) asset.updatedBy = input.actorId

    await asset.save()
    return asset
  }

  async deleteAsset(id: string, organizationId: string): Promise<void> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new AppError('Invalid asset ID', 400)
    }
    const result = await Asset.findOneAndDelete({ _id: id, organizationId })
    if (!result) {
      throw new AppError('Asset not found', 404)
    }
  }
}

export const assetService = new AssetService()
