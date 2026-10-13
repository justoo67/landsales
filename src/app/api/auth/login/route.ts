import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, ensureDefaultAgent } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up agent by email
    let agent = await prisma.agentProfile.findUnique({
      where: { email: normalizedEmail },
    });

    // If demo agent account isn't seeded yet, seed it automatically
    if (!agent && (normalizedEmail === 'agent@example.com' || normalizedEmail === 'justinkirui3@gmail.com')) {
      await ensureDefaultAgent();
      agent = await prisma.agentProfile.findUnique({
        where: { email: normalizedEmail },
      });
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'No account found with this email. Please check your credentials or create an account.' },
        { status: 401 }
      );
    }

    // Account created via Google OAuth only without a password
    if (!agent.passwordHash) {
      return NextResponse.json(
        { error: 'This account was registered using Google sign-in. Please use "Continue with Google" to sign in.' },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, agent.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
