import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, ensureDefaultAgent } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await ensureDefaultAgent();
    return NextResponse.json({
      profile: {
        id: agent.id,
        agentName: agent.agentName,
        email: agent.email,
        whatsappNumber: agent.whatsappNumber,
        customGreeting: agent.customGreeting,
        avatarUrl: session.avatarUrl || null,
      },
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentName, whatsappNumber, customGreeting } = body;

    const agent = await ensureDefaultAgent();
    const updated = await prisma.agentProfile.update({
      where: { id: agent.id },
      data: {
        ...(agentName ? { agentName } : {}),
        ...(whatsappNumber ? { whatsappNumber } : {}),
        ...(customGreeting !== undefined ? { customGreeting } : {}),
      },
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        agentName: updated.agentName,
        email: updated.email,
        whatsappNumber: updated.whatsappNumber,
        customGreeting: updated.customGreeting,
      },
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
