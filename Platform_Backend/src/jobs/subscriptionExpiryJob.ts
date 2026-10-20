import { BillingSubscription } from '../models/BillingSubscription'
import { Organization } from '../models/Organization'
import logger from '../utils/logger'

let timer: NodeJS.Timeout | null = null

async function processDueExpiries(): Promise<void> {
    const now = new Date()

    try {
        const dueSubscriptions = await BillingSubscription.find({
            status: 'trial',
            trialEndsAt: { $lte: now },
        })
            .select('_id organizationId trialEndsAt status')
            .lean()

        if (!dueSubscriptions.length) {
            return
        }

        for (const subscription of dueSubscriptions) {
            const subscriptionId = String(subscription._id)
            const organizationId = String(subscription.organizationId)

            await BillingSubscription.updateOne(
                { _id: subscriptionId, status: 'trial' },
                { $set: { status: 'expired', isActive: false, updatedAt: new Date() } }
            )

            await Organization.updateOne(
                { _id: organizationId },
                { $set: { isActive: false, updatedAt: new Date() } }
            )

            logger.info('[SubscriptionExpiryJob] Trial expired', {
                subscriptionId,
                organizationId,
                trialEndsAt: subscription.trialEndsAt,
            })
        }
    } catch (error) {
        logger.error('[SubscriptionExpiryJob] Failed to process due expiries', error)
    }
}

function scheduleNextExpiryCheck(): void {
    if (timer) {
        clearTimeout(timer)
    }

    void BillingSubscription.find({
        status: 'trial',
        trialEndsAt: { $ne: null },
    })
        .select('trialEndsAt')
        .sort({ trialEndsAt: 1 })
        .limit(1)
        .lean()
        .then((nextTrial) => {
            const nextExpiry = nextTrial[0]?.trialEndsAt ? new Date(nextTrial[0].trialEndsAt) : null
            if (!nextExpiry) {
                return
            }

            const delay = Math.max(0, nextExpiry.getTime() - Date.now())
            timer = setTimeout(() => {
                void processDueExpiries().finally(() => {
                    scheduleNextExpiryCheck()
                })
            }, delay)
        })
        .catch((error) => {
            logger.error('[SubscriptionExpiryJob] Failed to schedule next expiry check', error)
        })
}

export function startSubscriptionExpiryJob(): NodeJS.Timeout {
    void processDueExpiries()
    scheduleNextExpiryCheck()

    return setInterval(() => {
        void processDueExpiries().finally(() => {
            scheduleNextExpiryCheck()
        })
    }, 60_000)
}
