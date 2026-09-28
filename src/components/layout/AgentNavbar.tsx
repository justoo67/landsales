'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Settings, Layers } from 'lucide-react';

interface AgentNavbarProps {
  agentName?: string;
  avatarUrl?: string | null;
  onStartTour?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function AgentNavbar({
  agentName = 'Agent',
  avatarUrl,
  onStartTour,
}: AgentNavbarProps) {
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';
  const isSettings = pathname === '/dashboard/settings';

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/85 border-b border-slate-200/80 transition-all pt-safe">
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
          {/* Quick Interactive Guided Tour Trigger */}
          {onStartTour && isDashboard && (
            <button
              onClick={onStartTour}
              type="button"
              className="hidden md:flex items-center justify-center w-11 h-11 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-xl transition-all touch-manipulation active:scale-95"
              title="Quick Guided Tour"
              aria-label="Quick Guided Tour"
            >
              <span className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-0.5 hover:border-sky-500 hover:text-sky-600 transition-colors">
                Tour
              </span>
            </button>
          )}

          <Link
            id="tour-add-plot"
            href="/dashboard/plots/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-sm font-medium rounded-xl shadow-sm transition-all min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Plot</span>
          </Link>

          <Link
            id="tour-settings"
            href="/dashboard/settings"
            className={`flex items-center gap-1.5 p-1 rounded-xl transition-all touch-manipulation active:scale-95 min-h-[44px] ${
              isSettings
                ? 'bg-slate-100 ring-2 ring-sky-500/20'
                : 'hover:bg-slate-100'
            }`}
            title={`Settings (${agentName})`}
            aria-label={`Settings (${agentName})`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={agentName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/30 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {getInitials(agentName)}
              </div>
            )}
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-700 hidden sm:block mr-1" />
          </Link>
        </div>
      </div>
    </header>
  );
}
