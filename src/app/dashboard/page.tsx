'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AgentNavbar from '@/components/layout/AgentNavbar';
import SaleRecordDrawer from '@/components/deals/SaleRecordDrawer';
import DealLedgerModal from '@/components/deals/DealLedgerModal';
import {
  Plus,
  Search,
  MapPin,
  Share2,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  Map,
  ListFilter,
  Eye,
  Receipt,
  TrendingUp,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';

const DynamicMasterMap = dynamic(
  () => import('@/components/map/MasterDashboardMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        Loading Map Engine...
      </div>
    ),
  }
);

interface Plot {
  id: string;
  title: string;
  status: string;
  priceType: string;
  priceKes: number | null;
  sizePreset: string;
  sizeCustomValue: string | null;
  zoning: string | null;
  latitude: number;
  longitude: number;
  photos: string;
  videoUrl: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('Agent');

  // Phase 2: Sales Ledger & Installment Modals State
  const [saleDrawerTarget, setSaleDrawerTarget] = useState<{
    plotId: string;
    plotTitle: string;
    defaultPrice: number | null;
    targetStatus: 'PENDING' | 'SOLD';
  } | null>(null);

  const [activeLedgerPlot, setActiveLedgerPlot] = useState<{
    plotId: string;
    plotTitle: string;
  } | null>(null);

  const [dealsMetrics, setDealsMetrics] = useState<{
    totalDeals: number;
    totalSoldVolume: number;
    totalCollected: number;
    totalOutstanding: number;
  } | null>(null);

  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  const fetchPlots = async () => {
    try {
      const res = await fetch('/api/plots');
      if (res.ok) {
        const data = await res.json();
        setPlots(data.plots || []);
      }
    } catch (err) {
      console.error('Fetch plots error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.agentName) {
          setAgentName(data.profile.agentName);
        }
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  const fetchDealsMetrics = async () => {
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDealsMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Fetch deals metrics error:', err);
    }
  };

  useEffect(() => {
    fetchPlots();
    fetchProfile();
    fetchDealsMetrics();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isWelcomeParam = params.get('welcome') === 'true';
      const isDismissed = sessionStorage.getItem('plotpilot_welcome_dismissed') === 'true';
      if (isWelcomeParam || !isDismissed) {
        setShowWelcome(true);
      }
    }
  }, []);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('plotpilot_welcome_dismissed', 'true');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/plots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPlots((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
        );
        fetchDealsMetrics();
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleStatusSelect = (plot: Plot, newStatus: string) => {
    if (newStatus === 'PENDING' || newStatus === 'SOLD') {
      setSaleDrawerTarget({
        plotId: plot.id,
        plotTitle: plot.title,
        defaultPrice: plot.priceKes,
        targetStatus: newStatus,
      });
    } else {
      handleStatusChange(plot.id, newStatus);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this plot listing?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlots((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Delete plot error:', err);
    }
  };

  const handleCopyLink = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/p/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // KPIs
  const totalCount = plots.length;
  const availableCount = plots.filter((p) => p.status === 'AVAILABLE').length;
  const pendingCount = plots.filter((p) => p.status === 'PENDING').length;
  const soldCount = plots.filter((p) => p.status === 'SOLD').length;

  // Filtered list
  const filteredPlots = useMemo(() => {
    return plots.filter((p) => {
      const matchesStatus =
        activeStatus === 'ALL' || p.status === activeStatus;
      const matchesQuery =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sizeCustomValue &&
          p.sizeCustomValue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.zoning && p.zoning.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesQuery;
    });
  }, [plots, activeStatus, searchQuery]);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={agentName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* Apple HIG Welcome & Onboarding Hero Banner */}
        {showWelcome && (
          <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-sky-900/10 mb-6 border border-white/20">
            {/* Background decorative glows */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-sky-100 mb-3 border border-white/15">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Welcome to PlotPilot</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                    Welcome, {agentName}! 👋
                  </h2>
                  <p className="text-sm sm:text-base text-sky-100 mt-2 max-w-2xl leading-relaxed">
                    Your digital land sales assistant is ready. Create parcel presentations with interactive GPS maps, photos, and direct WhatsApp sharing links that impress prospective buyers.
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={handleDismissWelcome}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all touch-manipulation flex-shrink-0"
                  aria-label="Dismiss welcome message"
                  title="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Step Quick-Start Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs mb-2">
                    1
                  </div>
                  <h4 className="text-sm font-bold text-white">Pin Your Plot</h4>
                  <p className="text-xs text-sky-100 mt-1 leading-normal">
                    Pin exact GPS coordinates on the interactive OpenStreetMap.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs mb-2">
                    2
                  </div>
                  <h4 className="text-sm font-bold text-white">Upload Media</h4>
                  <p className="text-xs text-sky-100 mt-1 leading-normal">
                    Add parcel photos and walkthrough video directly from your phone.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs mb-2">
                    3
                  </div>
                  <h4 className="text-sm font-bold text-white">Share via WhatsApp</h4>
                  <p className="text-xs text-sky-100 mt-1 leading-normal">
                    Send 1-to-1 client links with instant pre-filled WhatsApp lead buttons.
                  </p>
                </div>
              </div>

              {/* Action Buttons adhering to Apple HIG */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard/plots/new"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 active:scale-95 text-sky-700 font-bold text-sm rounded-xl shadow-md transition-all min-h-[44px] touch-manipulation"
                >
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Add Your First Property</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 px-4 py-3 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium text-xs rounded-xl transition-all min-h-[44px] touch-manipulation"
                >
                  <span>Configure WhatsApp Phone Number</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Plots
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {totalCount}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Available
              </span>
            </div>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {availableCount}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                Pending
              </span>
            </div>
            <span className="text-2xl font-bold text-orange-700 mt-1 block">
              {pendingCount}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Sold
              </span>
            </div>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">
              {soldCount}
            </span>
          </div>
        </section>

        {/* Sales Pipeline & Revenue Summary */}
        {dealsMetrics && dealsMetrics.totalDeals > 0 && (
          <section className="bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg mb-6 border border-slate-700/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Sales & Installment Pipeline
                </span>
              </div>
              <span className="text-xs text-slate-300 font-semibold bg-white/10 px-2.5 py-0.5 rounded-full">
                {dealsMetrics.totalDeals} Deals Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 text-center sm:text-left">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Total Booked
                </span>
                <span className="text-base sm:text-xl font-extrabold text-white block mt-0.5">
                  KSh {dealsMetrics.totalSoldVolume.toLocaleString('en-KE')}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">
                  Cleared Funds
                </span>
                <span className="text-base sm:text-xl font-extrabold text-emerald-400 block mt-0.5">
                  KSh {dealsMetrics.totalCollected.toLocaleString('en-KE')}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">
                  Remaining Due
                </span>
                <span className="text-base sm:text-xl font-extrabold text-amber-400 block mt-0.5">
                  KSh {dealsMetrics.totalOutstanding.toLocaleString('en-KE')}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Search, Filter Tabs & View Toggle */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, dimension, or location..."
                className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm min-h-[44px]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto min-h-[44px]">
              <button
                onClick={() => setViewMode('LIST')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'LIST'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('MAP')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'MAP'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
            </div>
          </div>

          {/* Status Tabs adhering to Apple HIG (min 44x44pt) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'AVAILABLE', 'PENDING', 'SOLD'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-manipulation min-h-[44px] ${
                  activeStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Plots' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Content View: Map vs List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading your property inventory...
          </div>
        ) : viewMode === 'MAP' ? (
          <DynamicMasterMap plots={filteredPlots} />
        ) : filteredPlots.length === 0 ? (
          plots.length === 0 ? (
            /* First-Time Inventory Empty State adhering to Apple HIG */
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-100 to-teal-50 text-sky-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-sky-50/50 shadow-inner">
                <MapPin className="w-8 h-8 text-sky-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Add Your First Property
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Your catalog is currently empty. List your first plot to pin its GPS location, upload phone media, and send interactive WhatsApp presentations to clients.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Link
                  href="/dashboard/plots/new"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-sm font-semibold shadow-sm transition-all min-h-[44px] touch-manipulation w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Property</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-sm font-semibold transition-all min-h-[44px] touch-manipulation w-full sm:w-auto"
                >
                  <span>Configure Settings</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Search / Filter produces 0 results */
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No properties match your filter
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No listings found matching &ldquo;{searchQuery || activeStatus}&rdquo;. Try clearing your search query or status filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveStatus('ALL');
                }}
                className="mt-4 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-semibold transition-all min-h-[44px] touch-manipulation"
              >
                Reset Filters
              </button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlots.map((plot) => {
              let photoList: string[] = [];
              try {
                photoList = JSON.parse(plot.photos);
              } catch {
                photoList = [];
              }
              const coverPhoto = photoList[0] || null;

              const formattedPrice =
                plot.priceType === 'CONTACT_AGENT' || !plot.priceKes
                  ? 'Price on Request'
                  : `KSh ${plot.priceKes.toLocaleString('en-KE')}`;

              const sizeDisplay =
                plot.sizePreset === 'CUSTOM'
                  ? plot.sizeCustomValue || 'Custom'
                  : plot.sizePreset;

              return (
                <div
                  key={plot.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Image / Video preview Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={plot.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <MapPin className="w-8 h-8 mb-1" />
                        <span className="text-xs">No photos uploaded</span>
                      </div>
                    )}

                    {/* Status Pill Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                          plot.status === 'AVAILABLE'
                            ? 'bg-emerald-600/90 text-white'
                            : plot.status === 'PENDING'
                            ? 'bg-orange-500/90 text-white'
                            : 'bg-rose-600/90 text-white'
                        }`}
                      >
                        {plot.status}
                      </span>
                    </div>

                    {/* Quick 1-to-1 Client View Button (min 44x44pt hit target) */}
                    <Link
                      href={`/p/${plot.id}`}
                      target="_blank"
                      className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center active:scale-95 transition-transform z-10 touch-manipulation"
                      title="View Client Page"
                      aria-label="View Client Page"
                    >
                      <span className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-sm">
                        <Eye className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-base leading-tight mb-1">
                        {plot.title}
                      </h4>
                      <div className="text-sky-700 font-bold text-lg mb-2">
                        {formattedPrice}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                          {sizeDisplay}
                        </span>
                        {plot.zoning && (
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                            {plot.zoning}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deal Ledger CTA button if Sold or Pending */}
                    {(plot.status === 'PENDING' || plot.status === 'SOLD') && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLedgerPlot({
                            plotId: plot.id,
                            plotTitle: plot.title,
                          })
                        }
                        className="w-full mt-2 mb-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 active:scale-98 text-sky-800 border border-sky-200/80 rounded-xl text-xs font-bold transition-all min-h-[40px] touch-manipulation shadow-xs"
                      >
                        <Receipt className="w-4 h-4 text-sky-600" />
                        <span>Deal Ledger & Installments</span>
                      </button>
                    )}

                    {/* Bottom Actions adhering to Apple HIG */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* 1-Click Status Dropdown */}
                    <select
                      value={plot.status}
                      onChange={(e) =>
                        handleStatusSelect(plot, e.target.value)
                      }
                      className="text-xs font-semibold py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 min-h-[44px] touch-manipulation"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="PENDING">Pending</option>
                      <option value="SOLD">Sold</option>
                    </select>

                    <div className="flex items-center gap-1">
                      {/* Copy 1-to-1 Link */}
                      <button
                        onClick={() => handleCopyLink(plot.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl text-xs font-semibold text-slate-700 transition-all min-h-[44px] touch-manipulation"
                        title="Copy 1-to-1 Client Link"
                      >
                        {copiedId === plot.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">
                              Copied!
                            </span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4 text-slate-500" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      {/* Edit Link */}
                      <Link
                        href={`/dashboard/plots/${plot.id}/edit`}
                        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all touch-manipulation active:scale-95"
                        title="Edit Details"
                        aria-label="Edit Plot"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(plot.id)}
                        className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all touch-manipulation active:scale-95"
                        title="Delete"
                        aria-label="Delete Plot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>

    {/* Sale Record Drawer (Slides up on mobile) */}
    {saleDrawerTarget && (
      <SaleRecordDrawer
        plotId={saleDrawerTarget.plotId}
        plotTitle={saleDrawerTarget.plotTitle}
        defaultPrice={saleDrawerTarget.defaultPrice}
        targetStatus={saleDrawerTarget.targetStatus}
        isOpen={true}
        onClose={() => setSaleDrawerTarget(null)}
        onSuccess={(newStatus) => {
          setPlots((prev) =>
            prev.map((p) =>
              p.id === saleDrawerTarget.plotId ? { ...p, status: newStatus } : p
            )
          );
          fetchDealsMetrics();
        }}
      />
    )}

    {/* Deal Ledger & Installments Modal */}
    {activeLedgerPlot && (
      <DealLedgerModal
        plotId={activeLedgerPlot.plotId}
        plotTitle={activeLedgerPlot.plotTitle}
        isOpen={true}
        onClose={() => setActiveLedgerPlot(null)}
        onDealUpdated={() => {
          fetchPlots();
          fetchDealsMetrics();
        }}
      />
    )}
  </div>
  );
}
