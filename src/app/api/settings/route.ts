import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, ensureDefaultAgent } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let agent = session.agentId
      ? await prisma.agentProfile.findUnique({ where: { id: session.agentId } })
      : null;

    if (!agent && session.email) {
      agent = await prisma.agentProfile.findUnique({
        where: { email: session.email.toLowerCase() },
      });
    }

    if (!agent) {
      agent = await ensureDefaultAgent();
    }

    return NextResponse.json({
      profile: {
        id: agent.id,
        agentName: agent.agentName,
        email: agent.email,
        whatsappNumber: agent.whatsappNumber,
        customGreeting: agent.customGreeting,
        avatarUrl: session.avatarUrl || null,
        hasPassword: Boolean(agent.passwordHash),
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
    const { agentName, whatsappNumber, customGreeting, currentPassword, newPassword } = body;

    let agent = session.agentId
      ? await prisma.agentProfile.findUnique({ where: { id: session.agentId } })
      : null;

    if (!agent && session.email) {
      agent = await prisma.agentProfile.findUnique({
        where: { email: session.email.toLowerCase() },
      });
    }

    if (!agent) {
      agent = await ensureDefaultAgent();
    }

    // Optional password change
    let updatedPasswordHash: string | undefined = undefined;
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      if (agent.passwordHash) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required to change password' },
            { status: 400 }
          );
        }
        const isMatch = await bcrypt.compare(currentPassword, agent.passwordHash);
        if (!isMatch) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }
      }

      updatedPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.agentProfile.update({
      where: { id: agent.id },
      data: {
        ...(agentName ? { agentName: agentName.trim() } : {}),
        ...(whatsappNumber ? { whatsappNumber: whatsappNumber.trim() } : {}),
        ...(customGreeting !== undefined ? { customGreeting } : {}),
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {}),
      },
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        agentName: updated.agentName,
        email: updated.email,
        whatsappNumber: updated.whatsappNumber,
        customGreeting: updated.customGreeting,
        hasPassword: Boolean(updated.passwordHash),
      },
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
