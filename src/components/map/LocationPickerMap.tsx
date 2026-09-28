'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Check,
  X,
  AlertCircle,
  Link2,
  Clipboard,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

const REGION_PRESETS = [
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { name: 'Kangundo Rd', lat: -1.2882, lng: 37.1082 },
  { name: 'Kitengela', lat: -1.4886, lng: 36.9602 },
  { name: 'Juja/Thika', lat: -1.1026, lng: 37.0144 },
  { name: 'Nakuru', lat: -0.3031, lng: 36.0800 },
];

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
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Link pasting and manual input states
  const [pastedLink, setPastedLink] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkSuccessMessage, setLinkSuccessMessage] = useState<string | null>(null);

  const [manualLat, setManualLat] = useState(latitude ? latitude.toString() : '-1.2921');
  const [manualLng, setManualLng] = useState(longitude ? longitude.toString() : '36.8219');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Clear any leftover leaflet ID from Fast Refresh or StrictMode
      if ((mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (mapContainerRef.current as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }

      // Standard Leaflet retina icon setup
      const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const initialLat = latitude || -1.2921; // Nairobi default
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
        setManualLat(pos.lat.toFixed(6));
        setManualLng(pos.lng.toFixed(6));
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
        setManualLat(e.latlng.lat.toFixed(6));
        setManualLng(e.latlng.lng.toFixed(6));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate sizes in staggered ticks to ensure tiles render regardless of parent layout computations
      const timer1 = setTimeout(() => map.invalidateSize(), 100);
      const timer2 = setTimeout(() => map.invalidateSize(), 300);
      const timer3 = setTimeout(() => map.invalidateSize(), 800);

      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      };
    } else {
      if (latitude && longitude && markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      }
    }
  }, [latitude, longitude, onChange]);

  const applyCoordinates = (lat: number, lng: number, zoomLevel = 16) => {
    onChange(lat, lng);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], zoomLevel);
      mapInstanceRef.current.invalidateSize();
    }
  };

  const handleGetCurrentLocation = () => {
    setGpsError(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isSecure = window.isSecureContext;

    if (!isSecure && !isLocalhost) {
      setGpsError(
        'Mobile browsers require HTTPS for GPS access. Over HTTP, location is blocked by Safari & Chrome. Use "Paste Link / Pin" to paste a Google Maps link or enter coordinates directly.'
      );
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        applyCoordinates(pos.coords.latitude, pos.coords.longitude, 16);
      },
      (primaryErr) => {
        console.warn('High-accuracy GPS failed, trying network location fallback:', primaryErr);
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            setGpsLoading(false);
            applyCoordinates(fallbackPos.coords.latitude, fallbackPos.coords.longitude, 15);
          },
          (finalErr) => {
            setGpsLoading(false);
            console.error('Final Geolocation failure:', finalErr);
            if (finalErr.code === 1) {
              setGpsError(
                'Location permission was denied. Please allow location in your browser settings or use "Paste Link / Pin".'
              );
            } else if (finalErr.code === 2) {
              setGpsError('GPS satellite signal unavailable. Try outdoors or paste a Google Maps link.');
            } else if (finalErr.code === 3) {
              setGpsError('GPS request timed out. Please tap directly on the map or paste a link.');
            } else {
              setGpsError('Could not acquire GPS. Please tap on the map or paste a Google Maps link.');
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 300000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  // Resolve pasted link or raw coordinates via resolver API
  const handleResolveLink = async (textToResolve?: string) => {
    const rawInput = (textToResolve !== undefined ? textToResolve : pastedLink).trim();
    if (!rawInput) return;

    setResolvingLink(true);
    setGpsError(null);
    setLinkSuccessMessage(null);

    try {
      const res = await fetch('/api/resolve-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: rawInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract coordinates from link');
      }

      applyCoordinates(data.latitude, data.longitude, 16);
      setLinkSuccessMessage(`Pinned location: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`);
      setPastedLink('');

      // Auto-close modal after brief confirmation
      setTimeout(() => {
        setShowLocationModal(false);
        setLinkSuccessMessage(null);
      }, 1200);
    } catch (err: unknown) {
      console.error('Resolve location error:', err);
      if (err instanceof Error) {
        setGpsError(err.message);
      } else {
        setGpsError('Could not extract coordinates from link. Please check format.');
      }
    } finally {
      setResolvingLink(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedLink(text);
          handleResolveLink(text);
        }
      } else {
        setGpsError('Clipboard access is restricted. Please long-press and paste into the box.');
      }
    } catch {
      setGpsError('Clipboard permission needed. Long-press to paste directly into the field.');
    }
  };

  const handleApplyManual = () => {
    const parsedLat = parseFloat(manualLat);
    const parsedLng = parseFloat(manualLng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      applyCoordinates(parsedLat, parsedLng, 15);
      setShowLocationModal(false);
    }
  };

  const handleSelectPreset = (lat: number, lng: number) => {
    applyCoordinates(lat, lng, 14);
  };

  return (
    <div className="space-y-2.5">
      {/* Quick Region Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-slate-500 font-medium whitespace-nowrap pl-0.5">Quick jump:</span>
        {REGION_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handleSelectPreset(p.lat, p.lng)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium whitespace-nowrap min-h-[36px] touch-manipulation transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        {/* Map canvas - explicitly styled height to guarantee Leaflet tile calculations */}
        <div
          ref={mapContainerRef}
          className="w-full relative z-0"
          style={{ height: '320px', minHeight: '320px', width: '100%' }}
        />

        {/* Floating Actions overlay adhering to Apple HIG */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={gpsLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/95 backdrop-blur-md text-slate-800 font-semibold text-xs sm:text-sm rounded-xl shadow-md border border-slate-200/80 active:scale-95 transition-all min-h-[44px] touch-manipulation hover:bg-white"
          >
            <Navigation className={`w-4 h-4 text-sky-600 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Acquiring GPS...' : 'Use My GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLocationModal(!showLocationModal)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 backdrop-blur-md font-semibold text-xs rounded-xl shadow-sm border active:scale-95 transition-all min-h-[40px] touch-manipulation ${
              showLocationModal
                ? 'bg-sky-50 text-sky-700 border-sky-300'
                : 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-sky-600" />
            <span>{showLocationModal ? 'Close Link / Coords' : 'Paste Link / Coords'}</span>
          </button>
        </div>

        {/* Backdrop for mobile to dismiss modal by tapping anywhere */}
        {showLocationModal && (
          <div
            className="absolute inset-0 bg-slate-900/20 z-[440] backdrop-blur-[1px]"
            onClick={() => setShowLocationModal(false)}
          />
        )}

        {/* Manual coordinate & Link Input Sheet adhering to Apple HIG */}
        {showLocationModal && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-96 z-[450] bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 max-h-[90%] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Location Pin & Link
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Paste a WhatsApp pin, Google Maps URL, or type coordinates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-600 flex items-center justify-center transition-all touch-manipulation min-h-[32px] min-w-[32px]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Option: Paste Link or WhatsApp Pin */}
            <div className="space-y-2 p-3 bg-sky-50/60 border border-sky-100 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Paste Location Link</span>
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 px-2 py-1 bg-white border border-sky-200 rounded-md min-h-[30px] touch-manipulation active:scale-95 transition-transform"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Paste Clipboard</span>
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={pastedLink}
                  onChange={(e) => setPastedLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or -1.285, 36.821"
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 min-h-[42px]"
                />
                <button
                  type="button"
                  onClick={() => handleResolveLink()}
                  disabled={resolvingLink || !pastedLink.trim()}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation active:scale-95 transition-all shadow-xs"
                >
                  {resolvingLink ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Pin</span>
                </button>
              </div>

              {linkSuccessMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{linkSuccessMessage}</span>
                </div>
              )}
            </div>

            {/* Secondary Option: Manual Coordinates */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Or Enter Numeric Lat / Lng:</span>
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="-1.2921"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium text-[11px] mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="36.8219"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[40px]"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl min-h-[42px] touch-manipulation transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyManual}
                className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 min-h-[42px] touch-manipulation active:scale-95 transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Coordinates</span>
              </button>
            </div>
          </div>
        )}

        {/* Coordinate status footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <span>Tap anywhere on map, drag pin, or paste a link above.</span>
          </div>
          <div className="font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold">
            {latitude ? latitude.toFixed(6) : '0.000000'}, {longitude ? longitude.toFixed(6) : '0.000000'}
          </div>
        </div>

        {gpsError && (
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{gpsError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsError(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold px-1 py-0.5 touch-manipulation"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
