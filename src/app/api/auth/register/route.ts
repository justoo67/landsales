import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
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

    // 3. Check for existing account
    const existingAgent = await prisma.agentProfile.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
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

    // 6. Create AgentProfile record
    const newAgent = await prisma.agentProfile.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        agentName: displayName,
        whatsappNumber: phone,
        customGreeting: "Hi! I'm inquiring about [Plot Title]. Is it still available?",
      },
    });

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
