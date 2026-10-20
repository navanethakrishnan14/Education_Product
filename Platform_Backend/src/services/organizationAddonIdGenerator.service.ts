/**
 * ORGANIZATION ADDON ID GENERATOR SERVICE
 * 
 * Generates unique, sequential organization-addon IDs in format: ADDON_ORG-XXX
 * 
 * Uses atomic MongoDB operations to ensure no duplicates
 * 
 * EXAMPLE OUTPUTS:
 * - ADDON_ORG-001
 * - ADDON_ORG-002
 * - ADDON_ORG-003
 */

import Counter from '../models/Counter'
import { AppError } from '../middleware/errorHandler'

class OrganizationAddonIdGenerator {
    /**
     * Generate a unique organization addon ID
     * 
     * This uses an atomic MongoDB operation (findByIdAndUpdate) to ensure
     * no two addon records get the same ID, even under concurrent requests
     * 
     * @returns Formatted addon ID string (ADDON_ORG-XXX)
     * @throws AppError if ID generation fails
     */
    async generateAddonOrgId(): Promise<string> {
        try {
            const counterId = 'organizationAddon'

            // Atomic increment using findByIdAndUpdate with upsert
            const counter = await Counter.findByIdAndUpdate(
                counterId,
                { $inc: { sequenceValue: 1 } },
                {
                    new: true,
                    upsert: true,
                    runValidators: false,
                }
            )

            if (!counter || counter.sequenceValue === undefined) {
                throw new AppError('Failed to generate addon ID', 500)
            }

            // Format: ADDON_ORG-XXX
            const addonId = `ADDON_ORG-${String(counter.sequenceValue).padStart(3, '0')}`

            return addonId
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Addon ID generation failed: ${err.message}`, 500)
        }
    }

    /**
     * Get the current addon ID sequence
     * (does not increment)
     * 
     * @returns Current sequence number or 0 if not yet started
     */
    async getCurrentSequence(): Promise<number> {
        const counterId = 'organizationAddon'
        const counter = await Counter.findById(counterId)
        return counter?.sequenceValue || 0
    }

    /**
     * Get the next addon ID (preview without incrementing)
     * 
     * @returns What the next addon ID will be
     */
    async previewNextAddonOrgId(): Promise<string> {
        const currentSeq = await this.getCurrentSequence()
        const nextSeq = currentSeq + 1
        return `ADDON_ORG-${String(nextSeq).padStart(3, '0')}`
    }

    /**
     * Reset addon ID sequence
     * 
     * WARNING: Only use in testing or if you understand the implications
     * 
     * @param startFrom Starting sequence value (default: 0)
     */
    async resetSequence(startFrom: number = 0): Promise<void> {
        const counterId = 'organizationAddon'
        await Counter.findByIdAndUpdate(counterId, { sequenceValue: startFrom }, { upsert: true })
    }
}

export const organizationAddonIdGenerator = new OrganizationAddonIdGenerator()
