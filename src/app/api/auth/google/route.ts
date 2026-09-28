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

  // Determine production-safe base URL
  const getAppBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
    }
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    return host ? `${proto}://${host}` : 'http://localhost:3000';
  };

  const appBaseUrl = getAppBaseUrl();
  const redirectUri = `${appBaseUrl}/api/auth/google`;

  // If no OAuth code and Google credentials exist, initiate Google OAuth redirect
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
        console.error('Google token exchange failure:', tokens);
        return NextResponse.redirect(new URL('/login?error=TokenExchangeFailed', req.url));
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleUser = await userRes.json();

      if (!googleUser.email) {
        return NextResponse.redirect(new URL('/login?error=NoEmailFromGoogle', req.url));
      }

      const allowedEnv = process.env.ALLOWED_AGENT_EMAIL || '';
      const allowedEmails = allowedEnv
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (allowedEmails.length > 0 && !allowedEmails.includes(googleUser.email.toLowerCase())) {
        console.warn(`Unauthorized Google sign-in attempt from: ${googleUser.email}`);
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

  // Local development fallback: if credentials are not yet configured in local dev, allow quick sign-in
  if (process.env.NODE_ENV !== 'production' && !clientId) {
    await ensureDefaultAgent();
    const allowedConfig = process.env.ALLOWED_AGENT_EMAIL || 'agent@example.com';
    const defaultEmail = allowedConfig.split(',')[0].trim().toLowerCase();
    const agent =
      (await prisma.agentProfile.findUnique({ where: { email: defaultEmail } })) ||
      (await prisma.agentProfile.findFirst());

    if (agent) {
      await createSession({
        email: agent.email,
        agentId: agent.id,
        name: agent.agentName,
      });
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=GoogleOAuthNotConfigured', req.url));
}
