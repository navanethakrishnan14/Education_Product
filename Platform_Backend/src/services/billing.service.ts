import { AppError } from '../middleware/errorHandler'
import { BillingPlan, IBillingPlan } from '../models/BillingPlan'
import { BillingInvoice } from '../models/BillingInvoice'
import { BillingSubscription } from '../models/BillingSubscription'
import { Organization } from '../models/Organization'
import { PlanUpgradeRequest } from '../models/PlanUpgradeRequest'
import type { BillingPlanModule } from '../models/BillingPlan'

export interface CreatePlanInput {
    name: string
    description: string
    code: string
    status: 'active' | 'draft'
    monthlyPrice: number
    annualPrice: number
    discountPercentage?: number
    currency: string
    freeTrial: string
    trialPeriodDays?: number
    modules: Array<{ key?: string; label: string; description: string; enabled: boolean }>
    maxSeats: number
    maxBranches?: number
    storageGb: number
    supportTier: 'email' | 'priority' | '24/7'
    visibleOnPricingPage: boolean
}

interface ModuleInput {
    key?: string
    label: string
    description: string
    enabled: boolean
}

export interface PlanModuleCatalogItem {
    key: string
    label: string
    description: string
}

const MODULE_CATALOG: PlanModuleCatalogItem[] = [
    { key: 'attendance', label: 'Attendance', description: 'Track team attendance and time logs.' },
    { key: 'leave', label: 'Leave', description: 'Manage leave requests and approvals.' },
    { key: 'payroll', label: 'Payroll', description: 'Process payroll runs and payslips.' },
    { key: 'assetManagement', label: 'Asset Management', description: 'Track and manage company assets.' },
    { key: 'announcement', label: 'Announcements', description: 'Create and share organization announcements.' },
    { key: 'notification', label: 'Notifications', description: 'Send notifications to organization users.' },
    { key: 'organizationSettings', label: 'Organization Settings', description: 'Configure branches, departments, designations, and workspace settings.' },
    { key: 'analytics', label: 'Analytics', description: 'View billing and workforce analytics.' },
    { key: 'digitalid', label: 'Digital ID', description: 'Secure digital identity features.' },
    { key: 'sso', label: 'SSO', description: 'Single sign-on and enterprise access.' },
]

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
}

function buildPlanCode(inputName: string): string {
    const slug = slugify(inputName)
    return slug ? `plan_${slug}` : 'plan_plan'
}

function formatDaysLabel(days: number): string {
    if (days === 0) return 'today'
    if (days < 30) return days > 0 ? `in ${days} days` : `${Math.abs(days)} days left`
    if (days < 365) {
        const months = Math.round(days / 30)
        return days > 0 ? `in ${months} month${months === 1 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'} left`
    }
    const years = Math.round(days / 365)
    return days > 0 ? `in ${years} year${years === 1 ? '' : 's'}` : `${years} year${years === 1 ? '' : 's'} left`
}

function getModuleCatalogWithEnabled(modules?: ModuleInput[]): BillingPlanModule[] {
    const normalized = modules ?? []
    const catalogMap = new Map(MODULE_CATALOG.map((item) => [item.key, item]))
    const result: BillingPlanModule[] = []

    for (const moduleItem of normalized) {
        // Validate required fields exist and aren't empty
        const label = typeof moduleItem.label === 'string' ? moduleItem.label.trim() : ''

        if (!label) {
            console.warn(`[getModuleCatalogWithEnabled] Skipping invalid module: missing or invalid label`, moduleItem)
            continue
        }

        // Generate key from label if not provided, or trim the provided key
        let key = moduleItem.key ? String(moduleItem.key).trim() : slugify(label)

        if (!key) {
            console.warn(`[getModuleCatalogWithEnabled] Skipping module: unable to generate key from label`, moduleItem)
            continue
        }

        // Look up catalog entry or create new one
        const catalogEntry = catalogMap.get(key)

        if (!catalogEntry) {
            // Key not in catalog - use custom entry
            result.push({
                key: key,
                label: label,
                description: String(moduleItem.description ?? '').trim(),
                enabled: Boolean(moduleItem.enabled),
            })
        } else {
            // Use catalog entry (ensures consistent data)
            result.push({
                key: catalogEntry.key,
                label: catalogEntry.label,
                description: catalogEntry.description,
                enabled: Boolean(moduleItem.enabled),
            })
        }
    }

    // If no valid modules were provided, return all modules disabled
    if (result.length === 0) {
        return MODULE_CATALOG.map((item) => ({ ...item, enabled: false }))
    }

    return result
}

function validatePlanPayload(input: CreatePlanInput): void {
    const errors: Record<string, string> = {}

    if (!input.name?.trim()) {
        errors.name = 'Name is required'
    }
    if (input.monthlyPrice === undefined || Number.isNaN(Number(input.monthlyPrice)) || Number(input.monthlyPrice) < 0) {
        errors.monthlyPrice = 'Monthly price must be a non-negative number'
    }
    if (input.annualPrice === undefined || Number.isNaN(Number(input.annualPrice)) || Number(input.annualPrice) < 0) {
        errors.annualPrice = 'Annual price must be a non-negative number'
    }
    if (input.discountPercentage !== undefined && (Number.isNaN(Number(input.discountPercentage)) || Number(input.discountPercentage) < 0 || Number(input.discountPercentage) > 100)) {
        errors.discountPercentage = 'Discount percentage must be between 0 and 100'
    }
    if (input.maxSeats !== undefined && (!Number.isInteger(Number(input.maxSeats)) || Number(input.maxSeats) < 0)) {
        errors.maxSeats = 'Max seats must be an integer greater than or equal to 0'
    }
    if (input.maxBranches !== undefined && (!Number.isInteger(Number(input.maxBranches)) || Number(input.maxBranches) < 0)) {
        errors.maxBranches = 'Max branches must be an integer greater than or equal to 0'
    }
    if (input.trialPeriodDays !== undefined && (!Number.isInteger(Number(input.trialPeriodDays)) || Number(input.trialPeriodDays) < 0)) {
        errors.trialPeriodDays = 'Trial period days must be an integer greater than or equal to 0'
    }
    if (input.storageGb !== undefined && (!Number.isInteger(Number(input.storageGb)) || Number(input.storageGb) < 10)) {
        errors.storageGb = 'Storage GB must be an integer greater than or equal to 10'
    }

    if (Object.keys(errors).length > 0) {
        throw new AppError('Validation failed', 400, errors)
    }
}

export class BillingService {
    async listPlans(): Promise<IBillingPlan[]> {
        const plans = await BillingPlan.find().sort({ monthlyPrice: 1 })
        return this.attachComputedFields(plans)
    }

    async getPlan(id: string): Promise<IBillingPlan> {
        const plan = await BillingPlan.findById(id)
        if (!plan) throw new AppError('Plan not found', 404)
        const [withComputed] = await this.attachComputedFields([plan])
        return withComputed
    }

    async createPlan(input: CreatePlanInput): Promise<IBillingPlan> {
        validatePlanPayload(input)

        const code = (input.code || buildPlanCode(input.name)).trim().toLowerCase()
        const existing = await BillingPlan.findOne({ code })
        if (existing) throw new AppError('Plan code already exists', 409)

        const plan = await BillingPlan.create({
            ...input,
            code,
            modules: getModuleCatalogWithEnabled(input.modules),
            currency: input.currency || 'USD',
            freeTrial: (input.freeTrial as any) || 'none',
            trialPeriodDays: Number(input.trialPeriodDays ?? 0),
            maxBranches: Number(input.maxBranches ?? 1),
            visibleOnPricingPage: input.visibleOnPricingPage ?? true,
            tenantCount: 0,
            isHighlighted: false,
        })

        const [computedPlan] = await this.attachComputedFields([plan])
        return computedPlan
    }

    async updatePlan(id: string, input: Partial<CreatePlanInput>): Promise<IBillingPlan> {
        const plan = await BillingPlan.findById(id)
        if (!plan) throw new AppError('Plan not found', 404)

        if (input.name || input.monthlyPrice !== undefined || input.annualPrice !== undefined || input.maxSeats !== undefined || input.storageGb !== undefined) {
            validatePlanPayload({
                name: input.name ?? plan.name,
                description: input.description ?? plan.description,
                code: input.code ?? plan.code,
                status: input.status ?? plan.status,
                monthlyPrice: input.monthlyPrice ?? plan.monthlyPrice,
                annualPrice: input.annualPrice ?? plan.annualPrice,
                discountPercentage: input.discountPercentage ?? plan.discountPercentage ?? 0,
                currency: input.currency ?? plan.currency,
                freeTrial: input.freeTrial ?? plan.freeTrial,
                modules: input.modules ?? (plan.modules as any),
                maxSeats: input.maxSeats ?? plan.maxSeats,
                storageGb: input.storageGb ?? plan.storageGb,
                supportTier: input.supportTier ?? plan.supportTier,
                visibleOnPricingPage: input.visibleOnPricingPage ?? plan.visibleOnPricingPage,
            })
        }

        if (input.code && input.code !== plan.code) {
            const existing = await BillingPlan.findOne({ code: input.code.trim().toLowerCase() })
            if (existing && existing._id.toString() !== id) throw new AppError('Plan code already exists', 409)
        }

        const payload: Partial<IBillingPlan> = {
            ...(input as Partial<IBillingPlan>),
            ...(input.code ? { code: input.code.trim().toLowerCase() } : {}),
            ...(input.modules ? { modules: getModuleCatalogWithEnabled(input.modules as ModuleInput[]) } : {}),
            ...(input.currency ? { currency: input.currency as IBillingPlan['currency'] } : {}),
            ...(input.freeTrial ? { freeTrial: input.freeTrial as IBillingPlan['freeTrial'] } : {}),
            ...(input.trialPeriodDays !== undefined ? { trialPeriodDays: Number(input.trialPeriodDays) } : {}),
            ...(input.maxBranches !== undefined ? { maxBranches: Number(input.maxBranches) } : {}),
            ...(input.visibleOnPricingPage !== undefined ? { visibleOnPricingPage: input.visibleOnPricingPage } : {}),
        }
        if (input.maxSeats !== undefined) payload.maxSeats = input.maxSeats
        if (input.storageGb !== undefined) payload.storageGb = input.storageGb
        if (input.supportTier !== undefined) payload.supportTier = input.supportTier as any
        if (input.visibleOnPricingPage !== undefined) payload.visibleOnPricingPage = input.visibleOnPricingPage

        console.log('[updatePlan] Final payload for DB:', JSON.stringify(payload, null, 2))

        try {
            const updated = await BillingPlan.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
            if (!updated) throw new AppError('Plan not found', 404)

            const [computedPlan] = await this.attachComputedFields([updated])
            return computedPlan
        } catch (err: any) {
            console.error('[updatePlan] Database error:', err.name, err.message)
            if (err.errors) {
                console.error('[updatePlan] Validation errors:', err.errors)
            }

            // Handle Mongoose validation errors more gracefully
            if (err.name === 'ValidationError') {
                const errors = Object.entries(err.errors).map(([field, error]: [string, any]) =>
                    `${field}: ${error.message}`
                )
                throw new AppError(`Plan validation failed: ${errors.join(', ')}`, 422, errors)
            }
            throw err
        }
    }

    async deletePlan(id: string): Promise<void> {
        const plan = await BillingPlan.findById(id).select('_id name').lean()
        if (!plan) throw new AppError('Plan not found', 404)

        const [organizationReference, subscriptionReference, upgradeRequestReference] = await Promise.all([
            Organization.exists({ planId: id }),
            BillingSubscription.exists({ $or: [{ currentPlanId: id }, { scheduledPlanId: id }] }),
            PlanUpgradeRequest.exists({ $or: [{ currentPlanId: id }, { requestedPlanId: id }] }),
        ])

        if (organizationReference || subscriptionReference || upgradeRequestReference) {
            throw new AppError(`Cannot delete plan '${plan.name}' while it is assigned or referenced`, 409)
        }

        const deleted = await BillingPlan.findByIdAndDelete(id)
        if (!deleted) throw new AppError('Plan not found', 404)
    }

    async listInvoices(limit = 5): Promise<any[]> {
        const invoices = await BillingInvoice.find().sort({ createdAt: -1 }).limit(limit)
        return invoices.map((invoice) => ({
            ...invoice.toObject(),
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : undefined,
            createdAt: invoice.createdAt ? invoice.createdAt.toISOString() : new Date().toISOString(),
        }))
    }

    async listRenewals(limit = 5): Promise<any[]> {
        const subscriptions = await BillingSubscription.find({ isActive: true }).sort({ renewalDate: 1 }).limit(limit)
        return subscriptions.map((subscription) => {
            const daysUntil = Math.ceil((subscription.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            return {
                _id: subscription._id.toString(),
                tenantName: subscription.tenantName,
                tenantInitials: subscription.tenantInitials,
                tenantColor: subscription.tenantColor,
                planName: subscription.planName,
                planType: subscription.planType,
                monthlyAmount: subscription.monthlyAmount,
                renewalDate: subscription.renewalDate.toISOString(),
                daysLabel: formatDaysLabel(daysUntil),
                isUrgent: daysUntil <= 7,
            }
        })
    }

    async getRevenueOverview(): Promise<any> {
        const [, subscriptions, invoices] = await Promise.all([
            BillingPlan.find(),
            BillingSubscription.find({ isActive: true, status: 'active' }),
            BillingInvoice.find(),
        ])

        const mrr = subscriptions.reduce((total, subscription) => total + subscription.monthlyAmount, 0)
        const arr = mrr * 12
        const now = new Date()
        const billedThisMonth = invoices.filter((invoice) => {
            const createdAt = new Date(invoice.createdAt)
            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
        }).reduce((total, invoice) => total + invoice.amount, 0)
        const collectedThisMonth = invoices.filter((invoice) => {
            if (invoice.status !== 'paid') return false
            const createdAt = new Date(invoice.createdAt)
            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
        }).reduce((total, invoice) => total + invoice.amount, 0)
        const overdue = invoices.filter((invoice) => invoice.status === 'overdue').reduce((total, invoice) => total + invoice.amount, 0)
        const overdueTenantsCount = new Set(invoices.filter((invoice) => invoice.status === 'overdue').map((invoice) => invoice.tenantName)).size

        return {
            mrr,
            mrrMoMPercent: 0,
            arr,
            arrYoYPercent: 0,
            collectedThisMonth,
            billedPercent: billedThisMonth > 0 ? Math.round((collectedThisMonth / billedThisMonth) * 100) : 0,
            overdue,
            overdueTenantsCount,
        }
    }

    async attachComputedFields(plans: IBillingPlan[]): Promise<IBillingPlan[]> {
        const subscriptions = await BillingSubscription.find({ isActive: true, status: 'active' })
        const planTenantCounts = subscriptions.reduce<Record<string, number>>((acc, subscription) => {
            const planId = (subscription as any).currentPlanId ?? (subscription as any).planId
            if (!planId) {
                return acc
            }

            const planKey = planId.toString()
            acc[planKey] = (acc[planKey] || 0) + 1
            return acc
        }, {})

        const highlightedPlan = plans.reduce<IBillingPlan | undefined>((best, current) => {
            if (!best) return current
            return current.monthlyPrice > best.monthlyPrice ? current : best
        }, undefined)

        return plans.map((plan) => {
            const planObject = plan.toObject()
            return {
                ...planObject,
                tenantCount: planTenantCounts[plan._id.toString()] || 0,
                isHighlighted: Boolean(highlightedPlan && highlightedPlan._id.toString() === plan._id.toString()),
            }
        })
    }

    getModuleCatalog(): PlanModuleCatalogItem[] {
        return MODULE_CATALOG
    }
}

export const billingService = new BillingService()
