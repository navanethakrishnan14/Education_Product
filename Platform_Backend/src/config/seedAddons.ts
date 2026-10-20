import logger from '../utils/logger'
import { Addon } from '../models/Addon'

export async function seedAddons(): Promise<void> {
    try {
        const existingAddons = await Addon.countDocuments()
        if (existingAddons > 0) {
            logger.info('Add-ons already seeded, skipping addon seed')
            return
        }

        const addons = [
            {
                moduleKey: 'asset_management',
                moduleName: 'Asset Management',
                description: 'Comprehensive asset tracking and management system',
                flatPrice: 99,
                currency: 'USD' as const,
                status: 'active' as const,
            },
            {
                moduleKey: 'announcement',
                moduleName: 'Announcements',
                description: 'Internal announcements and communications platform',
                flatPrice: 49,
                currency: 'USD' as const,
                status: 'active' as const,
            },
            {
                moduleKey: 'notification',
                moduleName: 'Notifications',
                description: 'Real-time notifications and alerts system',
                flatPrice: 29,
                currency: 'USD' as const,
                status: 'active' as const,
            },
        ]

        const createdAddons = await Addon.insertMany(addons)
        logger.info('Add-ons seeded successfully', {
            count: createdAddons.length,
            addons: createdAddons.map(a => ({
                id: a._id,
                moduleKey: a.moduleKey,
                moduleName: a.moduleName,
                price: a.flatPrice,
            })),
        })
    } catch (error: any) {
        logger.error('Failed to seed add-ons', {
            error: error.message,
        })
        throw error
    }
}
