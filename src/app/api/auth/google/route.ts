import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, ensureDefaultAgent } from '@/lib/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error), req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google`;

  // If no OAuth code and we have Google credentials, initiate OAuth redirect
  if (!code && clientId) {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
    return NextResponse.redirect(googleAuthUrl);
  }

  // If code is present, exchange code for tokens
  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenRes.json();
      if (!tokens.access_token) {
        return NextResponse.redirect(new URL('/login?error=TokenExchangeFailed', req.url));
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleUser = await userRes.json();

      const allowedEmail = process.env.ALLOWED_AGENT_EMAIL || 'agent@example.com';
      if (googleUser.email.toLowerCase() !== allowedEmail.toLowerCase()) {
        return NextResponse.redirect(
          new URL('/login?error=UnauthorizedAccountNotAllowed', req.url)
        );
      }

      await ensureDefaultAgent();
      const agent = await prisma.agentProfile.upsert({
        where: { email: googleUser.email.toLowerCase() },
        update: {
          agentName: googleUser.name || 'Agent',
        },
        create: {
          id: 'default_agent',
          email: googleUser.email.toLowerCase(),
          agentName: googleUser.name || 'Agent',
          whatsappNumber: '+254700000000',
        },
      });

      await createSession({
        email: agent.email,
        agentId: agent.id,
        name: agent.agentName,
      });

      return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (err) {
      console.error('Google OAuth exchange error:', err);
      return NextResponse.redirect(new URL('/login?error=OAuthFailed', req.url));
    }
  }

  // If credentials are not yet configured in local dev, provide seamless 1-tap dev sign-in with the allowed agent email
  await ensureDefaultAgent();
  const allowedEmail = process.env.ALLOWED_AGENT_EMAIL || 'agent@example.com';
  const agent = await prisma.agentProfile.findUnique({
    where: { email: allowedEmail.toLowerCase() },
  });

  if (agent) {
    await createSession({
      email: agent.email,
      agentId: agent.id,
      name: agent.agentName,
    });
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.redirect(new URL('/login', req.url));
}
