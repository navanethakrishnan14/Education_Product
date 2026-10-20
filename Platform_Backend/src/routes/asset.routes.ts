import { Router } from 'express'
import { assetController } from '../controllers/asset.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { createAssetSchema, listAssetSchema, updateAssetSchema } from '../validators/asset.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Assets
 *   description: Organization-wise asset creation, assignment, and tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Asset:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "664a1f3e2b4c5d6e7f8a9b0c" }
 *         organizationId: { type: string, example: "664a1f3e2b4c5d6e7f8a9b0e" }
 *         assetName: { type: string, example: "MacBook Pro 16 M2" }
 *         assetId: { type: string, example: "AST-2024-001" }
 *         category: { type: string, example: "Laptop" }
 *         serialNumber: { type: string, nullable: true, example: "SN-987654321" }
 *         purchaseDate: { type: string, format: date-time, nullable: true, example: "2026-04-01T00:00:00.000Z" }
 *         status: { type: string, enum: [Assigned, Available, Under Repair], example: Available }
 *         assignedToEmployeeId: { type: string, nullable: true, example: "664a1f3e2b4c5d6e7f8a9b0f" }
 *         assignedToName: { type: string, nullable: true, example: "John Doe" }
 *         notes: { type: string, nullable: true, example: "Assigned with charger and sleeve." }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     AssetCreateRequest:
 *       type: object
 *       required: [assetName, category]
 *       properties:
 *         organizationId: { type: string, description: "Required only for admin users without org in token." }
 *         assetName: { type: string, maxLength: 150, example: "MacBook Pro 16 M2" }
 *         assetId: { type: string, maxLength: 100, example: "AST-2024-001", description: "Optional. If omitted, API auto-generates a unique ID per organization." }
 *         category: { type: string, maxLength: 100, example: "Laptop" }
 *         serialNumber: { type: string, nullable: true, example: "SN-987654321" }
 *         purchaseDate: { type: string, format: date, nullable: true, example: "2026-04-01" }
 *         status: { type: string, enum: [Assigned, Available, Under Repair], example: Available }
 *         assignedToEmployeeId: { type: string, nullable: true, example: "664a1f3e2b4c5d6e7f8a9b0f" }
 *         assignedToName: { type: string, nullable: true, example: "John Doe" }
 *         notes: { type: string, nullable: true, maxLength: 1000 }
 *
 *     AssetUpdateRequest:
 *       type: object
 *       properties:
 *         assetName: { type: string, maxLength: 150 }
 *         assetId: { type: string, maxLength: 100 }
 *         category: { type: string, maxLength: 100 }
 *         serialNumber: { type: string, nullable: true }
 *         purchaseDate: { type: string, format: date, nullable: true }
 *         status: { type: string, enum: [Assigned, Available, Under Repair] }
 *         assignedToEmployeeId: { type: string, nullable: true }
 *         assignedToName: { type: string, nullable: true, maxLength: 150 }
 *         notes: { type: string, nullable: true, maxLength: 1000 }
 */

router.use(authenticate)

/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Create a new asset in an organization
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AssetCreateRequest' }
 *     responses:
 *       201:
 *         description: Asset created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Duplicate asset ID in organization
 */
router.post('/', authorize('org_admin', 'hr_admin', 'admin'), validate(createAssetSchema), assetController.create)

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: List assets for current organization
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema: { type: string }
 *         description: Optional for admin users
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Assigned, Available, Under Repair]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200:
 *         description: Asset list
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate(listAssetSchema, 'query'), assetController.list)

/**
 * @swagger
 * /assets/{id}:
 *   patch:
 *     summary: Update an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AssetUpdateRequest' }
 *     responses:
 *       200:
 *         description: Asset updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Asset not found
 */
router.patch('/:id', authorize('org_admin', 'hr_admin', 'admin'), validate(updateAssetSchema), assetController.update)

/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Asset deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Asset not found
 */
router.delete('/:id', authorize('org_admin', 'hr_admin', 'admin'), assetController.remove)

export default router
