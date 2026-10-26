import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { getJwtSecret } from '../config/jwt';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['MANAGEMENT', 'FACULTY', 'PARENT', 'STUDENT']),
  tenantId: z.string().uuid(),
});

type TenantUser = {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
};

type TokenClaims = jwt.JwtPayload & {
  sub: string;
  tenantId: string;
  role: 'MANAGEMENT' | 'FACULTY' | 'PARENT' | 'STUDENT';
};

const tokenOptions: jwt.VerifyOptions = {
  issuer: 'edusphere-tenant-api',
  audience: 'edusphere-tenant-portal',
};

function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] || null;
}

export async function login(req: Request, res: Response): Promise<Response> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email, password, role, and school tenant UUID.',
    });
  }

  const secret = getJwtSecret();
  if (!secret) {
    console.error('Tenant login unavailable: set a private JWT_SECRET of at least 32 characters in production.');
    return res.status(503).json({
      success: false,
      message: 'Tenant login is not configured. Contact your system administrator.',
    });
  }

  const { email, password, role, tenantId } = parsed.data;
  try {
    const result = await pool.query<TenantUser>(
      `SELECT id, tenant_id, full_name, email, password_hash, role
       FROM tenant_users
       WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)
         AND role = $3 AND is_active = TRUE
       LIMIT 1`,
      [tenantId, email, role],
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password, role, or tenant ID.' });
    }

    const token = jwt.sign(
      { sub: user.id, tenantId: user.tenant_id, role: user.role },
      secret,
      {
        expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'],
        issuer: 'edusphere-tenant-api',
        audience: 'edusphere-tenant-portal',
      },
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    console.error('Tenant login database failure:', pgError.code || '', pgError.message || error);

    if (pgError.code === '42P01') {
      return res.status(503).json({
        success: false,
        message: 'Tenant database schema is missing. Run the documented Tenant database initialization after backing up any existing data.',
      });
    }
    if (['ECONNREFUSED', 'ENOTFOUND', '28P01', '3D000'].includes(pgError.code || '')) {
      return res.status(503).json({
        success: false,
        message: 'Tenant PostgreSQL is unavailable or misconfigured. Check DATABASE_URL and database availability.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Tenant login failed because of a server/database error.',
    });
  }
}

/**
 * Revalidates a tenant session against the database instead of trusting the
 * cached user object in the browser. This endpoint validates tenant_users
 * membership and account status. Tenant lifecycle validation must be added
 * when the Platform tenant registry is connected to this database.
 */
export async function me(req: Request, res: Response): Promise<Response> {
  const secret = getJwtSecret();
  const token = readBearerToken(req);
  if (!secret || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let claims: TokenClaims;
  try {
    const decoded = jwt.verify(token, secret, tokenOptions);
    if (typeof decoded === 'string') {
      return res.status(401).json({ success: false, message: 'Session is invalid. Please sign in again.' });
    }
    const payload = decoded as jwt.JwtPayload;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      !['MANAGEMENT', 'FACULTY', 'PARENT', 'STUDENT'].includes(String(payload.role))
    ) {
      return res.status(401).json({ success: false, message: 'Session is invalid. Please sign in again.' });
    }
    claims = payload as TokenClaims;
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired or invalid. Please sign in again.' });
  }

  try {
    const result = await pool.query<TenantUser>(
      `SELECT id, tenant_id, full_name, email, password_hash, role
       FROM tenant_users
       WHERE id::text = $1 AND tenant_id = $2 AND role = $3 AND is_active = TRUE
       LIMIT 1`,
      [claims.sub, claims.tenantId, claims.role],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'This account is no longer active. Please contact your institution administrator.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    console.error('Tenant session validation failed:', pgError.code || '', pgError.message || error);
    return res.status(503).json({ success: false, message: 'Unable to validate your session right now. Please try again.' });
  }
}
