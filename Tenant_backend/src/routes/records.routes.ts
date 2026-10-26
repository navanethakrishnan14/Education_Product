import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool';
import { getJwtSecret } from '../config/jwt';

export const recordsRouter = Router();
type Claims = jwt.JwtPayload & { sub: string; tenantId: string; role: string; platformManagement?: boolean };
declare global {
  namespace Express {
    interface Request { tenantClaims?: Claims }
  }
}
const recordSchema = z.object({
  module: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  email: z.string().max(254).optional().default(''),
  category: z.string().max(200).optional().default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  notes: z.string().max(5000).optional().default(''),
});
const tokenOptions: jwt.VerifyOptions = { issuer: 'edusphere-tenant-api', audience: 'edusphere-tenant-portal' };

async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = /^Bearer\s+(.+)$/i.exec(req.header('authorization') || '')?.[1];
  const tenantSecret = getJwtSecret();
  const platformSecret = process.env.PLATFORM_JWT_SECRET;
  if (!token || (!tenantSecret && !platformSecret)) return res.status(401).json({ success: false, message: 'Authentication required.' });
  try {
    let claims: Claims | null = null;
    if (tenantSecret) {
      try {
        const decoded = jwt.verify(token, tenantSecret, tokenOptions);
        if (typeof decoded !== 'string' && typeof decoded.sub === 'string' && typeof decoded.tenantId === 'string') claims = decoded as Claims;
      } catch { /* Try the separately configured Platform Management token below. */ }
    }
    if (!claims && platformSecret) {
      try {
        const decoded = jwt.verify(token, platformSecret);
        if (typeof decoded !== 'string' && typeof decoded.sub === 'string' && typeof decoded.tenantId === 'string' && decoded.role === 'MANAGEMENT') {
          claims = { ...(decoded as Claims), platformManagement: true };
        }
      } catch { /* Rejected by both trusted token issuers. */ }
    }
    if (!claims || !['MANAGEMENT','FACULTY','PARENT','STUDENT'].includes(String(claims.role))) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
    }
    if (!claims.platformManagement) {
      const active = await pool.query(
        'SELECT 1 FROM tenant_users WHERE id::text = $1 AND tenant_id = $2 AND role = $3 AND is_active = TRUE LIMIT 1',
        [claims.sub, claims.tenantId, claims.role],
      );
      if (!active.rowCount) return res.status(401).json({ success: false, message: 'Account is no longer active.' });
    }
    req.tenantClaims = claims;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
  }
}
recordsRouter.use(authenticate);

function toRecord(row: { id: string; module_key: string; name: string; email: string; category: string; status: string; notes: string; updated_at: Date }) {
  return { id: row.id, module: row.module_key, name: row.name, email: row.email, category: row.category, status: row.status, notes: row.notes, updatedAt: row.updated_at };
}
recordsRouter.get('/', async (req, res) => {
  const moduleKey = String(req.query.module || '').trim();
  if (!moduleKey || moduleKey.length > 100) return res.status(400).json({ success: false, message: 'A valid module query is required.' });
  try {
    const result = await pool.query(
      'SELECT id::text, module_key, name, email, category, status, notes, updated_at FROM tenant_records WHERE tenant_id = $1 AND module_key = $2 ORDER BY updated_at DESC',
      [req.tenantClaims!.tenantId, moduleKey],
    );
    return res.json({ success: true, records: result.rows.map(toRecord) });
  } catch (error) {
    console.error('Tenant records fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load records from the database.' });
  }
});
recordsRouter.post('/', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') return res.status(403).json({ success: false, message: 'Only Management can create tenant records.' });
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Please provide valid record details.' });
  try {
    const { module, name, email, category, status, notes } = parsed.data;
    const result = await pool.query(
      'INSERT INTO tenant_records (tenant_id, created_by, module_key, name, email, category, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text, module_key, name, email, category, status, notes, updated_at',
      [req.tenantClaims!.tenantId, req.tenantClaims!.platformManagement ? null : req.tenantClaims!.sub, module, name, email, category, status, notes],
    );
    return res.status(201).json({ success: true, record: toRecord(result.rows[0]) });
  } catch (error) {
    console.error('Tenant record create failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save this record to the database.' });
  }
});
recordsRouter.put('/:id', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') return res.status(403).json({ success: false, message: 'Only Management can update tenant records.' });
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Please provide valid record details.' });
  try {
    const { module, name, email, category, status, notes } = parsed.data;
    const result = await pool.query(
      'UPDATE tenant_records SET name=$1, email=$2, category=$3, status=$4, notes=$5, updated_at=NOW() WHERE id=$6 AND tenant_id=$7 AND module_key=$8 RETURNING id::text, module_key, name, email, category, status, notes, updated_at',
      [name, email, category, status, notes, req.params.id, req.tenantClaims!.tenantId, module],
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true, record: toRecord(result.rows[0]) });
  } catch (error) {
    console.error('Tenant record update failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to update this record.' });
  }
});
recordsRouter.delete('/:id', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') return res.status(403).json({ success: false, message: 'Only Management can delete tenant records.' });
  const moduleKey = String(req.query.module || '').trim();
  if (!moduleKey) return res.status(400).json({ success: false, message: 'A module query is required.' });
  try {
    const result = await pool.query(
      'DELETE FROM tenant_records WHERE id=$1 AND tenant_id=$2 AND module_key=$3 RETURNING id',
      [req.params.id, req.tenantClaims!.tenantId, moduleKey],
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Tenant record delete failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete this record.' });
  }
});
