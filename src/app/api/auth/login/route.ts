import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, isAllowedAgentEmail } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    // 5 attempts per 15 minutes per IP, to blunt password guessing.
    const limit = rateLimit(`login:${clientIp(req)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Allowlisted agents only, but each address signs in to its own account.
    if (!isAllowedAgentEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted' }, { status: 403 });
    }

    const agent = await prisma.agentProfile.findUnique({
      where: { email: normalizedEmail },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'No account found for this email. Please create one first.' },
        { status: 401 }
      );
    }

    // Account created via Google OAuth only, without a password
    if (!agent.passwordHash) {
      return NextResponse.json(
        {
          error:
            'This account was registered using Google sign-in. Please use "Continue with Google".',
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, agent.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await createSession({
      email: agent.email,
      agentId: agent.id,
      name: agent.agentName,
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.agentName,
        email: agent.email,
        whatsappNumber: agent.whatsappNumber,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
