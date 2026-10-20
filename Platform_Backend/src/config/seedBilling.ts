import logger from '../utils/logger'
import { BillingPlan } from '../models/BillingPlan'
import { BillingInvoice } from '../models/BillingInvoice'
import { BillingSubscription } from '../models/BillingSubscription'

export async function seedBilling(): Promise<void> {
    try {
        const existingPlans = await BillingPlan.countDocuments()
        if (existingPlans > 0) {
            logger.info('Billing plans already seeded, skipping billing seed')
            return
        }

        const plans = [
            {
                name: 'Free',
                description: 'Core HR features with a 14-day trial for new organizations.',
                code: 'plan_free',
                status: 'active' as const,
                monthlyPrice: 0,
                annualPrice: 0,
                currency: 'USD' as const,
                freeTrial: '14 days' as const,
                trialPeriodDays: 14,
                modules: [
                    { key: 'attendance', label: 'Attendance', description: 'Attendance tracking', enabled: true },
                    { key: 'leave', label: 'Leave', description: 'Leave requests', enabled: true },
                    { key: 'payroll', label: 'Payroll', description: 'Payroll processing', enabled: false },
                    { key: 'analytics', label: 'Analytics', description: 'Analytics dashboard', enabled: false },
                    { key: 'digitalid', label: 'Digital ID', description: 'Digital ID', enabled: false },
                    { key: 'sso', label: 'SSO', description: 'Single sign-on', enabled: false },
                ],
                maxSeats: 5,
                storageGb: 10,
                supportTier: 'email' as const,
                visibleOnPricingPage: true,
                tenantCount: 0,
                isHighlighted: false,
            },
            {
                name: 'Basic',
                description: 'For small teams getting started.',
                code: 'plan_basic',
                status: 'active' as const,
                monthlyPrice: 29,
                annualPrice: 290,
                currency: 'USD' as const,
                freeTrial: '14 days' as const,
                modules: [
                    { key: 'attendance', label: 'Attendance', description: 'Attendance tracking', enabled: true },
                    { key: 'leave', label: 'Leave', description: 'Leave requests', enabled: true },
                    { key: 'payroll', label: 'Payroll', description: 'Payroll processing', enabled: false },
                    { key: 'analytics', label: 'Analytics', description: 'Analytics dashboard', enabled: false },
                    { key: 'digitalid', label: 'Digital ID', description: 'Digital ID', enabled: false },
                    { key: 'sso', label: 'SSO', description: 'Single sign-on', enabled: false },
                ],
                maxSeats: 25,
                storageGb: 50,
                supportTier: 'email' as const,
                visibleOnPricingPage: true,
                tenantCount: 0,
                isHighlighted: false,
            },
            {
                name: 'Growth',
                description: 'For expanding teams that need more control.',
                code: 'plan_growth',
                status: 'active' as const,
                monthlyPrice: 79,
                annualPrice: 790,
                currency: 'USD' as const,
                freeTrial: '30 days' as const,
                trialPeriodDays: 30,
                maxBranches: 5,
                modules: [
                    { key: 'attendance', label: 'Attendance', description: 'Attendance tracking', enabled: true },
                    { key: 'leave', label: 'Leave', description: 'Leave requests', enabled: true },
                    { key: 'payroll', label: 'Payroll', description: 'Payroll processing', enabled: true },
                    { key: 'analytics', label: 'Analytics', description: 'Analytics dashboard', enabled: true },
                    { key: 'digitalid', label: 'Digital ID', description: 'Digital ID', enabled: false },
                    { key: 'sso', label: 'SSO', description: 'Single sign-on', enabled: false },
                ],
                maxSeats: 100,
                storageGb: 200,
                supportTier: 'priority' as const,
                visibleOnPricingPage: true,
                tenantCount: 0,
                isHighlighted: true,
            },
            {
                name: 'Enterprise',
                description: 'For large organizations with advanced support needs.',
                code: 'plan_enterprise',
                status: 'active' as const,
                monthlyPrice: 199,
                annualPrice: 1990,
                currency: 'USD' as const,
                freeTrial: 'none' as const,
                trialPeriodDays: 0,
                maxBranches: 20,
                modules: [
                    { key: 'attendance', label: 'Attendance', description: 'Attendance tracking', enabled: true },
                    { key: 'leave', label: 'Leave', description: 'Leave requests', enabled: true },
                    { key: 'payroll', label: 'Payroll', description: 'Payroll processing', enabled: true },
                    { key: 'analytics', label: 'Analytics', description: 'Analytics dashboard', enabled: true },
                    { key: 'digitalid', label: 'Digital ID', description: 'Digital ID', enabled: true },
                    { key: 'sso', label: 'SSO', description: 'Single sign-on', enabled: true },
                ],
                maxSeats: 0,
                storageGb: 500,
                supportTier: '24/7' as const,
                visibleOnPricingPage: true,
                tenantCount: 0,
                isHighlighted: false,
            },
        ]

        const createdPlans = await BillingPlan.insertMany(plans)

        await BillingInvoice.insertMany([
            { number: 'INV-7741', tenantName: 'Acme Labs', tenantInitials: 'AL', tenantColor: '#2563eb', amount: 1250, status: 'paid', createdAt: new Date('2026-06-28') },
            { number: 'INV-7742', tenantName: 'Northwind', tenantInitials: 'NW', tenantColor: '#7c3aed', amount: 4200, status: 'due', dueDate: new Date('2026-07-10'), createdAt: new Date('2026-07-01') },
            { number: 'INV-7743', tenantName: 'Blue Peak', tenantInitials: 'BP', tenantColor: '#dc2626', amount: 8800, status: 'overdue', dueDate: new Date('2026-06-20'), createdAt: new Date('2026-06-12') },
        ])

        await BillingSubscription.insertMany([
            { tenantName: 'Acme Labs', tenantInitials: 'AL', tenantColor: '#2563eb', planId: createdPlans[0]._id, planName: 'Basic', planType: 'Starter · Trial → convert', monthlyAmount: 29, renewalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: 'trial', seatCount: 12, isActive: true },
            { tenantName: 'Northwind', tenantInitials: 'NW', tenantColor: '#7c3aed', planId: createdPlans[1]._id, planName: 'Growth', planType: 'Enterprise · $18,400/mo', monthlyAmount: 79, renewalDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), status: 'active', seatCount: 40, isActive: true },
            { tenantName: 'Blue Peak', tenantInitials: 'BP', tenantColor: '#dc2626', planId: createdPlans[2]._id, planName: 'Enterprise', planType: 'Enterprise · $18,400/mo', monthlyAmount: 199, renewalDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), status: 'active', seatCount: 80, isActive: true },
        ])

        logger.info('Billing seed data inserted successfully')
    } catch (error) {
        logger.error('Error seeding billing data:', error)
        throw error
    }
}
