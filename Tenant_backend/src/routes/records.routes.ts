import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
        if (typeof decoded !== 'string') {
          const payload = decoded as jwt.JwtPayload;
          if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string') claims = payload as Claims;
        }
      } catch { /* Try the separately configured Platform Management token below. */ }
    }
    if (!claims && platformSecret) {
      try {
        const decoded = jwt.verify(token, platformSecret);
        if (typeof decoded !== 'string') {
          const payload = decoded as jwt.JwtPayload;
          if (typeof payload.sub === 'string' && typeof payload.tenantId === 'string' && payload.role === 'MANAGEMENT') {
            claims = { ...(payload as Claims), platformManagement: true };
          }
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

const staffAccountSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  role: z.enum(['FACULTY', 'STAFF']),
  password: z.string().min(8).max(128),
  employeeId: z.string().trim().max(80).optional().default(''),
  designation: z.string().trim().min(1).max(160),
  department: z.string().trim().min(1).max(160),
  joiningDate: z.string().min(1).max(30),
  dob: z.string().max(30).nullable().optional(),
  gender: z.string().max(40).default(''),
  qualification: z.string().max(200).default(''),
  experience: z.string().max(30).default(''),
  employmentType: z.string().max(40).default('Full-time'),
  subject: z.string().max(160).default(''),
  phone: z.string().trim().min(5).max(40),
  emergencyContact: z.string().max(40).default(''),
  address: z.string().max(1000).default(''),
  bloodGroup: z.string().max(10).default(''),
  maritalStatus: z.string().max(40).default(''),
  // Image data is limited by the UI to JPG/PNG files of 2 MB or less.
  profilePhoto: z.string().max(2_850_000).default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});
recordsRouter.post('/accounts', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') {
    return res.status(403).json({ success: false, message: 'Only Management can create faculty and staff accounts.' });
  }
  const parsed = staffAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Check all required staff details and password requirements.' });
  const data = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(data.password, 12);
    // Both teaching and non-teaching staff use the supported FACULTY portal role.
    const account = await client.query(
      'INSERT INTO tenant_users (tenant_id, full_name, email, password_hash, role, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text, full_name, email, role',
      [req.tenantClaims!.tenantId, data.name, data.email.toLowerCase(), passwordHash, 'FACULTY', data.status === 'Active'],
    );
    const notes = JSON.stringify({
      employeeId: data.employeeId, staffType: data.role, joiningDate: data.joiningDate,
      dateOfBirth: data.dob || '', gender: data.gender, qualification: data.qualification,
      experience: data.experience, employmentType: data.employmentType, subject: data.subject,
      phone: data.phone, emergencyContact: data.emergencyContact, address: data.address,
      bloodGroup: data.bloodGroup, maritalStatus: data.maritalStatus, profilePhoto: data.profilePhoto,
    });
    const record = await client.query(
      'INSERT INTO tenant_records (tenant_id, created_by, module_key, name, email, category, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text, module_key, name, email, category, status, notes, updated_at',
      [req.tenantClaims!.tenantId, req.tenantClaims!.platformManagement ? null : req.tenantClaims!.sub, 'Faculty & Staff', data.name, data.email.toLowerCase(), data.designation + ' · ' + data.department, data.status, notes],
    );
    await client.query('COMMIT');
    return res.status(201).json({ success: true, account: { id: account.rows[0].id, name: account.rows[0].full_name, email: account.rows[0].email, role: account.rows[0].role }, record: toRecord(record.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') return res.status(409).json({ success: false, message: 'An account with this email and role already exists for this school.' });
    console.error('Faculty/staff account creation failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to create the faculty/staff account.' });
  } finally {
    client.release();
  }
});

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
