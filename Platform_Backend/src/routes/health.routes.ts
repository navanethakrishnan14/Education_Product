import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Service health checks
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number }
 *                 db:
 *                   type: string
 *                   enum: [connected, disconnected]
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

export default router
