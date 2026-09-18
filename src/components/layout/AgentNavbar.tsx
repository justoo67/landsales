'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Map, Plus, Settings, LogOut, Layers } from 'lucide-react';

interface AgentNavbarProps {
  agentName?: string;
}

export default function AgentNavbar({ agentName = 'Agent' }: AgentNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isDashboard = pathname === '/dashboard';
  const isSettings = pathname === '/dashboard/settings';

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/85 border-b border-slate-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Agent info */}
        <Link href="/dashboard" className="flex items-center gap-2.5 touch-manipulation group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm shadow-sky-200 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 tracking-tight text-base block leading-tight">
              PlotPilot
            </span>
            <span className="text-[11px] text-slate-500 font-medium leading-none block">
              {agentName}
            </span>
          </div>
        </Link>

        {/* Action Controls adhering to Apple HIG (min 44x44pt) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/plots/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-sm font-medium rounded-xl shadow-sm transition-all min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Plot</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all touch-manipulation active:scale-95 ${
              isSettings
                ? 'bg-slate-100 text-sky-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Agent Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>

          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center justify-center w-11 h-11 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all touch-manipulation active:scale-95"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
