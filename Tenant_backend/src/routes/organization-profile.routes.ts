import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { getJwtSecret } from '../config/jwt';

export const organizationProfileRouter = Router();

type Claims = jwt.JwtPayload & { sub: string; tenantId: string; role: string; tenantType?: string; platformManagement?: boolean };
declare global { namespace Express { interface Request { organizationClaims?: Claims } } }

const tenantTypes = ['School', 'College', 'Institution'] as const;
type TenantType = typeof tenantTypes[number];
const options: jwt.VerifyOptions = { issuer: 'edusphere-tenant-api', audience: 'edusphere-tenant-portal' };
const profileSchema = z.object({
  organizationType: z.enum(tenantTypes),
  profile: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/), z.string().max(1_500_000)).refine(value => Object.keys(value).length <= 100, 'Too many profile fields'),
});

function normalizedTenantType(value: unknown): TenantType | null {
  if (typeof value !== 'string') return null;
  const lower = value.trim().toLowerCase();
  if (lower === 'school') return 'School';
  if (lower === 'college') return 'College';
  if (lower === 'institution') return 'Institution';
  return null;
}

async function resolvePlatformTenant(tenantId: string): Promise<{ tenantType: TenantType; status: string } | null> {
  // Platform and Tenant use separate databases. If PLATFORM_DATABASE_URL is configured,
  // read the canonical registration/type/status from Platform's registry. Do not copy
  // the Platform database URL into DATABASE_URL or write profile data to Platform tables.
  const platformUrl = process.env.PLATFORM_DATABASE_URL?.trim();
  if (!platformUrl) return null;
  const { Pool } = await import('pg');
  const platformPool = new Pool({
    connectionString: platformUrl,
    ssl: process.env.PLATFORM_DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
  try {
    const result = await platformPool.query(
      'SELECT tenant_type, status FROM edusphere_platform.school_tenants WHERE id = $1 LIMIT 1',
      [tenantId],
    );
    const row = result.rows[0] as { tenant_type?: string; status?: string } | undefined;
    const tenantType = normalizedTenantType(row?.tenant_type);
    if (!row || !tenantType) return null;
    return { tenantType, status: String(row.status || '') };
  } finally {
    await platformPool.end();
  }
}

async function authenticateManagement(req: Request, res: Response, next: NextFunction) {
  const token = /^Bearer\s+(.+)$/i.exec(req.header('authorization') || '')?.[1];
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });

  let claims: Claims | null = null;
  const tenantSecret = getJwtSecret();
  if (tenantSecret) {
    try {
      const decoded = jwt.verify(token, tenantSecret, options);
      if (typeof decoded !== 'string') {
        const payload = decoded as jwt.JwtPayload;
        if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string') claims = payload as Claims;
      }
    } catch { /* The token may have been issued by Platform_Backend. */ }
  }

  const configuredPlatformSecrets = [process.env.PLATFORM_JWT_SECRET?.trim(), process.env.JWT_SECRET?.trim()];
  const platformSecrets = [...new Set(configuredPlatformSecrets.filter((value): value is string => Boolean(value && value.length >= 32 && !/^replace[-_]with[-_]/i.test(value))))];
  if (!claims) {
    for (const secret of platformSecrets) {
      try {
        const decoded = jwt.verify(token, secret);
        if (typeof decoded !== 'string') {
          const payload = decoded as jwt.JwtPayload;
          if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string' && payload.role === 'MANAGEMENT') {
            claims = { ...payload, platformManagement: true } as Claims;
            break;
          }
        }
      } catch { /* Try the next configured secret. */ }
    }
  }

  if (!claims || claims.role !== 'MANAGEMENT' || !claims.tenantId.trim() || claims.tenantId.length > 128) {
    const hasPlatformSecret = Boolean(process.env.PLATFORM_JWT_SECRET?.trim() && process.env.PLATFORM_JWT_SECRET.trim().length >= 32 && !/^replace[-_]with[-_]/i.test(process.env.PLATFORM_JWT_SECRET.trim()));
    return res.status(401).json({
      success: false,
      message: 'A valid Management session is required.',
      code: hasPlatformSecret ? 'MANAGEMENT_TOKEN_INVALID' : 'PLATFORM_JWT_SECRET_MISSING',
      hint: hasPlatformSecret
        ? 'Sign out and sign in again. Confirm Tenant_backend PLATFORM_JWT_SECRET exactly matches Platform_Backend JWT_SECRET.'
        : 'Set Tenant_backend PLATFORM_JWT_SECRET to Platform_Backend JWT_SECRET, then restart Tenant_backend and sign in again.',
    });
  }

  if (!claims.platformManagement) {
    try {
      const active = await pool.query(
        'SELECT 1 FROM tenant_users WHERE id::text = $1 AND tenant_id = $2 AND role = $3 AND is_active = TRUE LIMIT 1',
        [claims.sub, claims.tenantId, claims.role],
      );
      if (!active.rowCount) return res.status(401).json({ success: false, message: 'Management account is no longer active.' });
    } catch {
      return res.status(503).json({ success: false, message: 'Unable to validate the account against the database.' });
    }
  }

  if (claims.platformManagement && process.env.PLATFORM_DATABASE_URL?.trim()) {
    try {
      const canonicalTenant = await resolvePlatformTenant(claims.tenantId);
      if (!canonicalTenant) return res.status(403).json({ success: false, message: 'This organization could not be found in the Platform tenant registry.' });
      if (canonicalTenant.status.toLowerCase() !== 'active') {
        return res.status(403).json({ success: false, message: 'This organization is not active. Contact your Platform Administrator.' });
      }
      claims.tenantType = canonicalTenant.tenantType;
    } catch (error) {
      console.error('Platform tenant registry lookup failed:', error instanceof Error ? error.message : error);
      return res.status(503).json({ success: false, message: 'Unable to verify the organization status. Check PLATFORM_DATABASE_URL and try again.' });
    }
  }

  const tokenTenantType = normalizedTenantType(claims.tenantType);
  if (claims.platformManagement && !tokenTenantType) {
    return res.status(403).json({ success: false, message: 'The Management session does not contain a valid tenant type. Ensure the Platform tenant is registered as school, college or institution, then sign in again.' });
  }

  req.organizationClaims = claims;
  return next();
}

organizationProfileRouter.use(authenticateManagement);

organizationProfileRouter.get('/', async (req, res) => {
  const claims = req.organizationClaims!;
  const tenantType = normalizedTenantType(claims.tenantType);
  try {
    const result = await pool.query(
      'SELECT organization_type, profile, updated_at FROM tenant_organization_profiles WHERE tenant_id = $1 LIMIT 1',
      [claims.tenantId],
    );
    if (!result.rowCount) return res.json({ success: true, profile: null, updatedAt: null, organizationType: tenantType });

    const storedType = normalizedTenantType(result.rows[0].organization_type);
    if (tenantType && storedType && tenantType !== storedType) {
      return res.status(409).json({
        success: false,
        code: 'ORGANIZATION_TYPE_MISMATCH',
        message: 'The saved profile type does not match this tenant. No data was changed; contact your platform administrator to correct the tenant classification.',
      });
    }
    return res.json({
      success: true,
      organizationType: storedType || tenantType,
      profile: { ...result.rows[0].profile, organizationType: storedType || tenantType },
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    const pgError = error as { code?: string };
    console.error('Organization profile fetch failed:', error);
    if (pgError.code === '42P01') return res.status(503).json({ success: false, code: 'PROFILE_SCHEMA_MISSING', message: 'The Tenant profile table is missing. Back up the Tenant database, then run npm run db:init from Tenant_backend.' });
    return res.status(500).json({ success: false, message: 'Unable to load the organization profile.' });
  }
});

organizationProfileRouter.put('/', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid organization profile details.', errors: parsed.error.flatten().fieldErrors });

  const claims = req.organizationClaims!;
  const signedType = normalizedTenantType(claims.tenantType);
  const { organizationType } = parsed.data;
  if (signedType && organizationType !== signedType) {
    return res.status(403).json({
      success: false,
      code: 'ORGANIZATION_TYPE_MISMATCH',
      message: 'The selected profile type does not match this tenant’s registered type. Your changes were not saved.',
    });
  }

  try {
    const profile = Object.fromEntries(Object.entries(parsed.data.profile).map(([key, value]) => [key, value.trim()])) as Record<string, string>;
    delete profile.organizationType;
    const logo = profile.logoUrl;
    if (logo && logo.startsWith('data:') && !/^data:image\\/(png|jpeg|webp|svg\\+xml);base64,/i.test(logo)) return res.status(400).json({ success: false, message: 'Logo must be a PNG, JPG, WEBP or SVG image.' });
    if (logo && logo.startsWith('data:') && logo.length > 1_400_000) return res.status(413).json({ success: false, message: 'Logo is too large. Please use an image under 1 MB.' });
    const existing = await pool.query(
      'SELECT organization_type FROM tenant_organization_profiles WHERE tenant_id = $1 LIMIT 1',
      [claims.tenantId],
    );
    const storedType = existing.rowCount ? normalizedTenantType(existing.rows[0].organization_type) : null;
    if (storedType && storedType !== organizationType) {
      return res.status(409).json({
        success: false,
        code: 'ORGANIZATION_TYPE_MISMATCH',
        message: 'This tenant already has a different profile type. No changes were saved.',
      });
    }

    const safeProfile = { ...profile };
    delete (safeProfile as Record<string, string>).organizationType;
    const result = await pool.query(
      `INSERT INTO tenant_organization_profiles (tenant_id, organization_type, profile, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (tenant_id) DO UPDATE
         SET organization_type = EXCLUDED.organization_type, profile = EXCLUDED.profile, updated_at = NOW()
       RETURNING organization_type, profile, updated_at`,
      [claims.tenantId, organizationType, JSON.stringify(safeProfile)],
    );

    return res.json({
      success: true,
      message: 'Organization profile saved.',
      organizationType: result.rows[0].organization_type,
      profile: { ...result.rows[0].profile, organizationType: result.rows[0].organization_type },
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    const pgError = error as { code?: string };
    console.error('Organization profile save failed:', error);
    if (pgError.code === '42P01') return res.status(503).json({ success: false, code: 'PROFILE_SCHEMA_MISSING', message: 'The Tenant profile table is missing. Back up the Tenant database, then run npm run db:init from Tenant_backend.' });
    return res.status(500).json({ success: false, message: 'Unable to save the organization profile.' });
  }
});
