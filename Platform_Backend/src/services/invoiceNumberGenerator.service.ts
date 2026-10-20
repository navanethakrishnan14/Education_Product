/**
 * INVOICE NUMBER GENERATOR SERVICE
 * 
 * Generates unique, sequential invoice numbers in format: INV-YYYY-XXXXXX
 * 
 * Uses atomic MongoDB operations to ensure no duplicates
 * Each year has its own sequence (resets at Jan 1)
 * 
 * EXAMPLE OUTPUTS:
 * - INV-2026-000001 (Jan 1, 2026)
 * - INV-2026-000002 (Jan 2, 2026)
 * - INV-2026-000003 (Jan 3, 2026)
 * - INV-2027-000001 (Jan 1, 2027 - new sequence)
 */

import Counter from '../models/Counter'
import { AppError } from '../middleware/errorHandler'

class InvoiceNumberGeneratorService {
    /**
     * Generate a unique invoice number
     * 
     * This uses an atomic MongoDB operation (findByIdAndUpdate) to ensure
     * no two invoices get the same number, even under concurrent requests
     * 
     * @param year Optional year (defaults to current year)
     * @returns Formatted invoice number string
     * @throws AppError if number generation fails
     */
    async generateInvoiceNumber(year: number = new Date().getFullYear()): Promise<string> {
        try {
            const counterId = `invoice_${year}`

            // Atomic increment using findByIdAndUpdate with upsert
            // This ensures no duplicates even with concurrent requests
            const counter = await Counter.findByIdAndUpdate(
                counterId,
                { $inc: { sequenceValue: 1 } },
                {
                    new: true,
                    upsert: true, // Create if doesn't exist
                    runValidators: false,
                }
            )

            if (!counter || counter.sequenceValue === undefined) {
                throw new AppError('Failed to generate invoice number', 500)
            }

            // Format: INV-YYYY-XXXXXX
            const invoiceNumber = `INV-${year}-${String(counter.sequenceValue).padStart(6, '0')}`

            return invoiceNumber
        } catch (err: any) {
            if (err instanceof AppError) {
                throw err
            }
            throw new AppError(`Invoice number generation failed: ${err.message}`, 500)
        }
    }

    /**
     * Generate a unique invoice ID (for _id field)
     * 
     * Returns same format as generateInvoiceNumber() since both _id and number
     * should now be identical for consistency
     * 
     * @param year Optional year (defaults to current year)
     * @returns Formatted invoice ID string (INV-YYYY-XXXXXX)
     */
    async generateInvoiceId(year: number = new Date().getFullYear()): Promise<string> {
        return this.generateInvoiceNumber(year)
    }

    /**
     * Get the current invoice number sequence for a given year
     * (does not increment)
     * 
     * Useful for showing what the next invoice number will be
     * 
     * @param year Optional year (defaults to current year)
     * @returns Current sequence number or 0 if not yet started
     */
    async getCurrentSequence(year: number = new Date().getFullYear()): Promise<number> {
        const counterId = `invoice_${year}`
        const counter = await Counter.findById(counterId)
        return counter?.sequenceValue || 0
    }

    /**
     * Get the next invoice number (preview without incrementing)
     * 
     * Useful for preview purposes before actually generating an invoice
     * 
     * @param year Optional year
     * @returns What the next invoice number will be
     */
    async previewNextInvoiceNumber(year: number = new Date().getFullYear()): Promise<string> {
        const currentSeq = await this.getCurrentSequence(year)
        const nextSeq = currentSeq + 1
        return `INV-${year}-${String(nextSeq).padStart(6, '0')}`
    }

    /**
     * Reset invoice number sequence for a given year
     * 
     * WARNING: Only use in testing or if you understand the implications
     * This can cause invoice number conflicts if not used carefully
     * 
     * @param year Year to reset
     * @param startFrom Starting sequence value (default: 0)
     */
    async resetSequence(year: number = new Date().getFullYear(), startFrom: number = 0): Promise<void> {
        const counterId = `invoice_${year}`
        await Counter.findByIdAndUpdate(counterId, { sequenceValue: startFrom }, { upsert: true })
    }
}

export const invoiceNumberGenerator = new InvoiceNumberGeneratorService()
