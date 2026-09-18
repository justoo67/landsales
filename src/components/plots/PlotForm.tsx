'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Upload,
  X,
  Video,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ArrowLeft,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';

const DynamicLocationPicker = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        Loading Map Picker...
      </div>
    ),
  }
);

interface PlotFormData {
  id?: string;
  title: string;
  status: string;
  priceType: string;
  priceKes: string;
  sizePreset: string;
  sizeCustomValue: string;
  zoning: string;
  roadAccess: string;
  waterSource: string;
  electricity: string;
  description: string;
  latitude: number;
  longitude: number;
  photos: string[];
  videoUrl: string;
}

interface PlotFormProps {
  initialData?: Partial<PlotFormData>;
  isEditing?: boolean;
}

export default function PlotForm({ initialData, isEditing = false }: PlotFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<PlotFormData>({
    title: initialData?.title || '',
    status: initialData?.status || 'AVAILABLE',
    priceType: initialData?.priceType || 'FIXED',
    priceKes: initialData?.priceKes || '',
    sizePreset: initialData?.sizePreset || '50x100',
    sizeCustomValue: initialData?.sizeCustomValue || '',
    zoning: initialData?.zoning || 'Residential',
    roadAccess: initialData?.roadAccess || 'All-weather gravel',
    waterSource: initialData?.waterSource || 'Borehole',
    electricity: initialData?.electricity || 'On-site',
    description: initialData?.description || '',
    latitude: initialData?.latitude || -1.2921,
    longitude: initialData?.longitude || 36.8219,
    photos: initialData?.photos || [],
    videoUrl: initialData?.videoUrl || '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const body = new FormData();
        body.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body,
        });

        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls],
      }));
    } catch (err) {
      console.error('Photo upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({
          ...prev,
          videoUrl: data.url,
        }));
      } else {
        throw new Error('Video upload failed');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      setError('Failed to upload video.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a plot title or reference name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/plots/${initialData?.id}`
        : '/api/plots';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save plot');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error saving plot');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Basic Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          1. Plot Identity & Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Plot Title / Identifier *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Plot 4B - Malaa Ridge, Kangundo Rd"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Current Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
            >
              <option value="AVAILABLE">🟢 Available</option>
              <option value="PENDING">🟠 Pending / Under Offer</option>
              <option value="SOLD">🔴 Sold</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Price (Kenyan Shillings)
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  priceType:
                    formData.priceType === 'FIXED'
                      ? 'CONTACT_AGENT'
                      : 'FIXED',
                })
              }
              className="text-xs text-sky-600 font-medium hover:underline touch-manipulation"
            >
              {formData.priceType === 'FIXED'
                ? 'Toggle "Price on Request"'
                : 'Toggle Numeric Price'}
            </button>
          </div>

          {formData.priceType === 'FIXED' ? (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-sm">
                KSh
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={formData.priceKes}
                onChange={(e) =>
                  setFormData({ ...formData, priceKes: e.target.value })
                }
                placeholder="1,500,000"
                className="w-full px-3.5 py-3 pl-14 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-lg font-bold"
              />
            </div>
          ) : (
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-800 text-sm font-medium">
              🏷️ Price is set to &ldquo;Contact Agent for Price&rdquo; (no numeric amount shown to clients)
            </div>
          )}
        </div>
      </div>

      {/* 2. Dimensions & Infrastructure */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          2. Land Size & Infrastructure
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Plot Size Preset
            </label>
            <select
              value={formData.sizePreset}
              onChange={(e) =>
                setFormData({ ...formData, sizePreset: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
            >
              <option value="50x100">50 × 100 ft (1/8 Acre)</option>
              <option value="40x80">40 × 80 ft</option>
              <option value="100x100">100 × 100 ft (1/4 Acre)</option>
              <option value="0.5 Acre">0.5 Acre</option>
              <option value="1 Acre">1 Acre</option>
              <option value="2 Acres">2 Acres</option>
              <option value="5 Acres">5 Acres</option>
              <option value="Hectares">Hectares (Ha)</option>
              <option value="CUSTOM">Custom Dimension...</option>
            </select>
          </div>

          {formData.sizePreset === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Custom Dimension / Area
              </label>
              <input
                type="text"
                value={formData.sizeCustomValue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sizeCustomValue: e.target.value,
                  })
                }
                placeholder="e.g., 2.5 Acres or 80x120 ft"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Zoning / Permitted Use
            </label>
            <select
              value={formData.zoning}
              onChange={(e) =>
                setFormData({ ...formData, zoning: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 min-h-[44px]"
            >
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Agricultural">Agricultural</option>
              <option value="Mixed-Use">Mixed-Use</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Road Access
            </label>
            <select
              value={formData.roadAccess}
              onChange={(e) =>
                setFormData({ ...formData, roadAccess: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 min-h-[44px]"
            >
              <option value="Tarmac road">Tarmac road</option>
              <option value="All-weather gravel">All-weather gravel</option>
              <option value="Graded dirt road">Graded dirt road</option>
              <option value="Footpath / Access right">Footpath / Access right</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Water Availability
            </label>
            <select
              value={formData.waterSource}
              onChange={(e) =>
                setFormData({ ...formData, waterSource: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 min-h-[44px]"
            >
              <option value="Borehole on-site">Borehole on-site</option>
              <option value="Piped county water">Piped county water</option>
              <option value="Seasonal river / stream">Seasonal river / stream</option>
              <option value="Water bowser needed">Water bowser needed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Electricity Grid
            </label>
            <select
              value={formData.electricity}
              onChange={(e) =>
                setFormData({ ...formData, electricity: e.target.value })
              }
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-900 min-h-[44px]"
            >
              <option value="Grid on plot boundary">Grid on plot boundary</option>
              <option value="Transformer nearby (<200m)">Transformer nearby (&lt;200m)</option>
              <option value="Solar / Off-grid required">Solar / Off-grid required</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Key Selling Highlights & Pitch
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g., Red soil, panoramic hill views, 500m from the main highway, ready freehold title deed..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
          />
        </div>
      </div>

      {/* 3. OpenStreetMap Location */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          3. Exact Map Location (OpenStreetMap)
        </h3>
        <p className="text-xs text-slate-500">
          Drop a pin where prospective buyers should drive to view the plot. Tap &ldquo;Use My GPS&rdquo; if currently on-site.
        </p>
        <DynamicLocationPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          onChange={(lat, lng) =>
            setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
          }
        />
      </div>

      {/* 4. Photos & Walkthrough Video */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          4. Photos & Walkthrough Video
        </h3>

        {/* Photos Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Property Photos
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {formData.photos.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
              >
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Photo Upload Button */}
            <label className="aspect-video rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-500 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 active:scale-98 min-h-[44px]">
              <Upload
                className={`w-5 h-5 text-slate-400 mb-1 ${
                  uploadingImage ? 'animate-bounce text-sky-600' : ''
                }`}
              />
              <span className="text-xs font-medium text-slate-600">
                {uploadingImage ? 'Uploading...' : 'Add Photos'}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Video Upload */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Walkthrough / Drone Video
          </label>
          {formData.videoUrl ? (
            <div className="relative max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-black">
              <video
                src={formData.videoUrl}
                controls
                playsInline
                className="w-full max-h-52 object-contain"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, videoUrl: '' })}
                className="absolute top-2 right-2 px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-medium shadow-md active:scale-90 transition-transform"
              >
                Remove Video
              </button>
            </div>
          ) : (
            <label className="max-w-sm px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-500 flex items-center gap-3 cursor-pointer transition-colors bg-slate-50 min-h-[48px]">
              <Video
                className={`w-5 h-5 text-slate-400 ${
                  uploadingVideo ? 'animate-pulse text-sky-600' : ''
                }`}
              />
              <div>
                <span className="text-xs font-semibold text-slate-700 block">
                  {uploadingVideo ? 'Uploading Video...' : 'Upload Phone Video'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  MP4 or MOV walkthrough clip
                </span>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={uploadingVideo}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Submit Action Bar */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-4 py-2.5 text-slate-600 hover:text-slate-900 rounded-xl text-sm font-medium transition-all min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </Link>

        <button
          type="submit"
          disabled={saving || uploadingImage || uploadingVideo}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-md shadow-sky-600/20 transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'Saving...' : isEditing ? 'Update Listing' : 'Publish & Get Link'}</span>
        </button>
      </div>
    </form>
  );
}
