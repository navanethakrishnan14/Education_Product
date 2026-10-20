import { Router } from 'express'
import { organizationController } from '../controllers/organization.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  listOrganizationsSchema,
} from '../validators/organization.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management
 */

// All routes require authentication
router.use(authenticate)

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, workspaceUrl, industryType]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization display name
 *                 example: "Acme Corporation"
 *               workspaceUrl:
 *                 type: string
 *                 description: Unique workspace slug (lowercase, hyphens allowed). Becomes {slug}.trimsel.com
 *                 example: "acme-corp"
 *               logoUrl:
 *                 type: string
 *                 nullable: true
 *                 description: URL of the organization logo (SVG, PNG, or JPG, max 800x400px)
 *                 example: "https://cdn.trimsel.com/logos/acme-corp.png"
 *               industryType:
 *                 type: string
 *                 enum: [Technology, Healthcare, Finance, Education, Retail, Other]
 *                 description: Industry category
 *                 example: "Technology"
 *               adminSetup:
 *                 $ref: '#/components/schemas/AdminSetup'
 *               locationAttendance:
 *                 $ref: '#/components/schemas/LocationAttendance'
 *               platformSettings:
 *                 $ref: '#/components/schemas/PlatformSettings'
 *     responses:
 *       201:
 *         description: Organization created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Organization' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Workspace URL already taken
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/',
  // authorize('admin', 'hr_admin'),
  validate(createOrganizationSchema),
  organizationController.create
)

/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: List all organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, createdAt, industryType], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or workspaceUrl
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Paginated list of organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Organization' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', validate(listOrganizationsSchema, 'query'), organizationController.list)

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Get an organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the organization
 *         example: 664a1f3e2b4c5d6e7f8a9b0c
 *     responses:
 *       200:
 *         description: Organization found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Organization' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', organizationController.getById)

/**
 * @swagger
 * /organizations/{id}/metrics:
 *   get:
 *     summary: Get detailed metrics for an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the organization
 *         example: 664a1f3e2b4c5d6e7f8a9b0c
 *     responses:
 *       200:
 *         description: Detailed metrics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     organization: { $ref: '#/components/schemas/Organization' }
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalEmployees: { type: integer }
 *                         activeEmployees: { type: integer }
 *                         dailyActive: { type: integer }
 *                         storageUsed: { type: number }
 *                         storageLimit: { type: number }
 *                         apiCalls: { type: integer }
 *                         uptime: { type: number }
 *                         healthScore: { type: number }
 *                         billStatus: { type: string }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id/metrics', organizationController.getDetailedMetrics)

/**
 * @swagger
 * /organizations/{id}:
 *   put:
 *     summary: Update an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the organization
 *         example: 664a1f3e2b4c5d6e7f8a9b0c
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Acme Corporation"
 *               workspaceUrl:
 *                 type: string
 *                 example: "acme-corp"
 *               logoUrl:
 *                 type: string
 *                 nullable: true
 *                 example: "https://cdn.trimsel.com/logos/acme-corp.png"
 *               industryType:
 *                 type: string
 *                 enum: [Technology, Healthcare, Finance, Education, Retail, Other]
 *                 example: "Technology"
 *               adminSetup:
 *                 $ref: '#/components/schemas/AdminSetup'
 *               locationAttendance:
 *                 $ref: '#/components/schemas/LocationAttendance'
 *               platformSettings:
 *                 $ref: '#/components/schemas/PlatformSettings'
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Organization updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Organization' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Workspace URL already taken
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put(
  '/:id',
  authorize('admin', 'hr_admin'),
  validate(updateOrganizationSchema),
  organizationController.update
)

/**
 * @swagger
 * /organizations/{id}:
 *   delete:
 *     summary: Delete an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the organization
 *         example: 664a1f3e2b4c5d6e7f8a9b0c
 *     responses:
 *       200:
 *         description: Organization deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', 
  // authorize('admin', 'hr_admin'),
   organizationController.delete)

export default router
