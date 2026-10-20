import { AppError } from '../middleware/errorHandler'
import { FeatureFlag, IFeatureFlag } from '../models/FeatureFlag'

export interface CreateFeatureFlagInput {
    name: string
    key: string
    description?: string
    type?: 'RELEASE' | 'EXPERIMENT' | 'OPS'
    environment?: 'Production' | 'Staging'
    enabled?: boolean
    rolloutPercentage?: number
    allTenants?: boolean
    tenantCount?: number
    tenantOverrides?: Array<{
        name: string
        initials: string
        status: 'forced-on' | 'forced-off' | 'blocked'
        description?: string
        color?: string
    }>
    createdBy?: string
}

export interface UpdateFeatureFlagInput extends Partial<CreateFeatureFlagInput> {
    updatedBy?: string
}

function normalizeKey(value: string): string {
    return value.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()
}

function getDisplayStatus(flag: IFeatureFlag): 'on' | 'off' | 'rolling-out' | 'disabled' {
    if (!flag.enabled || flag.rolloutPercentage === 0) return 'off'
    if (flag.allTenants || flag.rolloutPercentage >= 100) return 'on'
    return 'rolling-out'
}

function formatDate(value: Date | undefined): string {
    if (!value) return 'N/A'
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelative(value: Date | undefined): string {
    if (!value) return 'N/A'
    const diffMs = Date.now() - new Date(value).getTime()
    const diffDays = Math.max(0, Math.floor(diffMs / 86400000))
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1d ago'
    if (diffDays < 30) return `${diffDays}d ago`
    const diffWeeks = Math.max(1, Math.floor(diffDays / 7))
    return `${diffWeeks}w ago`
}

export class FeatureFlagService {
    async list(environment?: 'Production' | 'Staging'): Promise<any[]> {
        const query = environment ? { environment } : {}
        const flags = await FeatureFlag.find(query).sort({ updatedAt: -1 })
        return flags.map((flag) => this.toUiShape(flag))
    }

    async getById(id: string): Promise<any> {
        const flag = await FeatureFlag.findById(id)
        if (!flag) throw new AppError('Feature flag not found', 404)
        return this.toUiShape(flag)
    }

    async create(input: CreateFeatureFlagInput): Promise<any> {
        const payload = this.validatePayload(input)
        const existing = await FeatureFlag.findOne({ key: payload.key, environment: payload.environment || 'Production' })
        if (existing) throw new AppError(`Feature flag key "${payload.key}" already exists for this environment`, 409)

        const flag = await FeatureFlag.create({
            ...payload,
            enabled: payload.enabled ?? false,
            rolloutPercentage: payload.rolloutPercentage ?? 0,
            allTenants: payload.allTenants ?? false,
            tenantCount: payload.tenantCount ?? 0,
            tenantOverrides: payload.tenantOverrides ?? [],
            createdBy: payload.createdBy ?? 'system',
            updatedBy: payload.createdBy ?? 'system',
        })

        return this.toUiShape(flag)
    }

    async update(id: string, input: UpdateFeatureFlagInput): Promise<any> {
        const flag = await FeatureFlag.findById(id)
        if (!flag) throw new AppError('Feature flag not found', 404)

        const nextPayload = this.validatePayload({
            ...flag.toObject(),
            ...input,
            key: input.key ?? flag.key,
            environment: input.environment ?? flag.environment,
        })

        if (nextPayload.key !== flag.key || nextPayload.environment !== flag.environment) {
            const duplicate = await FeatureFlag.findOne({ key: nextPayload.key, environment: nextPayload.environment || 'Production' })
            if (duplicate && duplicate._id.toString() !== id) {
                throw new AppError(`Feature flag key "${nextPayload.key}" already exists for this environment`, 409)
            }
        }

        Object.assign(flag, nextPayload)
        flag.updatedBy = input.updatedBy ?? flag.updatedBy ?? 'system'
        await flag.save()
        return this.toUiShape(flag)
    }

    async toggle(id: string, enabled?: boolean): Promise<any> {
        const flag = await FeatureFlag.findById(id)
        if (!flag) throw new AppError('Feature flag not found', 404)

        const nextEnabled = enabled ?? !flag.enabled
        flag.enabled = nextEnabled
        if (nextEnabled && flag.rolloutPercentage === 0 && !flag.allTenants) {
            flag.rolloutPercentage = 50
        }
        if (!nextEnabled) {
            flag.rolloutPercentage = 0
        }
        flag.updatedBy = 'system'
        await flag.save()
        return this.toUiShape(flag)
    }

    async delete(id: string): Promise<void> {
        const result = await FeatureFlag.findByIdAndDelete(id)
        if (!result) throw new AppError('Feature flag not found', 404)
    }

    async addTenantOverride(
        id: string,
        override: {
            name: string
            initials: string
            status: 'forced-on' | 'forced-off' | 'blocked'
            description?: string
            color?: string
        }
    ): Promise<any> {
        const flag = await FeatureFlag.findById(id)
        if (!flag) throw new AppError('Feature flag not found', 404)

        // Validate tenant override
        const trimmedName = (override.name ?? '').trim()
        const trimmedInitials = (override.initials ?? '').trim()

        if (!trimmedName) throw new AppError('Tenant name is required', 400)
        if (!trimmedInitials) throw new AppError('Tenant initials are required', 400)
        if (trimmedName.length > 120) throw new AppError('Tenant name cannot exceed 120 characters', 400)
        if (trimmedInitials.length > 4) throw new AppError('Initials cannot exceed 4 characters', 400)
        if (!['forced-on', 'forced-off', 'blocked'].includes(override.status)) {
            throw new AppError('Invalid status. Must be forced-on, forced-off, or blocked', 400)
        }

        // Check if tenant already exists
        const exists = flag.tenantOverrides?.some((o) => o.name.toLowerCase() === trimmedName.toLowerCase())
        if (exists) throw new AppError(`Tenant override for "${trimmedName}" already exists`, 409)

        // Add new override
        flag.tenantOverrides = flag.tenantOverrides || []
        flag.tenantOverrides.push({
            name: trimmedName,
            initials: trimmedInitials.toUpperCase().substring(0, 4),
            status: override.status,
            description: (override.description ?? '').trim(),
            color: (override.color ?? '#64748b').trim(),
        })

        flag.tenantCount = flag.tenantOverrides.length
        flag.updatedBy = 'system'
        await flag.save()
        return this.toUiShape(flag)
    }

    async removeTenantOverride(id: string, overrideIndex: number): Promise<any> {
        const flag = await FeatureFlag.findById(id)
        if (!flag) throw new AppError('Feature flag not found', 404)

        if (!flag.tenantOverrides || overrideIndex < 0 || overrideIndex >= flag.tenantOverrides.length) {
            throw new AppError('Tenant override not found', 404)
        }

        flag.tenantOverrides.splice(overrideIndex, 1)
        flag.tenantCount = flag.tenantOverrides.length
        flag.updatedBy = 'system'
        await flag.save()
        return this.toUiShape(flag)
    }

    validatePayload(input: Partial<CreateFeatureFlagInput>): CreateFeatureFlagInput {
        const name = (input.name ?? '').trim()
        const keyRaw = (input.key ?? '').trim()
        if (!name) throw new AppError('Feature flag name is required', 400)
        if (!keyRaw) throw new AppError('Feature flag key is required', 400)

        const key = normalizeKey(keyRaw)
        if (!key) throw new AppError('Feature flag key is invalid. Use letters, numbers, underscores, or hyphens only.', 400)

        const type = input.type ?? 'RELEASE'
        const environment = input.environment ?? 'Production'
        const enabled = input.enabled ?? false
        const rolloutPercentage = input.rolloutPercentage ?? 0
        const allTenants = input.allTenants ?? false

        if (!['RELEASE', 'EXPERIMENT', 'OPS'].includes(type)) {
            throw new AppError('Feature flag type must be RELEASE, EXPERIMENT, or OPS', 400)
        }
        if (!['Production', 'Staging'].includes(environment)) {
            throw new AppError('Environment must be Production or Staging', 400)
        }
        if (typeof enabled !== 'boolean') throw new AppError('Enabled must be a boolean', 400)
        if (!Number.isFinite(rolloutPercentage) || rolloutPercentage < 0 || rolloutPercentage > 100) {
            throw new AppError('Rollout percentage must be between 0 and 100', 400)
        }
        if (typeof allTenants !== 'boolean') throw new AppError('allTenants must be a boolean', 400)

        return {
            name,
            key,
            description: input.description?.trim() ?? '',
            type,
            environment,
            enabled,
            rolloutPercentage,
            allTenants,
            tenantCount: input.tenantCount ?? 0,
            tenantOverrides: input.tenantOverrides ?? [],
            createdBy: input.createdBy ?? 'system',
        }
    }

    toUiShape(flag: IFeatureFlag): any {
        const rolloutPercentage = Number(flag.rolloutPercentage ?? 0)
        const enabled = Boolean(flag.enabled)
        const status = getDisplayStatus(flag)
        return {
            id: flag._id.toString(),
            name: flag.name,
            description: flag.description,
            type: flag.type,
            rolloutPercentage,
            status,
            tenantsCount: Number(flag.tenantCount ?? 0),
            allTenants: Boolean(flag.allTenants),
            tenantOverrides: (flag.tenantOverrides ?? []).map((override, index) => ({
                id: `${flag._id.toString()}-${index}`,
                initials: override.initials || 'NA',
                name: override.name,
                status: override.status,
                description: override.description,
                color: override.color || 'bg-slate-500',
            })),
            createdDate: formatDate(flag.createdAt),
            lastChanged: formatRelative(flag.updatedAt),
            lastChangedBy: flag.updatedBy || flag.createdBy || 'system',
            isEnabled: enabled,
            enabled,
            environment: flag.environment,
            key: flag.key,
        }
    }
}

export const featureFlagService = new FeatureFlagService()
