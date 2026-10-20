import { Router } from 'express'
import { featureFlagController } from '../controllers/featureFlag.controller'
import { authenticate, requirePlatformAdmin } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import {
    createFeatureFlagSchema,
    updateFeatureFlagSchema,
    listFeatureFlagsSchema,
    toggleFeatureFlagSchema,
    addTenantOverrideSchema,
} from '../validators/featureFlag.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Feature Flags
 *   description: Feature flag management and control
 */

/**
 * @swagger
 * /feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     description: Retrieve all feature flags, optionally filtered by environment
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [Production, Staging]
 *         description: Filter by environment
 *     responses:
 *       200:
 *         description: Feature flags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FeatureFlag'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/',
    authenticate,
    requirePlatformAdmin,
    validate(listFeatureFlagsSchema, 'query'),
    featureFlagController.list
)

/**
 * @swagger
 * /feature-flags/{id}:
 *   get:
 *     summary: Get feature flag by ID
 *     description: Retrieve a single feature flag by its ID
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *     responses:
 *       200:
 *         description: Feature flag retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 */
router.get(
    '/:id',
    authenticate,
    requirePlatformAdmin,
    featureFlagController.getById
)

/**
 * @swagger
 * /feature-flags:
 *   post:
 *     summary: Create a new feature flag
 *     description: Create a new feature flag (Platform Admin only)
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - key
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *                 example: Enable New Dashboard
 *               key:
 *                 type: string
 *                 maxLength: 120
 *                 example: enable_new_dashboard
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Feature flag to enable the new dashboard UI
 *               type:
 *                 type: string
 *                 enum: [RELEASE, EXPERIMENT, OPS]
 *                 default: RELEASE
 *               environment:
 *                 type: string
 *                 enum: [Production, Staging]
 *                 default: Production
 *               enabled:
 *                 type: boolean
 *                 default: false
 *               rolloutPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *               allTenants:
 *                 type: boolean
 *                 default: false
 *               tenantCount:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *               tenantOverrides:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     initials:
 *                       type: string
 *                       maxLength: 4
 *                     status:
 *                       type: string
 *                       enum: [forced-on, forced-off, blocked]
 *                     description:
 *                       type: string
 *                     color:
 *                       type: string
 *     responses:
 *       201:
 *         description: Feature flag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a Platform Admin)
 *       409:
 *         description: Feature flag key already exists
 */
router.post(
    '/',
    authenticate,
    requirePlatformAdmin,
    validate(createFeatureFlagSchema),
    featureFlagController.create
)

/**
 * @swagger
 * /feature-flags/{id}:
 *   put:
 *     summary: Update feature flag
 *     description: Update an existing feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *               key:
 *                 type: string
 *                 maxLength: 120
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               type:
 *                 type: string
 *                 enum: [RELEASE, EXPERIMENT, OPS]
 *               environment:
 *                 type: string
 *                 enum: [Production, Staging]
 *               enabled:
 *                 type: boolean
 *               rolloutPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               allTenants:
 *                 type: boolean
 *               tenantCount:
 *                 type: number
 *               tenantOverrides:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Feature flag updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 *       409:
 *         description: Feature flag key already exists
 */
router.put(
    '/:id',
    authenticate,
    requirePlatformAdmin,
    validate(updateFeatureFlagSchema),
    featureFlagController.update
)

/**
 * @swagger
 * /feature-flags/{id}/toggle:
 *   patch:
 *     summary: Toggle feature flag
 *     description: Toggle a feature flag on/off or set to a specific state
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: If not provided, toggles the current state
 *     responses:
 *       200:
 *         description: Feature flag toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 */
router.patch(
    '/:id/toggle',
    authenticate,
    requirePlatformAdmin,
    validate(toggleFeatureFlagSchema),
    featureFlagController.toggle
)

/**
 * @swagger
 * /feature-flags/{id}:
 *   delete:
 *     summary: Delete feature flag
 *     description: Delete a feature flag permanently
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *     responses:
 *       200:
 *         description: Feature flag deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 */
router.delete(
    '/:id',
    authenticate,
    requirePlatformAdmin,
    featureFlagController.delete
)

/**
 * @swagger
 * /feature-flags/{id}/tenant-overrides:
 *   post:
 *     summary: Add tenant override
 *     description: Add a tenant override to a feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - initials
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *                 example: Acme Corp
 *               initials:
 *                 type: string
 *                 maxLength: 4
 *                 example: AC
 *               status:
 *                 type: string
 *                 enum: [forced-on, forced-off, blocked]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Trial enabled for this tenant
 *               color:
 *                 type: string
 *                 example: "#64748b"
 *     responses:
 *       201:
 *         description: Tenant override added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 *       409:
 *         description: Tenant override already exists
 */
router.post(
    '/:id/tenant-overrides',
    authenticate,
    requirePlatformAdmin,
    validate(addTenantOverrideSchema),
    featureFlagController.addTenantOverride
)

/**
 * @swagger
 * /feature-flags/{id}/tenant-overrides/{overrideIndex}:
 *   delete:
 *     summary: Remove tenant override
 *     description: Remove a tenant override from a feature flag
 *     tags: [Feature Flags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag ID
 *       - in: path
 *         name: overrideIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the tenant override to remove
 *     responses:
 *       200:
 *         description: Tenant override removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag or override not found
 */
router.delete(
    '/:id/tenant-overrides/:overrideIndex',
    authenticate,
    requirePlatformAdmin,
    featureFlagController.removeTenantOverride
)

export default router
