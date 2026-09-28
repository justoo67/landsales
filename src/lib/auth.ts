import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'landsales-super-secure-jwt-secret-key-2026-xyz'
);

const COOKIE_NAME = 'agent_session';

export interface SessionPayload {
  email: string;
  agentId: string;
  name: string;
  avatarUrl?: string;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

export async function ensureDefaultAgent() {
  const allowedConfig = process.env.ALLOWED_AGENT_EMAIL || 'agent@example.com';
  const defaultEmail = allowedConfig.split(',')[0].trim().toLowerCase();

  let agent = await prisma.agentProfile.findUnique({
    where: { email: defaultEmail },
  });

  if (!agent) {
    // If an agent record exists already (e.g. logged in via Google OAuth), use it
    agent = await prisma.agentProfile.findFirst();
  }

  if (!agent) {
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);
    agent = await prisma.agentProfile.create({
      data: {
        email: defaultEmail,
        agentName: 'Land Sales Specialist',
        passwordHash: defaultPasswordHash,
        whatsappNumber: '+254700000000',
        customGreeting: "Hi! I'm inquiring about [Plot Title]. Is it still available?",
      },
    });
  }

  return agent;
}
