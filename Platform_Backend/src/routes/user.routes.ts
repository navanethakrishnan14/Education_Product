import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import {
  updateProfileSchema,
  changePasswordSchema,
  listUsersSchema,
} from '../validators/user.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile & account management
 */

// All user routes require authentication
router.use(authenticate)

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/UserPublic' }
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', userController.getProfile)

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Jane Smith }
 *               avatarUrl: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Profile updated
 *       422:
 *         description: Validation failed
 */
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile)

/**
 * @swagger
 * /users/change-password:
 *   patch:
 *     summary: Change own password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmNewPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Current password incorrect
 */
router.patch('/change-password', validate(changePasswordSchema), userController.changePassword)

/**
 * @swagger
 * /users/account:
 *   delete:
 *     summary: Delete own account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/account', userController.deleteAccount)

// ── Admin routes ────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only user management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (admin)
 *     tags: [Admin]
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
 *         schema: { type: string, enum: [name, email, createdAt] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/UserPublic' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       403:
 *         description: Forbidden
 */
router.get('/', validate(listUsersSchema, 'query'), userController.listUsers)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', authorize('admin'), userController.adminGetUser)

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               role: { type: string, enum: [user, admin] }
 *               isVerified: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/:id', authorize('admin'), userController.adminUpdateUser)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/:id', authorize('admin'), userController.adminDeleteUser)

export default router
