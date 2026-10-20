import { Router } from 'express'
import { employeeController } from '../controllers/employee.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { employeeRegisterSchema } from '../validators/employee.validator'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee registration & management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EmployeeRegisterRequest:
 *       type: object
 *       required: [firstName, lastName, email]
 *       properties:
 *         firstName: { type: string, example: John }
 *         lastName: { type: string, example: Doe }
 *         gender: { type: string, enum: [male, female, other], example: male }
 *         dateOfBirth: { type: string, format: date, example: 1998-01-15 }
 *         bloodType: { type: string, enum: [A+, A-, B+, B-, AB+, AB-, O+, O-], example: O+ }
 *         phoneNumber: { type: string, example: "+1 (555) 123-4567" }
 *         address: { type: string, example: "123 Main st, Anytown, USA" }
 *
 *         email: { type: string, format: email, example: john.doe@company.com }
 *         password: { type: string, format: password, example: Secret123, description: "Optional. If omitted, API returns temporaryPassword." }
 *
 *         avatarUrl: { type: string, nullable: true, example: "https://cdn.trimsel.com/avatars/john.png" }
 *         roles:
 *           type: array
 *           items: { type: string }
 *           example: ["UI/UX Designer"]
 *
 *         jobTitle: { type: string, example: "UI/UX Designer" }
 *         department: { type: string, example: Design }
 *         employmentType: { type: string, example: "Full-time" }
 *         workLocation: { type: string, example: Chennai }
 *         joiningDate: { type: string, format: date, example: 2026-03-01 }
 *         workEmail: { type: string, format: email, example: john.doe@company.com }
 *
 *         salaryAmount: { type: number, example: 8000 }
 *         bankName: { type: string, example: "Bank of India" }
 *         accountHolderName: { type: string, example: "John Doe" }
 *         accountNumber: { type: string, example: "1234567890" }
 *         ifscOrRoutingNumber: { type: string, example: "SBIN0001234" }
 *
 *         emergencyName: { type: string, example: Jane }
 *         emergencyRelation: { type: string, example: Spouse }
 *         emergencyPhoneNumber: { type: string, example: "+1 (555) 765-4321" }
 *
 *         reportsToUserId: { type: string, example: 664a1f3e2b4c5d6e7f8a9b0c }
 *
 *         documents:
 *           type: object
 *           properties:
 *             idProof:
 *               type: object
 *               properties:
 *                 name: { type: string, example: "aadhaar_scan.pdf" }
 *                 url: { type: string, example: "https://cdn.trimsel.com/docs/aadhaar_scan.pdf" }
 *                 mimeType: { type: string, example: "application/pdf" }
 *                 sizeBytes: { type: integer, example: 3355443 }
 *             resume:
 *               type: object
 *               properties:
 *                 name: { type: string, example: "resume.pdf" }
 *                 url: { type: string, example: "https://cdn.trimsel.com/docs/resume.pdf" }
 *                 mimeType: { type: string, example: "application/pdf" }
 *                 sizeBytes: { type: integer, example: 1048576 }
 *             appointmentLetterOrContract:
 *               type: object
 *               properties:
 *                 name: { type: string, example: "appointment_letter.pdf" }
 *                 url: { type: string, example: "https://cdn.trimsel.com/docs/appointment_letter.pdf" }
 *                 mimeType: { type: string, example: "application/pdf" }
 *                 sizeBytes: { type: integer, example: 524288 }
 *             certificates:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name: { type: string, example: "certificate.pdf" }
 *                   url: { type: string, example: "https://cdn.trimsel.com/docs/certificate.pdf" }
 *                   mimeType: { type: string, example: "application/pdf" }
 *                   sizeBytes: { type: integer, example: 2097152 }
 */

router.use(authenticate)

/**
 * @swagger
 * /employees/register:
 *   post:
 *     summary: Register a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EmployeeRegisterRequest' }
 *     responses:
 *       201:
 *         description: Employee registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee: { $ref: '#/components/schemas/UserPublic' }
 *                     temporaryPassword:
 *                       type: string
 *                       nullable: true
 *                       description: "Returned only when password is omitted."
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
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', validate(employeeRegisterSchema), employeeController.register)

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email or employee ID
 *     responses:
 *       200:
 *         description: Employee list
 *       401:
 *         description: Unauthorized
 */
router.get('/', employeeController.list)

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */
router.delete('/:id', employeeController.delete)

export default router

