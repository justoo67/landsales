'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Compass } from 'lucide-react';

interface ListingViewMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export default function ListingViewMap({
  latitude,
  longitude,
  title,
}: ListingViewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
    marker.bindPopup(`<b>${title}</b><br/>Exact GPS Coordinates`).openPopup();

    mapRef.current = map;
  }, [latitude, longitude, title]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={containerRef} className="w-full h-64 sm:h-72 z-0" />

      {/* Floating Driving Directions CTA adhering to Apple HIG */}
      <div className="absolute bottom-3 right-3 left-3 sm:left-auto z-[400]">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl shadow-lg active:scale-95 transition-all min-h-[44px] touch-manipulation"
        >
          <Compass className="w-4 h-4" />
          <span>🧭 Get Driving Directions</span>
        </a>
      </div>
    </div>
  );
}
