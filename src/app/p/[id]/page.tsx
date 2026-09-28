import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { prisma } from '@/lib/prisma';
import {
  MapPin,
  CheckCircle2,
  Calendar,
  Compass,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react';
import ClientPhotoGallery from '@/components/client/ClientPhotoGallery';
import ClientListingMap from '@/components/client/ClientListingMap';
import ShareButton from '@/components/client/ShareButton';

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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

  const absoluteImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const ogImages = photos.length > 0 ? [absoluteImageUrl(photos[0])] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages,
    },
  };
}

export default async function ClientShowcasePage({ params }: PageProps) {
  const { id } = await params;
  const plot = await prisma.plot.findUnique({
    where: { id },
    include: {
      saleRecord: {
        include: {
          review: true,
        },
      },
    },
  });

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

  let customAttributes: { label: string; value: string }[] = [];
  try {
    if (plot.customAttributes) {
      const parsed = JSON.parse(plot.customAttributes);
      if (Array.isArray(parsed)) {
        customAttributes = parsed.filter((item: { label?: string; value?: string }) => item && item.label && item.value);
      }
    }
  } catch {
    customAttributes = [];
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
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-slate-900 truncate max-w-[160px] sm:max-w-[280px]">
              {plot.title}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShareButton
              title={plot.title}
              priceText={formattedPrice}
              variant="header"
            />
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                plot.status === 'AVAILABLE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : plot.status === 'PENDING'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  plot.status === 'AVAILABLE'
                    ? 'bg-emerald-500'
                    : plot.status === 'PENDING'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              {plot.status === 'AVAILABLE'
                ? 'Available'
                : plot.status === 'PENDING'
                ? 'Under Offer'
                : 'Sold'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 space-y-6">
        {/* Photo Gallery Carousel */}
        <ClientPhotoGallery photos={photos} title={plot.title} />

        {/* Video Player */}
        {plot.videoUrl && (
          <div className="bg-black rounded-3xl overflow-hidden shadow-lg border border-slate-200">
            <div className="p-3 bg-slate-900 text-white text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-sky-400" />
                <span>Walkthrough Video</span>
              </div>
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
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block">
              Asking Price
            </span>
            <span className="text-3xl font-extrabold text-sky-700 tracking-tight block">
              {formattedPrice}
            </span>
          </div>

          {plot.description && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {plot.description}
              </p>
            </div>
          )}
        </div>

        {/* Quick Specs Grid */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Plot Specifications & Features
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Plot Size
              </span>
              <span className="font-semibold text-slate-900 text-sm sm:text-base">
                {sizeDisplay}
              </span>
            </div>

            {plot.zoning && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Zoning / Use
                </span>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {plot.zoning}
                </span>
              </div>
            )}

            {plot.roadAccess && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Road Access
                </span>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {plot.roadAccess}
                </span>
              </div>
            )}

            {plot.waterSource && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Water Source
                </span>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {plot.waterSource}
                </span>
              </div>
            )}

            {plot.electricity && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Electricity Grid
                </span>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {plot.electricity}
                </span>
              </div>
            )}

            {customAttributes.map((attr, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  {attr.label}
                </span>
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {attr.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* OpenStreetMap Location & Directions */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Exact Location
            </h2>
            <span className="text-xs text-slate-700 font-mono font-semibold">
              {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
            </span>
          </div>
          <ClientListingMap
            latitude={plot.latitude}
            longitude={plot.longitude}
            title={plot.title}
          />

          {/* Turn-by-Turn Driving Navigation (Apple Maps / Google Maps) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <a
              href={`https://maps.apple.com/?daddr=${plot.latitude},${plot.longitude}&q=${encodeURIComponent(plot.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-2xl shadow-sm transition-all touch-manipulation active:scale-[0.98] min-h-[44px]"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Open in Apple Maps</span>
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${plot.latitude},${plot.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition-all touch-manipulation active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-1.5"
              title="Open in Google Maps"
              aria-label="Open in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Google Maps</span>
            </a>
          </div>
        </div>

        {/* Verified Buyer Review & Social Proof */}
        {plot.saleRecord?.review?.isPublished && (
          <div className="bg-emerald-50/90 rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Buyer Review</span>
              </div>
              <div className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: plot.saleRecord.review.rating || 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-slate-800 text-sm sm:text-base italic font-medium leading-relaxed">
              &ldquo;{plot.saleRecord.review.comment}&rdquo;
            </p>
            <div className="text-xs text-slate-600 font-semibold pt-1 border-t border-emerald-100 flex items-center justify-between">
              <span>— {plot.saleRecord.review.buyerName}</span>
              <div className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {plot.saleRecord.titleStatus === 'TITLE_ISSUED'
                    ? 'Ready Title Deed Delivered'
                    : 'Verified Land Buyer'}
                </span>
              </div>
            </div>
          </div>
        )}

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
            aria-label={`Call agent ${agentName}`}
            className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
            title="Call Agent"
          >
            <Phone className="w-5 h-5" />
          </a>

          <ShareButton
            title={plot.title}
            priceText={formattedPrice}
            variant="floating"
          />
        </div>
      </footer>
    </div>
  );
}
