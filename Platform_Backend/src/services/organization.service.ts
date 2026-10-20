import mongoose from 'mongoose'
import {
  Organization,
  type IOrganization,
  type IAdminSetup,
  type IPlatformSettings,
  type IAddress,
  type IBusinessInfo,
} from '../models/Organization'
import { OrgUser } from '../models/OrgUser'
import { BillingPlan } from '../models/BillingPlan'
import { BillingSubscription } from '../models/BillingSubscription'
import { BillingPeriod } from '../models/BillingPeriod'
import { BillingInvoice } from '../models/BillingInvoice'
import { Employee } from '../models/Employee'
import { Leave } from '../models/Leave'
import { Attendance } from '../models/Attendance'
import { Asset } from '../models/Asset'
import { AppError } from '../middleware/errorHandler'
import type { PaginatedResult, PaginationQuery } from '../types'
import { employeeService } from './employee.service'
import { subscriptionService } from './subscriptionService'
import logger from '../utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Input type
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  // Core — existing fields
  name: string
  workspaceUrl?: string   // auto-generated when omitted
  logoUrl?: string | null
  industryType?: string   // legacy alias
  industry?: string       // new wizard alias → stored as industryType

  // New fields from wizard
  companySize?: string
  billingEmail?: string
  phoneNumber?: string
  currency?: string
  address?: IAddress
  business?: IBusinessInfo

  // Plan & modules
  planId?: string
  discountPercentage?: number
  modules?: string[]      // module keys selected by the wizard

  // Admin
  adminSetup?: IAdminSetup & {
    firstName?: string    // new — wizard sends first/last separately
    lastName?: string
  }

  // Status & settings
  isActive?: boolean
  platformSettings?: IPlatformSettings

  // Legacy fields kept for backward-compat
  locationAttendance?: unknown
}

export type UpdateOrganizationInput = Partial<
  CreateOrganizationInput & { isActive: boolean }
>

export interface OrganizationListItem extends IOrganization {
  billing: {
    planName: string | null
    seatsUsed: number
    seatsLimit: number
    status: string
    subscriptionStatus: string | null
    trialEndsAt: Date | null
    currentPeriodEnd: Date | null
    nextRenewalDate: Date | null
    mrr: number
    currency: string
    healthScore: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a plain name string to a URL-safe slug */
function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

/** Resolve the canonical workspaceUrl: explicit workspaceUrl > auto-generated */
function resolveWorkspaceUrl(input: CreateOrganizationInput): string {
  const raw = (input.workspaceUrl ?? '').trim()
  return raw || nameToSlug(input.name)
}

/** Resolve industry from either new or legacy field */
function resolveIndustry(input: CreateOrganizationInput): string {
  return (input.industry ?? input.industryType ?? 'Other').trim()
}

/** Normalize adminSetup: merge firstName/lastName into adminName if needed */
function resolveAdminName(
  adminSetup: NonNullable<CreateOrganizationInput['adminSetup']>
): string {
  // Prefer explicit adminName, then compose from first/last
  if (adminSetup.adminName?.trim()) return adminSetup.adminName.trim()
  const first = adminSetup.firstName?.trim() ?? ''
  const last = adminSetup.lastName?.trim() ?? ''
  const composed = [first, last].filter(Boolean).join(' ')
  return composed || adminSetup.adminEmail.split('@')[0]
}

function resolveCurrency(value?: string | null): string | undefined {
  const currency = value?.trim().toUpperCase()
  if (!currency) return undefined
  return currency.match(/^(USD|INR|EUR|GBP|AED|SGD|AUD|CAD)\b/)?.[1] ?? currency
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class OrganizationService {
  /**
   * Create a new organization with optional plan, modules, and admin.
   *
   * Flow:
   *  1. Resolve workspaceUrl
   *  2. Validate plan exists and is active (if planId supplied)
   *  3. Validate modules belong to the selected plan (if modules supplied)
   *  4. Check workspaceUrl uniqueness — return 409 immediately (no silent rename)
   *  5. Check admin email uniqueness
   *  6. Create Organization
   *  7. Create Employee + OrgUser (rollback org on failure)
   *  8. Increment plan tenantCount
   */
  async create(
    input: CreateOrganizationInput
  ): Promise<{ organization: IOrganization; temporaryPassword?: string }> {

    // ── 1. Resolve canonical workspace URL ─────────────────────────────────
    const workspaceUrl = resolveWorkspaceUrl(input)
    const industryType = resolveIndustry(input)

    if (input.discountPercentage !== undefined && (!Number.isFinite(Number(input.discountPercentage)) || Number(input.discountPercentage) < 0 || Number(input.discountPercentage) > 100)) {
      throw new AppError('Discount percentage must be between 0 and 100.', 400)
    }

    // ── 2. Resolve default free plan when no plan is selected ────────────
    let resolvedPlanId = input.planId ?? null
    if (!resolvedPlanId) {
      const freePlan = await BillingPlan.findOne({ code: 'plan_free', status: 'active' }).lean()
      if (!freePlan) {
        throw new AppError('Default free trial plan is not available. Please select a plan.', 500)
      }
      resolvedPlanId = String(freePlan._id)
    }

    // ── 3. Validate selected plan ─────────────────────────────────────────
    let resolvedModules: string[] = []
    const selectedPlan = await BillingPlan.findById(resolvedPlanId).lean()
    if (!selectedPlan) {
      throw new AppError('Selected plan not found.', 404)
    }
    if (selectedPlan.status !== 'active') {
      throw new AppError('The selected plan is not active. Please choose an active plan.', 400)
    }

    // ── 4. Resolve / validate modules ─────────────────────────────────────
    const planModuleKeys = (selectedPlan.modules ?? []).map((m) => m.key)

    if (input.modules && input.modules.length > 0) {
      // Validate every requested module belongs to this plan
      const invalid = input.modules.filter((k) => !planModuleKeys.includes(k))
      if (invalid.length > 0) {
        throw new AppError(
          `The following modules are not part of the selected plan: ${invalid.join(', ')}.`,
          400
        )
      }
      resolvedModules = input.modules
    } else {
      // Auto-assign the plan's included (enabled) modules
      resolvedModules = (selectedPlan.modules ?? [])
        .filter((m) => m.enabled)
        .map((m) => m.key)
    }

    // ── 4. Workspace URL uniqueness ──────────────────────────────────────
    const [existingOrg, existingOrgUser] = await Promise.all([
      Organization.findOne({ workspaceUrl }).lean(),
      input.adminSetup
        ? OrgUser.findOne({ email: input.adminSetup.adminEmail.toLowerCase() }).lean()
        : Promise.resolve(null),
    ])

    if (existingOrg) {
      throw new AppError('Workspace URL already exists. Please choose a different workspace URL.', 409)
    }

    // ── 5. Admin email uniqueness ──────────────────────────────────────────
    if (existingOrgUser) {
      throw new AppError('Admin email is already registered as an org user.', 409)
    }

    // ── 6. Auto-generate employee ID prefix from workspace name ────────────
    const prefix = workspaceUrl.split('-')[0].slice(0, 3).toUpperCase()
    const platformSettings: IPlatformSettings = {
      employeeIdPrefix: prefix || 'EMP',
      annualLeave: 12,
      sickLeave: 12,
      casualLeave: 12,
      ...input.platformSettings,
    }

    // ── 7. Create Organization ─────────────────────────────────────────────
    const normalizedAdminSetup = input.adminSetup
      ? {
        profilePhotoUrl: input.adminSetup.profilePhotoUrl ?? null,
        adminName: resolveAdminName(input.adminSetup),
        adminEmail: input.adminSetup.adminEmail.trim().toLowerCase(),
        adminPhone: input.adminSetup.adminPhone ?? '',
        adminPassword: input.adminSetup.adminPassword,
        timezone: input.adminSetup.timezone ?? '',
        currency: input.adminSetup.currency ?? '',
        region: input.adminSetup.region ?? '',
      }
      : undefined

    const organization = await Organization.create({
      name: input.name.trim(),
      workspaceUrl,
      industryType,
      companySize: input.companySize ?? null,
      billingEmail: input.billingEmail ?? null,
      phoneNumber: input.phoneNumber ?? null,
      currency: resolveCurrency(input.currency ?? input.adminSetup?.currency) ?? null,
      address: input.address ?? undefined,
      business: input.business ?? undefined,
      logoUrl: input.logoUrl ?? null,
      planId: resolvedPlanId,
      discountPercentage: input.discountPercentage ?? 0,
      modules: resolvedModules,
      adminSetup: normalizedAdminSetup,
      isActive: input.isActive ?? true,
      platformSettings,
    })

    let temporaryPassword: string | undefined

    // ── 8. Create admin records — rollback org if this fails ──────────────
    if (input.adminSetup) {
      try {
        const resolvedName = resolveAdminName(input.adminSetup)
        const nameParts = resolvedName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Employee record — primary login identity inside the org
        const result = await employeeService.registerEmployee({
          firstName,
          lastName,
          email: input.adminSetup.adminEmail,
          workEmail: input.adminSetup.adminEmail,
          role: 'Org_superadmin' as any,
          organizationId: organization._id.toString(),
          phoneNumber: input.adminSetup.adminPhone,
          password: input.adminSetup.adminPassword,
        })
        temporaryPassword = result.temporaryPassword

        // OrgUser record — allows platform/org dashboard login
        await OrgUser.create({
          name: resolvedName,
          email: input.adminSetup.adminEmail,
          password: input.adminSetup.adminPassword,
          role: 'Org_superadmin',
          organizationId: organization._id,
          isActive: true,
        })
      } catch (adminErr: unknown) {
        // Rollback: delete the organization if admin creation fails
        logger.error(
          `Admin creation failed for org ${organization._id} — rolling back`,
          adminErr
        )
        await Organization.findByIdAndDelete(organization._id)
        throw adminErr
      }
    }

    // ── 9. Increment plan tenant count ─────────────────────────────────────
    if (resolvedPlanId) {
      BillingPlan.findByIdAndUpdate(resolvedPlanId, { $inc: { tenantCount: 1 } })
        .exec()
        .catch((err) =>
          logger.warn(`Failed to increment tenantCount for plan ${resolvedPlanId}`, err)
        )
    }

    // ── 10. Create auto-subscription for the organization ───────────────────
    if (resolvedPlanId) {
      try {
        await subscriptionService.createSubscription({
          organizationId: organization._id.toString(),
          planId: resolvedPlanId,
          discountPercentage: input.discountPercentage ?? 0,
          billingCycle: 'monthly',
          currency: resolveCurrency(input.currency ?? input.adminSetup?.currency),
        })
      } catch (err: any) {
        const message = err instanceof AppError ? err.message : err?.message || 'Unknown error'
        logger.error(`Failed to create auto-subscription for org ${organization._id}: ${message}`, err)
        throw new AppError(
          `Failed to initialize subscription for the new organization: ${message}`,
          err instanceof AppError ? err.statusCode : 500
        )
      }
    }

    return { organization, temporaryPassword }
  }

  // ── List ────────────────────────────────────────────────────────────────────

  async list(
    query: PaginationQuery & { search?: string; isActive?: boolean }
  ): Promise<PaginatedResult<OrganizationListItem>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      isActive,
    } = query

    const filter: Record<string, unknown> = {}

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { workspaceUrl: new RegExp(search, 'i') },
      ]
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive
    }

    const [data, total] = await Promise.all([
      Organization.find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Organization.countDocuments(filter),
    ])

    const enrichedData = await Promise.all(data.map(async (organization) => {
      const organizationId = organization._id.toString()
      const subscription = await BillingSubscription.findOne({
        organizationId,
        status: { $in: ['active', 'trial', 'expired', 'past_due', 'cancelled'] },
      }).sort({ createdAt: -1 }).lean()

      const planId = subscription?.currentPlanId ?? organization.planId
      const [plan, employeeCount, billingPeriod, latestInvoice] = await Promise.all([
        planId ? BillingPlan.findById(planId).lean() : Promise.resolve(null),
        Employee.countDocuments({ organizationId }),
        subscription
          ? BillingPeriod.findOne({ subscriptionId: subscription._id, status: 'active' })
            .sort({ periodStart: -1 }).lean()
          : Promise.resolve(null),
        BillingInvoice.findOne({
          organizationId,
          ...(subscription ? { subscriptionId: subscription._id } : {}),
          status: { $ne: 'cancelled' },
        }).sort({ issueDate: -1, createdAt: -1 }).lean(),
      ])

      const seatsLimit = Number(plan?.maxSeats ?? 0)
      const invoiceSeatQuantity = latestInvoice?.lineItems
        ?.filter((item) => item.type === 'subscription' || item.type === 'upgrade')
        .reduce((total, item) => total + Number(item.quantity || 0), 0) ?? 0
      const seatsUsed = Math.max(1, invoiceSeatQuantity, employeeCount)
      const billingStatus = latestInvoice?.paymentStatus ?? latestInvoice?.status
      const subscriptionStatus = subscription?.status ?? null
      const trialEndsAt = subscription?.trialEndsAt ?? null
      const currentPeriodEnd = subscription?.currentPeriodEnd ?? null
      const healthScore = !organization.isActive
        ? 0
        : Math.max(1, Math.min(100,
          70
          + (billingStatus === 'paid' ? 30 : billingStatus === 'overdue' || billingStatus === 'failed' ? 5 : 20)
          - (seatsLimit > 0 && seatsUsed >= seatsLimit ? 10 : 0),
        ))

      return {
        ...organization.toObject(),
        billing: {
          planName: plan?.name ?? null,
          seatsUsed,
          seatsLimit,
          status: !organization.isActive
            ? 'Inactive'
            : subscriptionStatus === 'trial' && trialEndsAt && new Date(trialEndsAt) <= new Date()
              ? 'Trial expired'
              : subscriptionStatus === 'trial'
                ? 'Trial'
                : subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'past_due'
                  ? subscriptionStatus
                  : 'Active',
          subscriptionStatus,
          trialEndsAt,
          currentPeriodEnd,
          nextRenewalDate: billingPeriod?.nextBillingDate ?? subscription?.nextBillingDate ?? null,
          mrr: Number(latestInvoice?.totalAmount ?? 0),
          currency: latestInvoice?.currency ?? subscription?.currency ?? plan?.currency ?? 'USD',
          healthScore,
        },
      } as OrganizationListItem
    }))

    return { data: enrichedData, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  // ── Get by ID ───────────────────────────────────────────────────────────────

  async getById(id: string): Promise<IOrganization> {
    const org = await Organization.findById(id)
    if (!org) throw new AppError('Organization not found', 404)
    return org
  }

  // ── Get Detailed Metrics ────────────────────────────────────────────────────

  async getDetailedMetrics(id: string): Promise<{
    organization: IOrganization
    metrics: {
      totalEmployees: number
      activeEmployees: number
      dailyActive: number
      storageUsed: number
      storageLimit: number
      apiCalls: number
      uptime: number
      healthScore: number
      billStatus: string
    }
  }> {
    const org = await Organization.findById(id)
    if (!org) throw new AppError('Organization not found', 404)

    // Fetch employee counts
    const [totalEmployees, activeEmployees, storageUsed] = await Promise.all([
      Employee.countDocuments({ organizationId: id }),
      Employee.countDocuments({ organizationId: id, isActive: true }),
      // In production, get actual storage from file service
      Promise.resolve(62),
    ])

    // Calculate daily active (mock: 80% of active employees)
    const dailyActive = Math.floor(activeEmployees * 0.8)

    // Mock metrics for now — these would come from monitoring/analytics services
    const metrics = {
      totalEmployees,
      activeEmployees,
      dailyActive,
      storageUsed,
      storageLimit: 250,
      apiCalls: 1200000,
      uptime: 99.9,
      healthScore: 88,
      billStatus: org.isActive ? 'on_time' : 'overdue',
    }

    return {
      organization: org,
      metrics,
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, input: UpdateOrganizationInput): Promise<IOrganization> {
    const updatePayload: Record<string, unknown> = { ...input }
    const existingOrganization = await Organization.findById(id)
      .select('+adminSetup.adminPassword')
      .lean()
    if (!existingOrganization) throw new AppError('Organization not found', 404)

    if (input.adminSetup) {
      updatePayload.adminSetup = {
        ...existingOrganization.adminSetup,
        ...input.adminSetup,
        adminPassword:
          input.adminSetup.adminPassword || existingOrganization.adminSetup?.adminPassword,
      }
    }

    // Resolve industry alias
    if (input.industry && !input.industryType) {
      updatePayload.industryType = input.industry
      delete updatePayload.industry
    }

    // If updating workspace URL, check for duplicates
    const resolvedUrl = (updatePayload.workspaceUrl as string | undefined)
    if (resolvedUrl) {
      const existing = await Organization.findOne({
        workspaceUrl: resolvedUrl,
        _id: { $ne: id },
      })
      if (existing) {
        throw new AppError('Workspace URL is already taken by another organization.', 409)
      }
    }

    const org = await Organization.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })

    if (input.currency) {
      await BillingSubscription.updateOne(
        { organizationId: id, status: { $in: ['active', 'trial', 'expired', 'past_due', 'cancelled'] } },
        { $set: { currency: resolveCurrency(input.currency) } },
      )
    }

    return org
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const org = await Organization.findById(id)
    if (!org) throw new AppError('Organization not found', 404)

    const db = mongoose.connection.db!

    // Helper to safely delete from a collection by name
    const deleteFrom = (collectionName: string) =>
      db
        .collection(collectionName)
        .deleteMany({ organizationId: org._id })
        .catch(() => { })

    // Decrement plan tenant count
    if (org.planId) {
      BillingPlan.findByIdAndUpdate(org.planId, { $inc: { tenantCount: -1 } })
        .exec()
        .catch(() => { })
    }

    await Promise.all([
      // Collections with Mongoose models
      Employee.deleteMany({ organizationId: id }),
      OrgUser.deleteMany({ organizationId: id }),
      Leave.deleteMany({ organizationId: id }),
      Attendance.deleteMany({ organizationId: id }),
      Asset.deleteMany({ organizationId: id }),

      // Collections without model files yet (direct DB access)
      deleteFrom('branches'),
      deleteFrom('departments'),
      deleteFrom('designations'),
      deleteFrom('leavetypes'),
      deleteFrom('assettypes'),
      deleteFrom('holidays'),
      deleteFrom('salarycomponents'),
      deleteFrom('employeeinvites'),
      deleteFrom('employeeSalaries'),
      deleteFrom('payrollruns'),
      deleteFrom('payslips'),
      deleteFrom('products'),

      // Remove the organization itself
      Organization.findByIdAndDelete(id),
    ])
  }
}

export const organizationService = new OrganizationService()
