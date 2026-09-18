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

    await ensureDefaultAgent();

    const allowedEmail = process.env.ALLOWED_AGENT_EMAIL || 'agent@example.com';
    if (email.toLowerCase() !== allowedEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized: Not an approved agent account' },
        { status: 403 }
      );
    }

    const agent = await prisma.agentProfile.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!agent || !agent.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
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
