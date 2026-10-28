import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool';
import { login, me } from '../services/auth.service';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.get('/me', me);


const passwordSetupSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i), password: z.string().min(8).max(128) });
authRouter.post('/set-password', async (req, res) => {
  const parsed = passwordSetupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Provide a valid setup token and a password of at least 8 characters.' });
  const normalizedToken = parsed.data.token.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(normalizedToken, 'utf8').digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invite = await client.query(`SELECT i.id, i.user_id, i.tenant_id
      FROM tenant_user_invites i JOIN tenant_users u ON u.id = i.user_id AND u.tenant_id = i.tenant_id
      WHERE LOWER(i.token_hash) = $1 AND i.used_at IS NULL AND i.expires_at > NOW()
      AND u.password_hash = 'PENDING_PASSWORD_SETUP' AND u.is_active = TRUE FOR UPDATE OF i`, [tokenHash]);
    if (!invite.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This password setup link is invalid, expired, or already used. Ask Management to send a new invitation.' });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await client.query('UPDATE tenant_users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3', [passwordHash, invite.rows[0].user_id, invite.rows[0].tenant_id]);
    await client.query('UPDATE tenant_user_invites SET used_at = NOW() WHERE id = $1', [invite.rows[0].id]);
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Password set successfully. You can now sign in.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Password setup failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, message: 'Unable to set the password. Please try again.' });
  } finally { client.release(); }
});
