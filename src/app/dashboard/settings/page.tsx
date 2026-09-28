'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentNavbar from '@/components/layout/AgentNavbar';
import ThemeSegmentedControl from '@/components/common/ThemeSegmentedControl';
import { User, Phone, MessageSquare, Check, AlertCircle, Palette, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [customGreeting, setCustomGreeting] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setAgentName(p.agentName || '');
          setWhatsappNumber(p.whatsappNumber || '+254700000000');
          setCustomGreeting(
            p.customGreeting || "Hi! I'm inquiring about [Plot Title]. Is it still available?"
          );
          setEmail(p.email || '');
          setAvatarUrl(p.avatarUrl || null);
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          whatsappNumber,
          customGreeting,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error saving settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={agentName} avatarUrl={avatarUrl} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agent Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal branding, interface appearance, and client WhatsApp routing.
          </p>
        </div>

        {/* Appearance Row adhering to Apple HIG */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Appearance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sync with device theme or choose manually.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[270px]">
            <ThemeSegmentedControl />
          </div>
        </div>

        {saved && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Authorized Account Email
            </label>
            <input
              type="text"
              disabled
              value={email}
              className="w-full px-3.5 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Guarded by single-agent email allowlist.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Agent Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. John Mwangi"
                className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              WhatsApp Phone Number *
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+254712345678"
                className="w-full px-3.5 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Include country code (e.g., <code>+254 7...</code>). All client WhatsApp inquiries trigger to this number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Inquiry Template
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                placeholder="Hi! I'm inquiring about [Plot Title] listed for [Price]. Is it still available?"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Use <code>[Plot Title]</code> and <code>[Price]</code> as dynamic placeholders.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-md transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>

        {/* Account Session & Sign Out */}
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Agent Portal Session
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed in as <strong className="text-slate-700">{email || agentName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200/80 transition-all min-h-[44px] touch-manipulation active:scale-98"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
