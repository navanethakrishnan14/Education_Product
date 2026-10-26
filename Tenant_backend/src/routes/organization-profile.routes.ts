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
  // Platform Management sessions are signed by Platform_Backend with its
  // JWT_SECRET and do not include the Tenant API issuer/audience claims.
  // In production, PLATFORM_JWT_SECRET should be set to that same value.
  // JWT_SECRET is also accepted as a compatibility fallback for deployments
  // that intentionally share the signing secret across both services.
  const platformSecrets = [...new Set([process.env.PLATFORM_JWT_SECRET?.trim(), process.env.JWT_SECRET?.trim()].filter((value): value is string => Boolean(value && value.length >= 32 && !value.startsWith('replace_with_'))))];
  if (tenantSecret) {
    try { const decoded = jwt.verify(token, tenantSecret, options); if (typeof decoded !== 'string') { const payload = decoded as jwt.JwtPayload; if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string') claims = payload as Claims; } } catch { /* Try platform token. */ }
  }
  if (!claims) {
    for (const secret of platformSecrets) {
      try {
        const decoded = jwt.verify(token, secret);
        if (typeof decoded !== 'string') {
          const payload = decoded as jwt.JwtPayload;
          if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string' && payload.role === 'MANAGEMENT') {
            claims = { ...payload, platformManagement: true } as Claims;
            if (claims) break;
          }
        }
      } catch { /* Try the next configured platform signing secret. */ }
    }
  }
  // Platform-created tenant IDs are Prisma CUIDs, not UUIDs. Accept the opaque
  // tenant identifier from the signed token; do not impose a UUID-only format.
  if (!claims || claims.role !== 'MANAGEMENT' || !claims.tenantId.trim() || claims.tenantId.length > 128) return res.status(401).json({ success: false, message: 'A valid Management session is required.' });
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
