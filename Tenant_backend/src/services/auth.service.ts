import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';

const schema = z.object({
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

export async function login(req: Request, res: Response): Promise<Response> {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Enter a valid email, password, role, and school tenant UUID.',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('replace_with_')) {
    console.error('Login unavailable: JWT_SECRET is missing or is still the example value.');
    return res.status(503).json({
      success: false,
      message: 'Tenant login is not configured. Set JWT_SECRET to a private random value of at least 32 characters in Tenant_backend/.env, then restart the backend.',
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
        message: 'Tenant database schema is missing. Stop the backend and run: npm run db:init, then npm run seed.',
      });
    }
    if (pgError.code === 'ECONNREFUSED' || pgError.code === 'ENOTFOUND' || pgError.code === '28P01' || pgError.code === '3D000') {
      return res.status(503).json({
        success: false,
        message: 'Tenant PostgreSQL is unavailable or misconfigured. Check DATABASE_URL, database name, username, password, and that PostgreSQL is running.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Tenant login failed because of a server/database error. Check the Tenant_backend terminal for the detailed error.',
    });
  }
}
