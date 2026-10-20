import { Router } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import { authService } from '../../services/auth.service'
import { authenticateForAudience, requirePlatformAdmin } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate'
import { loginSchema, refreshTokenSchema } from '../../validators/auth.validator'

const router = Router()

router.post('/login', validate(loginSchema), async (req, res) => {
  const { user, tokens } = await authService.loginForAudience(req.body, 'platform')
  sendSuccess(res, 200, 'Platform login successful', {
    user: user.toPublic(),
    ...tokens,
  })
})

router.post('/refresh', validate(refreshTokenSchema), async (req, res) => {
  const tokens = await authService.refreshForAudience(req.body.refreshToken, 'platform')
  sendSuccess(res, 200, 'Platform tokens refreshed', tokens)
})

router.post('/logout', authenticateForAudience('platform'), requirePlatformAdmin, async (req, res) => {
  await authService.logout(req.user!.userId)
  sendSuccess(res, 200, 'Logged out successfully')
})

router.get('/me', authenticateForAudience('platform'), requirePlatformAdmin, async (req, res) => {
  sendSuccess(res, 200, 'Current user', req.user)
})

export default router
