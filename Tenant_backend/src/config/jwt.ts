import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const EXAMPLE_SECRET_PREFIX = 'replace_with_';

/**
 * Return the JWT signing key. Local development gets a process-local random key
 * when .env is missing a real key; production never silently generates one.
 * A development-generated key changes when the server restarts, invalidating
 * old local tokens, which is appropriate for demo/testing accounts.
 */
export function getJwtSecret(): string | null {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 32 && !configured.startsWith(EXAMPLE_SECRET_PREFIX)) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const generated = randomBytes(48).toString('hex');
  process.env.JWT_SECRET = generated;
  console.warn(
    '[auth] No valid JWT_SECRET was configured. Generated a temporary development-only secret. ' +
    'Set JWT_SECRET in Tenant_backend/.env for a stable local key. Never use this fallback in production.',
  );
  return generated;
}
