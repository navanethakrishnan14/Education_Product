import { Request, Response } from 'express'
import { authService } from '../services/auth.service'
import { sendSuccess } from '../utils/apiResponse'

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.register(req.body)
    sendSuccess(res, 201, 'Account created successfully', {
      user: user.toPublic(),
      ...tokens,
    })
  },

  async login(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.loginForAudience(req.body, 'platform')
    sendSuccess(res, 200, 'Login successful', {
      user: user.toPublic(),
      ...tokens,
    })
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await authService.refreshForAudience(req.body.refreshToken, 'platform')
    sendSuccess(res, 200, 'Tokens refreshed', tokens)
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.user!.userId)
    sendSuccess(res, 200, 'Logged out successfully')
  },

  async me(req: Request, res: Response): Promise<void> {
    sendSuccess(res, 200, 'Current user', req.user)
  },
}
