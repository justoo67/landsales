'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AgentNavbar from '@/components/layout/AgentNavbar';
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

  useEffect(() => {
    fetchPlots();
    fetchProfile();
  }, []);

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
      }
    } catch (err) {
      console.error('Status update error:', err);
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
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              🟢 Available
            </span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              {availableCount}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider block">
              🟠 Pending
            </span>
            <span className="text-2xl font-bold text-orange-700 mt-1 block">
              {pendingCount}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
              🔴 Sold
            </span>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">
              {soldCount}
            </span>
          </div>
        </section>

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

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'AVAILABLE', 'PENDING', 'SOLD'].map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-manipulation min-h-[36px] ${
                  activeStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No properties found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || activeStatus !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Get started by creating your first land listing in the field.'}
            </p>
            <Link
              href="/dashboard/plots/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 shadow-sm active:scale-95 transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Plot</span>
            </Link>
          </div>
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

                    {/* Quick 1-to-1 Client View Button */}
                    <Link
                      href={`/p/${plot.id}`}
                      target="_blank"
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform"
                      title="View Client Page"
                    >
                      <Eye className="w-4 h-4" />
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
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          📐 {sizeDisplay}
                        </span>
                        {plot.zoning && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                            🏷️ {plot.zoning}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* 1-Click Status Dropdown */}
                      <select
                        value={plot.status}
                        onChange={(e) =>
                          handleStatusChange(plot.id, e.target.value)
                        }
                        className="text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 min-h-[36px]"
                      >
                        <option value="AVAILABLE">🟢 Available</option>
                        <option value="PENDING">🟠 Pending</option>
                        <option value="SOLD">🔴 Sold</option>
                      </select>

                      <div className="flex items-center gap-1">
                        {/* Copy 1-to-1 Link */}
                        <button
                          onClick={() => handleCopyLink(plot.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg text-xs font-medium text-slate-700 transition-all min-h-[36px]"
                          title="Copy 1-to-1 Client Link"
                        >
                          {copiedId === plot.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        {/* Edit Link */}
                        <Link
                          href={`/dashboard/plots/${plot.id}/edit`}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          title="Edit Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(plot.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
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
    </div>
  );
}
