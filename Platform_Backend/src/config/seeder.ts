import env from './env'
import { User } from '../models/User'
import logger from '../utils/logger'
import type { UserRole } from '../types'

export async function seedSaaSAdmin(): Promise<void> {
  const adminEmail = env.SAAS_ADMIN_EMAIL
  const adminName = env.SAAS_ADMIN_NAME
  const adminPassword = env.SAAS_ADMIN_PASSWORD
  const adminRole: UserRole = 'admin'
  const forcePasswordReset = process.env.SAAS_ADMIN_FORCE_PASSWORD_RESET === 'true'

  if (!adminEmail || !adminPassword) {
    logger.warn('SaaS admin seed configuration missing; skipping admin seed')
    return
  }

  try {
    // Create admin user if missing
    const existingAdmin = await User.findOne({ email: adminEmail }).select('+password')

    if (existingAdmin) {
      let shouldSave = false

      if (existingAdmin.role !== adminRole) {
        existingAdmin.role = adminRole
        logger.info(`SaaS admin user role updated to ${adminRole} for ${adminEmail}`)
        shouldSave = true
      }

      existingAdmin.isVerified = true

      // Sync the seeded admin password from environment on every boot unless
      // explicitly disabled. This prevents stale credentials from blocking login.
      if (forcePasswordReset) {
        existingAdmin.password = adminPassword
        logger.info(`SaaS admin password reset (forced) for ${adminEmail}`)
        shouldSave = true
      } else {
        try {
          const matches = await existingAdmin.comparePassword(adminPassword)
          if (!matches) {
            existingAdmin.password = adminPassword
            logger.info(`SaaS admin password synced from env for ${adminEmail}`)
            shouldSave = true
          }
        } catch (err) {
          existingAdmin.password = adminPassword
          logger.warn('SaaS admin password check failed; syncing from env instead', err)
          shouldSave = true
        }
      }

      if (shouldSave) {
        await existingAdmin.save()
      } else {
        logger.info(`SaaS admin user already exists: ${adminEmail}`)
      }

      return
    }

    await User.create({
      name: adminName || 'SaaS Admin',
      email: adminEmail,
      password: adminPassword,
      role: adminRole,
      isVerified: true,
    })

    logger.info(`SaaS admin seeded: ${adminEmail}`)
  } catch (err) {
    logger.error('Failed to seed SaaS admin', err)
  }
}
