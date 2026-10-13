'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Layers,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

type AuthMode = 'login' | 'register';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const getErrorMessage = (err: string | null): string | null => {
    if (!err) return null;
    if (err === 'UnauthorizedAccountNotAllowed') {
      return 'This Google account is not approved. Please sign in with an authorized email or create a new agent account below.';
    }
    if (err === 'GoogleOAuthNotConfigured') {
      return 'Google OAuth credentials are not configured on this server. Please use email & password.';
    }
    if (err === 'TokenExchangeFailed' || err === 'OAuthFailed') {
      return 'Google sign-in encountered an issue. Please try again or use email & password.';
    }
    if (err === 'NoEmailFromGoogle') {
      return 'Google did not provide an email address. Please verify your Google account permissions.';
    }
    return `Authentication error (${err}). Please check your credentials.`;
  };

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(getErrorMessage(errorParam));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (newMode: AuthMode) => {
    triggerHaptic('light');
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleFillDemo = () => {
    triggerHaptic('light');
    setLoginEmail('agent@example.com');
    setLoginPassword('admin123');
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide both email and password.');
      triggerHaptic('warning');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please verify your credentials.');
      }

      triggerHaptic('success');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      triggerHaptic('warning');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail.trim() || !registerPassword) {
      setError('Email and password are required.');
      triggerHaptic('warning');
      return;
    }

    if (registerPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      triggerHaptic('warning');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Passwords do not match. Please re-check both fields.');
      triggerHaptic('warning');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail.trim(),
          password: registerPassword,
          name: registerName.trim(),
          whatsappNumber: registerPhone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      triggerHaptic('success');
      setSuccessMsg('Account created successfully! Taking you to your dashboard...');
      setTimeout(() => {
        router.push('/dashboard?welcome=true');
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      triggerHaptic('warning');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during account creation.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md">
      {/* Brand Logo & Title */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 items-center justify-center text-white shadow-lg shadow-sky-200 mb-3">
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          PlotPilot
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Agent Portal &bull; Land Sales Assistant
        </p>
      </div>

      {/* Card */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50">
        {/* iOS Native Segmented Tab Control */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 mb-6 border border-slate-200/60"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] flex items-center justify-center ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation min-h-[44px] flex items-center justify-center ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-red-50 border border-red-200/80 rounded-2xl text-red-700 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Primary Action: Google 1-Tap OAuth */}
        <div>
          <a
            href="/api/auth/google"
            onClick={() => triggerHaptic('light')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-sm rounded-2xl shadow-xs transition-all active:scale-[0.98] min-h-[48px] touch-manipulation cursor-pointer"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
          </a>
        </div>

        {/* Apple-style Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            {mode === 'login' ? 'Or with email & password' : 'Or with email & password'}
          </span>
        </div>

        {/* MODE: SIGN IN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Agent Email
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="agent@example.com"
                  className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-3 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors touch-manipulation cursor-pointer"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 transition-all min-h-[48px] touch-manipulation disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Pre-fill Option */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleFillDemo}
                className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium touch-manipulation py-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Demo Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-slate-500 hover:text-slate-800 font-medium touch-manipulation py-1.5 cursor-pointer"
              >
                Create Account &rarr;
              </button>
            </div>
          </form>
        )}

        {/* MODE: CREATE ACCOUNT */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Agent Name
              </label>
              <div className="relative">
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="e.g. Jane Wanjiku"
                  className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address *
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  placeholder="jane@plots.co.ke"
                  className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                WhatsApp Number
              </label>
              <div className="relative">
                <input
                  id="register-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Client inquiry buttons on plot pages route directly to this WhatsApp.
              </p>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-3 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors touch-manipulation cursor-pointer"
                  aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-type your password"
                  className="w-full px-3.5 py-3 pl-10 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-base min-h-[44px] transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors touch-manipulation cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Validation indicators */}
            <div className="space-y-1 pt-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    registerPassword.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <span className={registerPassword.length >= 8 ? 'text-emerald-700 font-medium' : ''}>
                  At least 8 characters
                </span>
              </div>
              {registerConfirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      registerPassword === registerConfirmPassword && registerPassword.length > 0
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span
                    className={
                      registerPassword === registerConfirmPassword && registerPassword.length > 0
                        ? 'text-emerald-700 font-medium'
                        : 'text-rose-600 font-medium'
                    }
                  >
                    {registerPassword === registerConfirmPassword
                      ? 'Passwords match'
                      : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 transition-all min-h-[48px] touch-manipulation disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : 'Create Agent Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center text-xs">
              <span className="text-slate-500">Already registered? </span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sky-600 hover:text-sky-700 font-semibold touch-manipulation py-1.5 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Safety / Compliance footer */}
      <div className="mt-6 text-center text-xs text-slate-400">
        PlotPilot Land Sales Portal &bull; Encrypted Sessions
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col justify-center items-center px-4 py-8 sm:px-6 bg-gradient-to-b from-slate-50 to-slate-100">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading portal...</div>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
