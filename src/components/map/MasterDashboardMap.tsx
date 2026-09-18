'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import Link from 'next/link';

interface PlotMarker {
  id: string;
  title: string;
  priceKes: number | null;
  priceType: string;
  status: string;
  sizePreset: string;
  sizeCustomValue: string | null;
  latitude: number;
  longitude: number;
}

interface MasterDashboardMapProps {
  plots: PlotMarker[];
}

export default function MasterDashboardMap({ plots }: MasterDashboardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = plots.length > 0
      ? [plots[0].latitude, plots[0].longitude]
      : [-1.2921, 36.8219];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: plots.length > 0 ? 12 : 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    plots.forEach((p) => {
      const color =
        p.status === 'AVAILABLE'
          ? '#16a34a'
          : p.status === 'PENDING'
          ? '#ea580c'
          : '#dc2626';

      const circleIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const formattedPrice =
        p.priceType === 'CONTACT_AGENT' || !p.priceKes
          ? 'Price on Request'
          : `KSh ${p.priceKes.toLocaleString('en-KE')}`;

      const marker = L.marker([p.latitude, p.longitude], { icon: circleIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: -apple-system, sans-serif; min-width: 160px; padding: 2px;">
          <b style="font-size: 14px; color: #0f172a;">${p.title}</b><br/>
          <span style="font-size: 13px; font-weight: 600; color: #0284c7;">${formattedPrice}</span><br/>
          <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Status: ${p.status}</span><br/>
          <a href="/dashboard/plots/${p.id}/edit" style="display: inline-block; margin-top: 6px; font-size: 12px; color: #0284c7; text-decoration: underline;">Edit Plot &rarr;</a>
        </div>
      `);

      bounds.extend([p.latitude, p.longitude]);
    });

    if (plots.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapRef.current = map;
  }, [plots]);

  return (
    <div className="relative w-full h-[500px] sm:h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Map Legend adhering to Apple HIG */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200/80 text-xs flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block border border-white" />
          <span className="text-slate-700 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-600 inline-block border border-white" />
          <span className="text-slate-700 font-medium">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white" />
          <span className="text-slate-700 font-medium">Sold</span>
        </div>
      </div>
    </div>
  );
}
