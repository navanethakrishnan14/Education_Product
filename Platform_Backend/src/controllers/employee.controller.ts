import { Request, Response } from 'express'
import { employeeService } from '../services/employee.service'
import { sendSuccess } from '../utils/apiResponse'

export const employeeController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = {
      ...req.body,
      organizationId: req.user!.organizationId || req.body.organizationId
    }
    const result = await employeeService.registerEmployee(input)
    sendSuccess(res, 201, 'Employee registered successfully', {
      employee: result.employee.toPublic(),
      ...(result.temporaryPassword ? { temporaryPassword: result.temporaryPassword } : {}),
    })
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = {
      ...req.query,
      organizationId: req.user!.organizationId
    }
    const result = await employeeService.listEmployees(query as any)
    const { data, ...pagination } = result
    sendSuccess(res, 200, 'Employees retrieved', data.map((employee) => employee.toPublic()), pagination)
  },

  async delete(req: Request, res: Response): Promise<void> {
    // Ensure employee belongs to user's organization
    const employee = await employeeService.getEmployeeById(req.params.id)
    if (employee.organizationId.toString() !== req.user!.organizationId) {
      throw new Error('Access denied')
    }
    await employeeService.deleteEmployee(req.params.id)
    sendSuccess(res, 200, 'Employee deleted')
  },
}

