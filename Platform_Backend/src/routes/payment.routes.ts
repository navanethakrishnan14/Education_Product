import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { paymentController } from '../controllers/payment.controller'

const router = Router()

// Authentication middleware: Verify internal service token from Org backend
const verifyPaymentAuth = (req: Request, res: Response, next: NextFunction) => {
  console.log('[Payment Auth] ✓ Checking authentication for', req.method, req.path)
  
  // Check for internal service token (used by Org backend)
  const internalToken = req.headers['x-internal-auth']
  const expectedInternalToken = process.env.INTERNAL_AUTH_TOKEN || 'internal-service-token'
  
  if (internalToken === expectedInternalToken) {
    console.log('[Payment Auth] ✅ Valid X-Internal-Auth token from internal service')
    // Set a minimal user context for service layer authorization checks
    req.user = { aud: 'organization', role: 'internal-service' } as any
    next()
    return
  }
  
  // If no valid internal token, reject the request
  console.warn('[Payment Auth] ❌ Invalid or missing X-Internal-Auth token')
  console.warn('[Payment Auth] Expected:', expectedInternalToken?.substring(0, 20) + '...')
  console.warn('[Payment Auth] Received:', internalToken?.toString().substring(0, 20) + '...')
  
  res.status(401).json({ 
    success: false, 
    message: 'Authentication required - Invalid or missing X-Internal-Auth header' 
  })
}

router.post('/create-order', verifyPaymentAuth, paymentController.createOrder)
router.post('/verify', verifyPaymentAuth, paymentController.verifyPayment)
router.post('/webhook/razorpay', paymentController.webhook)

export default router
