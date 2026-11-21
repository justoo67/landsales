import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, maxAgentAccounts } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const { email, password, name, agentName, whatsappNumber } = body;

    // 1. Email validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Open registration, capped: anyone may create an account until the
    // deployment fills up. Each account only sees its own data.

    // 2. Password validation
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // 3. Check for existing account, then enforce the account cap.
    const existingAgent = await prisma.agentProfile.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const accountCount = await prisma.agentProfile.count();
    const maxAccounts = maxAgentAccounts();
    if (accountCount >= maxAccounts) {
      return NextResponse.json(
        {
          error: `This deployment is full (${maxAccounts} agent accounts). Ask the owner to remove an account first.`,
          code: 'DEPLOYMENT_FULL',
        },
        { status: 409 }
      );
    }

    // 4. Hash password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Compute display name and whatsapp number
    const chosenName = (name || agentName || '').trim();
    const displayName =
      chosenName.length > 0
        ? chosenName
        : normalizedEmail
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const phone =
      typeof whatsappNumber === 'string' && whatsappNumber.trim().length > 0
        ? whatsappNumber.trim()
        : '+254700000000';

    // 6. Create AgentProfile record. The count is re-checked inside a
    // serializable transaction so two simultaneous sign-ups cannot slip past
    // the cap.
    let newAgent: {
      id: string;
      email: string;
      agentName: string;
      whatsappNumber: string;
    };
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const count = await tx.agentProfile.count();
          if (count >= maxAccounts) return { full: true as const };

          const created = await tx.agentProfile.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              agentName: displayName,
              whatsappNumber: phone,
              customGreeting:
                "Hi! I'm inquiring about [Plot Title]. Is it still available?",
            },
          });

          return { full: false as const, agent: created };
        },
        { isolationLevel: 'Serializable' }
      );

      if (result.full) {
        return NextResponse.json(
          {
            error: `This deployment is full (${maxAccounts} agent accounts). Ask the owner to remove an account first.`,
            code: 'DEPLOYMENT_FULL',
          },
          { status: 409 }
        );
      }

      newAgent = result.agent;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Please sign in instead.',
          },
          { status: 409 }
        );
      }
      if (code === 'P2034') {
        // Another sign-up committed at the same moment; ask for a retry.
        return NextResponse.json(
          { error: 'Sign-up is busy right now. Please try again.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // 7. Establish active session
    await createSession({
      email: newAgent.email,
      agentId: newAgent.id,
      name: newAgent.agentName,
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          id: newAgent.id,
          name: newAgent.agentName,
          email: newAgent.email,
          whatsappNumber: newAgent.whatsappNumber,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Account creation error:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
