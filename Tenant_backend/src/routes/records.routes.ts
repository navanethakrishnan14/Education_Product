import { Router } from 'express';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
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
  profilePhoto: z.string().max(2_850_000).default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

async function sendPasswordSetupEmail(to: string, name: string, setupUrl: string): Promise<void> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || user;
  if (!user || !pass || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP is not configured. Set SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL (optional if it matches SMTP_USER).');
  }
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.sendMail({
    from: { name: 'School Portal', address: from },
    to,
    subject: 'Set up your school portal password',
    text: `Welcome, ${name}. Your school account has been created. Set your password using this link (expires in 60 minutes and can be used once): ${setupUrl}\n\nIf you did not expect this email, you can ignore it.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px;margin:auto"><h2>Welcome, ${escapeHtml(name)}</h2><p>Your school account has been created. Use the secure button below to set your own password.</p><p><a href="${setupUrl}" style="display:inline-block;padding:12px 20px;background:#4c1d95;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Set my password</a></p><p>This link expires in 60 minutes and can be used only once. If you did not expect this email, ignore it.</p></div>`,
  });
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

recordsRouter.post('/accounts', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') return res.status(403).json({ success: false, message: 'Only Management can create faculty and staff accounts.' });
  const parsed = staffAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    console.error('Staff validation failed:', errors);
    return res.status(400).json({
      success: false,
      message: 'Check all required staff details.',
      errors,
    });
  }
  const data = parsed.data;
  const frontendBase = (process.env.TENANT_FRONTEND_URL || process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '')).trim().replace(/\/$/, '');
  if (!getJwtSecret() || !frontendBase || !process.env.SMTP_USER || !process.env.SMTP_PASS || !(process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER)) {
    return res.status(503).json({ success: false, message: 'Password setup email is not configured. Set JWT_SECRET, TENANT_FRONTEND_URL, SMTP_USER, and SMTP_PASS.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query(
      'INSERT INTO tenant_users (tenant_id, full_name, email, password_hash, role, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text, full_name, email, role',
      [req.tenantClaims!.tenantId, data.name, data.email.toLowerCase(), 'PENDING_PASSWORD_SETUP', data.role, data.status === 'Active'],
    );
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await client.query("INSERT INTO tenant_user_invites (user_id, tenant_id, token_hash, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL '60 minutes')", [account.rows[0].id, req.tenantClaims!.tenantId, tokenHash]);
    const notes = JSON.stringify({
      staffType: data.role, joiningDate: data.joiningDate, dateOfBirth: data.dob || '',
      gender: data.gender, qualification: data.qualification, experience: data.experience,
      employmentType: data.employmentType, subject: data.subject, phone: data.phone,
      emergencyContact: data.emergencyContact, address: data.address, bloodGroup: data.bloodGroup,
      maritalStatus: data.maritalStatus, profilePhoto: data.profilePhoto,
    });
    const record = await client.query(
      'INSERT INTO tenant_records (tenant_id, created_by, module_key, name, email, category, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text, module_key, name, email, category, status, notes, updated_at',
      [req.tenantClaims!.tenantId, req.tenantClaims!.platformManagement ? null : req.tenantClaims!.sub, 'Faculty & Staff', data.name, data.email.toLowerCase(), data.designation + ' · ' + data.department, data.status, notes],
    );
    await sendPasswordSetupEmail(data.email.toLowerCase(), data.name, frontendBase + '/set-password?token=' + token);
    await client.query('COMMIT');
    return res.status(201).json({ success: true, emailSent: true, account: { id: account.rows[0].id, name: account.rows[0].full_name, email: account.rows[0].email, role: account.rows[0].role }, record: toRecord(record.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') return res.status(409).json({ success: false, message: 'An account with this email and role already exists for this school.' });
    console.error('Faculty/staff account creation failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error && (error.message.includes('email') || error.message.includes('Email'))) return res.status(503).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to create the faculty/staff account or send its setup email.' });
  } finally { client.release(); }
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
  const client = await pool.connect();
  try {
    const { module, name, email, category, status, notes } = parsed.data;
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT email FROM tenant_records WHERE id=$1 AND tenant_id=$2 AND module_key=$3 FOR UPDATE',
      [req.params.id, req.tenantClaims!.tenantId, module],
    );
    if (!existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    const previousEmail = String(existing.rows[0].email || '').toLowerCase();
    const nextEmail = email.trim().toLowerCase();
    const result = await client.query(
      'UPDATE tenant_records SET name=$1, email=$2, category=$3, status=$4, notes=$5, updated_at=NOW() WHERE id=$6 AND tenant_id=$7 AND module_key=$8 RETURNING id::text, module_key, name, email, category, status, notes, updated_at',
      [name, nextEmail, category, status, notes, req.params.id, req.tenantClaims!.tenantId, module],
    );
    if (module === 'Faculty & Staff' && previousEmail) {
      const staffDetails = (() => {
        try { return JSON.parse(notes || '{}') as Record<string, unknown>; }
        catch { return {}; }
      })();
      const nextRole = staffDetails.staffType === 'STAFF' ? 'STAFF' : 'FACULTY';
      const currentUser = await client.query(
        'SELECT id::text, role FROM tenant_users WHERE tenant_id=$1 AND LOWER(email)=LOWER($2) AND role IN (\'FACULTY\',\'STAFF\') LIMIT 1 FOR UPDATE',
        [req.tenantClaims!.tenantId, previousEmail],
      );
      if (currentUser.rowCount) {
        // Keep the existing portal account when its email or faculty/staff subtype is edited.
        const accountId = String(currentUser.rows[0].id);
        const existingRole = String(currentUser.rows[0].role);
        await client.query(
          'UPDATE tenant_users SET full_name=$1, email=$2, role=$3, is_active=$4 WHERE id=$5 AND tenant_id=$6',
          [name, nextEmail, nextRole || existingRole, status === 'Active', accountId, req.tenantClaims!.tenantId],
        );
      }
    }
    await client.query('COMMIT');
    return res.json({ success: true, record: toRecord(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string };
    if (pgError.code === '23505') return res.status(409).json({ success: false, message: 'An account with this email already exists for this school.' });
    console.error('Tenant record update failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to update this record.' });
  } finally { client.release(); }
});
recordsRouter.delete('/:id', async (req, res) => {
  if (req.tenantClaims!.role !== 'MANAGEMENT') return res.status(403).json({ success: false, message: 'Only Management can delete tenant records.' });
  const moduleKey = String(req.query.module || '').trim();
  if (!moduleKey) return res.status(400).json({ success: false, message: 'A module query is required.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT email FROM tenant_records WHERE id=$1 AND tenant_id=$2 AND module_key=$3 FOR UPDATE',
      [req.params.id, req.tenantClaims!.tenantId, moduleKey],
    );
    if (!existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    if (moduleKey === 'Faculty & Staff') {
      const email = String(existing.rows[0].email || '').toLowerCase();
      if (email) {
        const users = await client.query(
          'SELECT id FROM tenant_users WHERE tenant_id=$1 AND LOWER(email)=LOWER($2) AND role IN (\'FACULTY\',\'STAFF\')',
          [req.tenantClaims!.tenantId, email],
        );
        if (users.rowCount) {
          await client.query('DELETE FROM tenant_user_invites WHERE tenant_id=$1 AND user_id::text = ANY($2::text[])', [req.tenantClaims!.tenantId, users.rows.map((row: {id:string})=>String(row.id))]);
          await client.query('DELETE FROM tenant_users WHERE tenant_id=$1 AND id::text = ANY($2::text[])', [req.tenantClaims!.tenantId, users.rows.map((row: {id:string})=>String(row.id))]);
        }
      }
    }
    await client.query('DELETE FROM tenant_records WHERE id=$1 AND tenant_id=$2 AND module_key=$3', [req.params.id, req.tenantClaims!.tenantId, moduleKey]);
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Tenant record delete failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete this record.' });
  } finally { client.release(); }
});
