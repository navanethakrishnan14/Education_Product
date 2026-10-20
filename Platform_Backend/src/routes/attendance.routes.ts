import { Router } from 'express'
import { attendanceController } from '../controllers/attendance.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { checkInSchema, checkOutSchema } from '../validators/attendance.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Employee attendance check-in, check-out, and history
 */

/**
 * @swagger
 * /attendance/check-in:
 *   post:
 *     summary: Check in for the day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, premises]
 *             properties:
 *               latitude: { type: number, example: 12.9716 }
 *               longitude: { type: number, example: 77.5946 }
 *               premises: { type: string, example: Office }
 *     responses:
 *       201:
 *         description: Checked in successfully
 *       400:
 *         description: Already checked in or validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee or organization not found
 */
router.post('/check-in', authenticate, validate(checkInSchema), attendanceController.checkIn)

/**
 * @swagger
 * /attendance/check-out:
 *   post:
 *     summary: Check out for the day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, premises]
 *             properties:
 *               latitude: { type: number, example: 12.9716 }
 *               longitude: { type: number, example: 77.5946 }
 *               premises: { type: string, example: Office }
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active check-in found
 */
router.post('/check-out', authenticate, validate(checkOutSchema), attendanceController.checkOut)

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get attendance records for an employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional date to filter attendance records
 *     responses:
 *       200:
 *         description: Attendance records retrieved successfully. Only records through the current day are returned; future dates return an empty list. Records without a check-in are returned with status absent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           status: { type: string, enum: [present, absent] }
 *                           checkInTime: { type: string, format: date-time, nullable: true }
 *                           checkInLocation: { type: object, nullable: true }
 *                           checkInPremises: { type: string, nullable: true }
 *                           checkOutTime: { type: string, format: date-time, nullable: true }
 *                           checkOutLocation: { type: object, nullable: true }
 *                           checkOutPremises: { type: string, nullable: true }
 *                           date: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, attendanceController.getAttendance)

export default router