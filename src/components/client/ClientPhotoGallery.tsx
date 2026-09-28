'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, MapPin } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface ClientPhotoGalleryProps {
  photos: string[];
  title: string;
}

export default function ClientPhotoGallery({ photos, title }: ClientPhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 rounded-3xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400">
        <MapPin className="w-8 h-8 mb-2 text-slate-300" />
        <span className="text-sm">No photos available for this listing</span>
      </div>
    );
  }

  const nextPhoto = () => {
    triggerHaptic('light');
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    triggerHaptic('light');
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const diff = e.changedTouches[0].clientX - touchStartXRef.current;
      if (diff > 45) {
        prevPhoto();
      } else if (diff < -45) {
        nextPhoto();
      }
      touchStartXRef.current = null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Main Showcase Image */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-video sm:aspect-[16/10] rounded-3xl overflow-hidden shadow-sm bg-slate-900 border border-slate-200 group touch-pan-y"
      >
        <img
          src={photos[currentIndex]}
          alt={`${title} - Photo ${currentIndex + 1}`}
          className="w-full h-full object-cover select-none"
        />

        {/* Counter Badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-xs font-medium pointer-events-none">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Lightbox Trigger adhering to Apple HIG (min 44x44pt) */}
        <button
          onClick={() => setLightboxOpen(true)}
          type="button"
          className="absolute top-2 left-2 w-11 h-11 flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
          title="Fullscreen"
          aria-label="View fullscreen photo"
        >
          <span className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-sm">
            <Maximize2 className="w-4 h-4" />
          </span>
        </button>

        {/* Arrow Controls (if multiple photos) */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              type="button"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform touch-manipulation min-h-[44px] min-w-[44px]"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextPhoto}
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform touch-manipulation min-h-[44px] min-w-[44px]"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {photos.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {photos.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`View photo ${idx + 1}`}
              className={`relative w-16 h-12 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                currentIndex === idx
                  ? 'border-sky-600 scale-95 shadow-sm'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Close fullscreen view"
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={photos[currentIndex]}
            alt={`${title} Fullscreen`}
            className="max-h-[85vh] max-w-full object-contain rounded-2xl"
          />

          <div className="text-white text-xs mt-3 font-medium">
            {currentIndex + 1} of {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
