import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { prisma } from '@/lib/prisma';
import {
  MapPin,
  CheckCircle2,
  Share2,
  Calendar,
  Compass,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import ClientPhotoGallery from '@/components/client/ClientPhotoGallery';
import ClientListingMap from '@/components/client/ClientListingMap';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const plot = await prisma.plot.findUnique({ where: { id } });

  if (!plot) {
    return { title: 'Property Not Found' };
  }

  let photos: string[] = [];
  try {
    photos = JSON.parse(plot.photos);
  } catch {
    photos = [];
  }

  const priceText =
    plot.priceType === 'CONTACT_AGENT' || !plot.priceKes
      ? 'Price on Request'
      : `KSh ${plot.priceKes.toLocaleString('en-KE')}`;

  const title = `${plot.title} — ${priceText} (${plot.status})`;
  const description = `${plot.sizePreset} land parcel. ${plot.roadAccess || ''} road access, ${plot.waterSource || ''} water, ${plot.electricity || ''} power.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: photos.length > 0 ? [photos[0]] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: photos.length > 0 ? [photos[0]] : [],
    },
  };
}

export default async function ClientShowcasePage({ params }: PageProps) {
  const { id } = await params;
  const plot = await prisma.plot.findUnique({ where: { id } });

  if (!plot) {
    notFound();
  }

  const agent = await prisma.agentProfile.findFirst();
  const agentName = agent?.agentName || 'Land Specialist';
  const whatsappNum = (agent?.whatsappNumber || '+254700000000').replace(/[^0-9]/g, '');

  let photos: string[] = [];
  try {
    photos = JSON.parse(plot.photos);
  } catch {
    photos = [];
  }

  const formattedPrice =
    plot.priceType === 'CONTACT_AGENT' || !plot.priceKes
      ? 'Price on Request'
      : `KSh ${plot.priceKes.toLocaleString('en-KE')}`;

  const sizeDisplay =
    plot.sizePreset === 'CUSTOM'
      ? plot.sizeCustomValue || 'Custom Area'
      : plot.sizePreset;

  // Build pre-filled WhatsApp message
  const rawGreeting =
    agent?.customGreeting ||
    "Hi! I'm inquiring about [Plot Title] listed for [Price]. Is it still available?";
  const filledGreeting = rawGreeting
    .replace('[Plot Title]', plot.title)
    .replace('[Price]', formattedPrice);
  const whatsappUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    filledGreeting
  )}`;

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 selection:bg-sky-100 pb-28">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Verified Land Listing
            </span>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
              plot.status === 'AVAILABLE'
                ? 'bg-emerald-100 text-emerald-800'
                : plot.status === 'PENDING'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {plot.status === 'AVAILABLE'
              ? '🟢 Available'
              : plot.status === 'PENDING'
              ? '🟠 Pending / Under Offer'
              : '🔴 Sold'}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 space-y-6">
        {/* Photo Gallery Carousel */}
        <ClientPhotoGallery photos={photos} title={plot.title} />

        {/* Video Player */}
        {plot.videoUrl && (
          <div className="bg-black rounded-3xl overflow-hidden shadow-lg border border-slate-200">
            <div className="p-3 bg-slate-900 text-white text-xs font-medium flex items-center justify-between">
              <span>🎥 Walkthrough Video</span>
              <span className="text-slate-400">Tap to Play</span>
            </div>
            <video
              src={plot.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-80 object-contain"
            />
          </div>
        )}

        {/* Title, Pricing & Highlights */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider block mb-1">
              {sizeDisplay}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {plot.title}
            </h1>
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              Asking Price
            </span>
            <span className="text-3xl font-extrabold text-sky-700 tracking-tight block">
              {formattedPrice}
            </span>
          </div>

          {plot.description && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {plot.description}
              </p>
            </div>
          )}
        </div>

        {/* Quick Specs Grid */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Plot Specifications
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 block mb-0.5">Plot Size</span>
              <span className="font-semibold text-slate-800">📐 {sizeDisplay}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 block mb-0.5">Zoning / Use</span>
              <span className="font-semibold text-slate-800">
                🏷️ {plot.zoning || 'Residential'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 block mb-0.5">Road Access</span>
              <span className="font-semibold text-slate-800">
                🛣️ {plot.roadAccess || 'Gravel road'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 block mb-0.5">Water Source</span>
              <span className="font-semibold text-slate-800">
                💧 {plot.waterSource || 'Borehole'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2">
              <span className="text-xs text-slate-400 block mb-0.5">Electricity Grid</span>
              <span className="font-semibold text-slate-800">
                ⚡ {plot.electricity || 'On-site'}
              </span>
            </div>
          </div>
        </div>

        {/* OpenStreetMap Location & Directions */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Exact Location
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
            </span>
          </div>
          <ClientListingMap
            latitude={plot.latitude}
            longitude={plot.longitude}
            title={plot.title}
          />
        </div>

        {/* Agent Info Card */}
        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-lg space-y-2">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
            Listing Represented By
          </span>
          <h3 className="text-lg font-bold">{agentName}</h3>
          <p className="text-xs text-slate-300">
            Contact directly for site visits, boundary inspection, and title verification.
          </p>
        </div>
      </main>

      {/* Sticky Bottom WhatsApp Floating Bar adhering to Apple HIG */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl pb-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-base rounded-2xl shadow-md shadow-emerald-600/30 transition-all min-h-[48px] touch-manipulation"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Chat on WhatsApp</span>
          </a>

          <a
            href={`tel:${agent?.whatsappNumber || ''}`}
            className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
            title="Call Agent"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
