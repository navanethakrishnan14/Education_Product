import { Request, Response } from 'express'
import { userService } from '../services/user.service'
import { sendSuccess } from '../utils/apiResponse'

export const userController = {
  // ── Self ───────────────────────────────────────────────────────────
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await userService.getById(req.user!.userId)
    sendSuccess(res, 200, 'Profile retrieved', user.toPublic())
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await userService.updateProfile(req.user!.userId, req.body)
    sendSuccess(res, 200, 'Profile updated', user.toPublic())
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    await userService.changePassword(req.user!.userId, req.body)
    sendSuccess(res, 200, 'Password changed successfully')
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    await userService.deleteAccount(req.user!.userId)
    sendSuccess(res, 200, 'Account deleted')
  },

  // ── Admin ──────────────────────────────────────────────────────────
  async listUsers(req: Request, res: Response): Promise<void> {
    const result = await userService.listUsers(req.query as never)
    const { data, ...pagination } = result
    sendSuccess(res, 200, 'Users retrieved', data, pagination)
  },

  async adminGetUser(req: Request, res: Response): Promise<void> {
    const user = await userService.adminGetUser(req.params.id)
    sendSuccess(res, 200, 'User retrieved', user.toPublic())
  },

  async adminUpdateUser(req: Request, res: Response): Promise<void> {
    const user = await userService.adminUpdateUser(req.params.id, req.body)
    sendSuccess(res, 200, 'User updated', user.toPublic())
  },

  async adminDeleteUser(req: Request, res: Response): Promise<void> {
    await userService.adminDeleteUser(req.params.id)
    sendSuccess(res, 200, 'User deleted')
  },
}
