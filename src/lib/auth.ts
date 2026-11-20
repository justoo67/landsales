import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getTokenSecret, SESSION_COOKIE_NAME } from './jwt-secret';
import type { AgentProfile } from '@prisma/client';

const COOKIE_NAME = SESSION_COOKIE_NAME;
const SESSION_DAYS = 30;

export interface SessionPayload {
  email: string;
  agentId: string;
  name: string;
  avatarUrl?: string;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Emails allowed to sign in. Empty means "nobody" in production. */
export function allowedAgentEmails(): string[] {
  return (process.env.ALLOWED_AGENT_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAgentEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const allowed = allowedAgentEmails();

  if (allowed.length === 0) {
    // Local development may run without an allowlist; production must not.
    return !isProduction();
  }

  return allowed.includes(normalized);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getTokenSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getTokenSecret());
    return payload as unknown as SessionPayload;
  } catch (err) {
    console.error('Session verify error:', err);
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Resolve the agent profile for a signed-in session, creating a bare profile
 * row if the account authenticated but has never completed setup.
 *
 * This replaces the old `ensureDefaultAgent`, which silently created an agent
 * with a known password.
 */
export async function ensureAgentForSession(
  session: SessionPayload
): Promise<AgentProfile> {
  const byId = session.agentId
    ? await prisma.agentProfile.findUnique({ where: { id: session.agentId } })
    : null;
  if (byId) return byId;

  const email = session.email.trim().toLowerCase();
  const byEmail = await prisma.agentProfile.findUnique({ where: { email } });
  if (byEmail) return byEmail;

  return prisma.agentProfile.create({
    data: {
      email,
      agentName: session.name || 'Land Sales Specialist',
    },
  });
}
