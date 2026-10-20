import { Router } from 'express'
import { leaveController } from '../controllers/leave.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { createLeaveSchema, updateLeaveStatusSchema } from '../validators/leave.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Leaves
 *   description: Leave request creation, listing, and approval workflow
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Leave:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "664a1f3e2b4c5d6e7f8a9b0c" }
 *         employeeId: { type: string, example: "664a1f3e2b4c5d6e7f8a9b0d" }
 *         organizationId: { type: string, nullable: true, example: "664a1f3e2b4c5d6e7f8a9b0e" }
 *         employeeName: { type: string, example: "John Doe" }
 *         leaveType: { type: string, example: "Sick Leave" }
 *         fromDate: { type: string, format: date-time, example: "2026-04-21T00:00:00.000Z" }
 *         toDate: { type: string, format: date-time, example: "2026-04-22T00:00:00.000Z" }
 *         reason: { type: string, example: "High fever and doctor-advised rest." }
 *         status: { type: string, enum: [Pending, Approved, Rejected], example: Pending }
 *         supportingDocument: { type: string, nullable: true, example: "https://cdn.trimsel.com/docs/medical-note.pdf" }
 *         reviewedBy: { type: string, nullable: true, example: "664a1f3e2b4c5d6e7f8a9b0f" }
 *         reviewedAt: { type: string, format: date-time, nullable: true, example: "2026-04-20T09:15:00.000Z" }
 *         createdAt: { type: string, format: date-time, example: "2026-04-19T12:00:00.000Z" }
 *         updatedAt: { type: string, format: date-time, example: "2026-04-20T09:15:00.000Z" }
 *
 *     CreateLeaveRequest:
 *       type: object
 *       required: [employeeName, leaveType, fromDate, toDate, reason]
 *       properties:
 *         employeeName: { type: string, maxLength: 150, example: "John Doe" }
 *         leaveType: { type: string, maxLength: 100, example: "Sick Leave" }
 *         fromDate: { type: string, format: date, example: "2026-04-21" }
 *         toDate: { type: string, format: date, example: "2026-04-22" }
 *         reason: { type: string, maxLength: 1000, example: "High fever and doctor-advised rest." }
 *         supportingDocument: { type: string, nullable: true, example: "https://cdn.trimsel.com/docs/medical-note.pdf" }
 *
 *     UpdateLeaveStatusRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status: { type: string, enum: [Approved, Rejected], example: Approved }
 */

/**
 * @swagger
 * /leaves:
 *   post:
 *     summary: Submit a leave request
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateLeaveRequest' }
 *     responses:
 *       201:
 *         description: Leave request submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Leave request submitted" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     leave: { $ref: '#/components/schemas/Leave' }
 *       400:
 *         description: Validation failed or invalid date range
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validate(createLeaveSchema), leaveController.create)

/**
 * @swagger
 * /leaves:
 *   get:
 *     summary: List leave requests
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Optional status filter
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Optional employee ID filter (admin/HR roles only)
 *     responses:
 *       200:
 *         description: Leave requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Leave requests retrieved" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     leaves:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Leave' }
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, leaveController.list)

/**
 * @swagger
 * /leaves/{id}/status:
 *   patch:
 *     summary: Approve or reject a leave request
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateLeaveStatusRequest' }
 *     responses:
 *       200:
 *         description: Leave request status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Leave request status updated" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     leave: { $ref: '#/components/schemas/Leave' }
 *       400:
 *         description: Invalid request body or leave ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin/HR permissions)
 *       404:
 *         description: Leave request not found
 */
router.patch('/:id/status', authenticate, authorize('org_admin', 'hr_admin', 'admin'), validate(updateLeaveStatusSchema), leaveController.updateStatus)

export default router
