'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Fix Leaflet default icon paths in Next.js
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const initialLat = latitude || -1.2921; // Default to Nairobi area if 0
      const initialLng = longitude || 36.8219;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      if (latitude && longitude && markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      }
    }

    return () => {
      // Keep map reference stable across state rerenders
    };
  }, [latitude, longitude, onChange]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange(lat, lng);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 16);
        }
      },
      (err) => {
        setGpsLoading(false);
        console.error('GPS error:', err);
        setGpsError('Could not retrieve current GPS location. Please tap directly on the map.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-72 sm:h-80 z-0" />

      {/* Floating GPS & info bar adhering to Apple HIG */}
      <div className="absolute top-3 right-3 z-[400]">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={gpsLoading}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-white/95 backdrop-blur-md text-slate-800 font-medium text-sm rounded-xl shadow-md border border-slate-200/80 active:scale-95 transition-all min-h-[44px] touch-manipulation hover:bg-white"
        >
          <Navigation className={`w-4 h-4 text-sky-600 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>{gpsLoading ? 'Acquiring GPS...' : '📍 Use My GPS'}</span>
        </button>
      </div>

      {/* Coordinate status footer */}
      <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-sky-600" />
          <span>Tap anywhere on the map or drag the pin to set position.</span>
        </div>
        <div className="font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-slate-700">
          {latitude ? latitude.toFixed(6) : '0.000000'}, {longitude ? longitude.toFixed(6) : '0.000000'}
        </div>
      </div>

      {gpsError && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs">
          {gpsError}
        </div>
      )}
    </div>
  );
}
