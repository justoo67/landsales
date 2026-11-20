/**
 * JWT signing secret resolution, isolated so the Edge middleware can import it
 * without pulling Prisma into the edge bundle.
 */

const DEV_FALLBACK_SECRET =
  'dev-only-insecure-jwt-secret-do-not-use-in-production-32';

export function getTokenSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be set to at least 32 characters. Refusing to sign sessions.'
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }

  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = 'agent_session';
