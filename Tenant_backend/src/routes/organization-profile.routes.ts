import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { getJwtSecret } from '../config/jwt';

export const organizationProfileRouter = Router();
type Claims = jwt.JwtPayload & { sub: string; tenantId: string; role: string; platformManagement?: boolean };
declare global { namespace Express { interface Request { organizationClaims?: Claims } } }
const options: jwt.VerifyOptions = { issuer: 'edusphere-tenant-api', audience: 'edusphere-tenant-portal' };
const profileSchema = z.object({
  organizationType: z.enum(['School', 'College', 'Institution']),
  profile: z.record(z.string(), z.string().max(5000)).refine((value) => Object.keys(value).length <= 100, 'Too many profile fields'),
});
async function authenticateManagement(req: Request, res: Response, next: NextFunction) {
  const token = /^Bearer\s+(.+)$/i.exec(req.header('authorization') || '')?.[1];
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });
  let claims: Claims | null = null;
  const tenantSecret = getJwtSecret();
  const platformSecret = process.env.PLATFORM_JWT_SECRET;
  if (tenantSecret) {
    try { const decoded = jwt.verify(token, tenantSecret, options); if (typeof decoded !== 'string' && typeof decoded.sub === 'string' && typeof decoded.tenantId === 'string') claims = decoded as Claims; } catch { /* Try platform token. */ }
  }
  if (!claims && platformSecret) {
    try { const decoded = jwt.verify(token, platformSecret); if (typeof decoded !== 'string' && typeof decoded.sub === 'string' && typeof decoded.tenantId === 'string' && decoded.role === 'MANAGEMENT') claims = { ...decoded, platformManagement: true } as Claims; } catch { /* Invalid token. */ }
  }
  if (!claims || claims.role !== 'MANAGEMENT' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.tenantId)) return res.status(401).json({ success: false, message: 'A valid Management session is required.' });
  if (!claims.platformManagement) {
    try {
      const active = await pool.query('SELECT 1 FROM tenant_users WHERE id::text = $1 AND tenant_id = $2 AND role = $3 AND is_active = TRUE LIMIT 1', [claims.sub, claims.tenantId, claims.role]);
      if (!active.rowCount) return res.status(401).json({ success: false, message: 'Management account is no longer active.' });
    } catch { return res.status(503).json({ success: false, message: 'Unable to validate the account against the database.' }); }
  }
  req.organizationClaims = claims;
  return next();
}
organizationProfileRouter.use(authenticateManagement);
organizationProfileRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT organization_type, profile, updated_at FROM tenant_organization_profiles WHERE tenant_id = $1 LIMIT 1', [req.organizationClaims!.tenantId]);
    if (!result.rowCount) return res.json({ success: true, profile: null });
    return res.json({ success: true, profile: { organizationType: result.rows[0].organization_type, ...result.rows[0].profile }, updatedAt: result.rows[0].updated_at });
  } catch (error) { console.error('Organization profile fetch failed:', error); return res.status(500).json({ success: false, message: 'Unable to load the organization profile.' }); }
});
organizationProfileRouter.put('/', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid organization profile details.' });
  try {
    const { organizationType, profile } = parsed.data;
    const result = await pool.query(`INSERT INTO tenant_organization_profiles (tenant_id, organization_type, profile, updated_at) VALUES ($1, $2, $3::jsonb, NOW()) ON CONFLICT (tenant_id) DO UPDATE SET organization_type = EXCLUDED.organization_type, profile = EXCLUDED.profile, updated_at = NOW() RETURNING organization_type, profile, updated_at`, [req.organizationClaims!.tenantId, organizationType, JSON.stringify(profile)]);
    return res.json({ success: true, message: 'Organization profile saved.', profile: { organizationType: result.rows[0].organization_type, ...result.rows[0].profile }, updatedAt: result.rows[0].updated_at });
  } catch (error) { console.error('Organization profile save failed:', error); return res.status(500).json({ success: false, message: 'Unable to save the organization profile.' }); }
});
