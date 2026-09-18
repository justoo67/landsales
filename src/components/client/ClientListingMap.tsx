'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/map/ListingViewMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
      Loading OpenStreetMap View...
    </div>
  ),
});

interface ClientListingMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export default function ClientListingMap({
  latitude,
  longitude,
  title,
}: ClientListingMapProps) {
  return <DynamicMap latitude={latitude} longitude={longitude} title={title} />;
}
