'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Upload,
  X,
  Video,
  Check,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/haptics';

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

export interface CustomAttribute {
  id: string;
  label: string;
  value: string;
}

export interface PlotFormData {
  id?: string;
  title: string;
  status: string;
  priceType: string;
  priceKes: string;
  sizePreset: string;
  sizeCustomValue: string;
  zoning?: string | null;
  roadAccess?: string | null;
  waterSource?: string | null;
  electricity?: string | null;
  description: string;
  latitude: number;
  longitude: number;
  photos: string[];
  videoUrl: string;
  customAttributes?: CustomAttribute[] | string | null;
}

interface PlotFormProps {
  initialData?: Partial<PlotFormData>;
  isEditing?: boolean;
}

const COMMON_SPEC_PRESETS = [
  { label: 'Soil Type', value: 'Red Volcanic Soil' },
  { label: 'Title Deed', value: 'Ready Freehold Title' },
  { label: 'Topography', value: 'Gentle Slope / Well Drained' },
  { label: 'Proximity', value: '300m to Main Tarmac' },
  { label: 'Security', value: 'Perimeter Wall & Gate' },
  { label: 'Payment Plan', value: 'Up to 6 Months Installments' },
];

export default function PlotForm({ initialData, isEditing = false }: PlotFormProps) {
  const router = useRouter();

  // Parse initial custom attributes
  const parseInitialAttributes = (): CustomAttribute[] => {
    if (!initialData?.customAttributes) return [];
    if (Array.isArray(initialData.customAttributes)) {
      return initialData.customAttributes;
    }
    try {
      const parsed = JSON.parse(initialData.customAttributes);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => ({
          id: item.id || `attr-${Date.now()}-${idx}`,
          label: item.label || '',
          value: item.value || '',
        }));
      }
    } catch {
      return [];
    }
    return [];
  };

  const [formData, setFormData] = useState<PlotFormData>({
    title: initialData?.title || '',
    status: initialData?.status || 'AVAILABLE',
    priceType: initialData?.priceType || 'FIXED',
    priceKes: initialData?.priceKes || '',
    sizePreset: initialData?.sizePreset || '50x100',
    sizeCustomValue: initialData?.sizeCustomValue || '',
    zoning: initialData?.zoning !== undefined ? initialData.zoning : 'Residential',
    roadAccess: initialData?.roadAccess !== undefined ? initialData.roadAccess : 'All-weather gravel',
    waterSource: initialData?.waterSource !== undefined ? initialData.waterSource : 'Borehole on-site',
    electricity: initialData?.electricity !== undefined ? initialData.electricity : 'Grid on plot boundary',
    description: initialData?.description || '',
    latitude: initialData?.latitude || -1.2921,
    longitude: initialData?.longitude || 36.8219,
    photos: initialData?.photos || [],
    videoUrl: initialData?.videoUrl || '',
  });

  // Toggles for removable standard fields
  const [showZoning, setShowZoning] = useState<boolean>(initialData?.zoning !== null);
  const [showRoad, setShowRoad] = useState<boolean>(initialData?.roadAccess !== null);
  const [showWater, setShowWater] = useState<boolean>(initialData?.waterSource !== null);
  const [showElectricity, setShowElectricity] = useState<boolean>(initialData?.electricity !== null);

  // Custom attributes state
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>(parseInitialAttributes());
  const [newSpecLabel, setNewSpecLabel] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  // Progressive Disclosure: accordion state for optional infrastructure & custom specs
  // If editing and has custom attributes or non-default specs, expand by default; else collapsed for speed
  const [specsExpanded, setSpecsExpanded] = useState<boolean>(
    isEditing && (customAttributes.length > 0 || !showZoning || !showRoad || !showWater || !showElectricity)
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom attribute handlers
  const handleAddCustomSpec = () => {
    if (!newSpecLabel.trim()) return;
    const newAttr: CustomAttribute = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: newSpecLabel.trim(),
      value: newSpecValue.trim() || 'Available',
    };
    setCustomAttributes((prev) => [...prev, newAttr]);
    setNewSpecLabel('');
    setNewSpecValue('');
  };

  const handleApplyPreset = (preset: { label: string; value: string }) => {
    // Avoid duplicate label
    if (customAttributes.some((a) => a.label.toLowerCase() === preset.label.toLowerCase())) {
      return;
    }
    const newAttr: CustomAttribute = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: preset.label,
      value: preset.value,
    };
    setCustomAttributes((prev) => [...prev, newAttr]);
  };

  const handleUpdateCustomSpec = (id: string, field: 'label' | 'value', val: string) => {
    setCustomAttributes((prev) =>
      prev.map((attr) => (attr.id === id ? { ...attr, [field]: val } : attr))
    );
  };

  const handleRemoveCustomSpec = (id: string) => {
    setCustomAttributes((prev) => prev.filter((attr) => attr.id !== id));
  };

  const uploadFileDirect = async (file: File): Promise<string> => {
    // 1. Try direct browser-to-R2 presigned upload (bypasses serverless payload limits)
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (presignedRes.ok) {
        const presignedData = await presignedRes.json();
        if (!presignedData.directFallback && presignedData.uploadUrl) {
          const uploadRes = await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          });

          if (uploadRes.ok) {
            return presignedData.publicUrl;
          }
          console.warn('Presigned PUT failed, falling back to /api/upload', uploadRes.status);
        }
      }
    } catch (presignedErr) {
      console.warn('Presigned upload attempt error:', presignedErr);
    }

    // 2. Fallback to /api/upload route
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to upload file');
    }
    const data = await res.json();
    return data.url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadFileDirect(files[i]);
        uploadedUrls.push(url);
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls],
      }));
      triggerHaptic('success');
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
      const url = await uploadFileDirect(file);
      setFormData((prev) => ({
        ...prev,
        videoUrl: url,
      }));
      triggerHaptic('success');
    } catch (err) {
      console.error('Video upload error:', err);
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removePhoto = (index: number) => {
    triggerHaptic('light');
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
      const url = isEditing ? `/api/plots/${initialData?.id}` : '/api/plots';
      const method = isEditing ? 'PATCH' : 'POST';

      // Build payload suppressing removed standard fields
      const payload = {
        ...formData,
        zoning: showZoning ? formData.zoning : null,
        roadAccess: showRoad ? formData.roadAccess : null,
        waterSource: showWater ? formData.waterSource : null,
        electricity: showElectricity ? formData.electricity : null,
        customAttributes: customAttributes.map((a) => ({
          label: a.label.trim(),
          value: a.value.trim(),
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save plot');
      }

      triggerHaptic('success');
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

  // Build summary subtitle for collapsed accordion
  const getSpecsSummary = () => {
    const activeStandard = [];
    if (showZoning && formData.zoning) activeStandard.push(formData.zoning);
    if (showRoad && formData.roadAccess) activeStandard.push(formData.roadAccess);
    if (showWater && formData.waterSource) activeStandard.push(formData.waterSource);
    if (showElectricity && formData.electricity) activeStandard.push(formData.electricity);

    const parts = [];
    if (activeStandard.length > 0) parts.push(activeStandard.join(' • '));
    if (customAttributes.length > 0) {
      parts.push(`${customAttributes.length} custom spec${customAttributes.length > 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'No optional specs configured';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Basic Info Card (Title, Status, Size & Price - ALWAYS VISIBLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          1. Plot Identity, Size & Pricing
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
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Plot 4B - Malaa Ridge, Kangundo Rd"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Current Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-base"
            >
              <option value="AVAILABLE">Available</option>
              <option value="PENDING">Pending / Under Offer</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
        </div>

        {/* Size Presets - Essential Core Field */}
        <div className="pt-1">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Plot Size / Dimensions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={formData.sizePreset}
              onChange={(e) => setFormData({ ...formData, sizePreset: e.target.value })}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-base"
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

            {formData.sizePreset === 'CUSTOM' && (
              <input
                type="text"
                value={formData.sizeCustomValue}
                onChange={(e) => setFormData({ ...formData, sizeCustomValue: e.target.value })}
                placeholder="e.g., 2.5 Acres or 80x120 ft"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-base"
              />
            )}
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
                  priceType: formData.priceType === 'FIXED' ? 'CONTACT_AGENT' : 'FIXED',
                })
              }
              className="text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold px-3 py-1.5 rounded-lg border border-sky-200/60 touch-manipulation min-h-[38px]"
            >
              {formData.priceType === 'FIXED' ? 'Switch to "Price on Request"' : 'Switch to Numeric Price'}
            </button>
          </div>

          {formData.priceType === 'FIXED' ? (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-base">
                KSh
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={formData.priceKes}
                onChange={(e) => setFormData({ ...formData, priceKes: e.target.value })}
                placeholder="1,500,000"
                className="w-full px-3.5 py-3 pl-14 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 min-h-[44px] text-lg font-bold"
              />
            </div>
          ) : (
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-800 text-sm font-medium">
              Price is set to &ldquo;Contact Agent for Price&rdquo; (no numeric amount shown to clients)
            </div>
          )}
        </div>
      </div>

      {/* 2. Exact Map Location (OpenStreetMap - ALWAYS VISIBLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          2. Exact Map Location (OpenStreetMap)
        </h3>
        <p className="text-xs text-slate-500">
          Drop a pin where prospective buyers should drive to view the plot. Tap anywhere on the map or tap &ldquo;Use My GPS&rdquo; if currently on-site.
        </p>
        <DynamicLocationPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          onChange={(lat, lng) =>
            setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
          }
        />
      </div>

      {/* 3. Photos & Walkthrough Video (ALWAYS VISIBLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          3. Photos & Walkthrough Video
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
                  className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center touch-manipulation active:scale-90 transition-transform z-10"
                  aria-label="Remove photo"
                >
                  <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
                    <X className="w-4 h-4" />
                  </span>
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
                className="absolute top-2 right-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium shadow-md active:scale-90 transition-transform min-h-[36px] touch-manipulation"
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

      {/* 4. Progressive Disclosure Accordion: Infrastructure, Utilities & Custom Specs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        {/* Accordion Header Bar (Apple HIG Disclosure control) */}
        <button
          type="button"
          onClick={() => setSpecsExpanded(!specsExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/80 active:bg-slate-100 transition-colors min-h-[52px] touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-900">
                  4. Infrastructure & Custom Specs
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {specsExpanded ? 'Hide additional utilities and custom fields' : getSpecsSummary()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
            {specsExpanded ? (
              <ChevronUp className="w-5 h-5 text-sky-600" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {specsExpanded && (
          <div className="p-5 sm:p-6 pt-2 border-t border-slate-100 space-y-6">
            {/* Standard Utilities (With Removable Options) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Standard Utilities & Access
                </span>
                <span className="text-[11px] text-slate-500">
                  Select &ldquo;Remove&rdquo; to exclude a field from the listing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Zoning Field */}
                {showZoning ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Zoning / Permitted Use
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowZoning(false)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-1 min-h-[36px] flex items-center gap-1 touch-manipulation"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <select
                      value={formData.zoning || 'Residential'}
                      onChange={(e) => setFormData({ ...formData, zoning: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-900 min-h-[44px] text-base"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Agricultural">Agricultural</option>
                      <option value="Mixed-Use">Mixed-Use</option>
                    </select>
                  </div>
                ) : null}

                {/* Road Access Field */}
                {showRoad ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Road Access
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRoad(false)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-1 min-h-[36px] flex items-center gap-1 touch-manipulation"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <select
                      value={formData.roadAccess || 'All-weather gravel'}
                      onChange={(e) => setFormData({ ...formData, roadAccess: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-900 min-h-[44px] text-base"
                    >
                      <option value="Tarmac road">Tarmac road</option>
                      <option value="All-weather gravel">All-weather gravel</option>
                      <option value="Graded dirt road">Graded dirt road</option>
                      <option value="Footpath / Access right">Footpath / Access right</option>
                    </select>
                  </div>
                ) : null}

                {/* Water Source Field */}
                {showWater ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Water Availability
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowWater(false)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-1 min-h-[36px] flex items-center gap-1 touch-manipulation"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <select
                      value={formData.waterSource || 'Borehole on-site'}
                      onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-900 min-h-[44px] text-base"
                    >
                      <option value="Borehole on-site">Borehole on-site</option>
                      <option value="Piped county water">Piped county water</option>
                      <option value="Seasonal river / stream">Seasonal river / stream</option>
                      <option value="Water bowser needed">Water bowser needed</option>
                    </select>
                  </div>
                ) : null}

                {/* Electricity Grid Field */}
                {showElectricity ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Electricity Grid
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowElectricity(false)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-1 min-h-[36px] flex items-center gap-1 touch-manipulation"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <select
                      value={formData.electricity || 'Grid on plot boundary'}
                      onChange={(e) => setFormData({ ...formData, electricity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-900 min-h-[44px] text-base"
                    >
                      <option value="Grid on plot boundary">Grid on plot boundary</option>
                      <option value="Transformer nearby (<200m)">Transformer nearby (&lt;200m)</option>
                      <option value="Solar / Off-grid required">Solar / Off-grid required</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {/* Restore removed standard fields */}
              {(!showZoning || !showRoad || !showWater || !showElectricity) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Add back standard utility:</span>
                  {!showZoning && (
                    <button
                      type="button"
                      onClick={() => setShowZoning(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium min-h-[36px] touch-manipulation transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Zoning
                    </button>
                  )}
                  {!showRoad && (
                    <button
                      type="button"
                      onClick={() => setShowRoad(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium min-h-[36px] touch-manipulation transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Road Access
                    </button>
                  )}
                  {!showWater && (
                    <button
                      type="button"
                      onClick={() => setShowWater(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium min-h-[36px] touch-manipulation transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Water Source
                    </button>
                  )}
                  {!showElectricity && (
                    <button
                      type="button"
                      onClick={() => setShowElectricity(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium min-h-[36px] touch-manipulation transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Electricity
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Custom Specifications & Kenyan Presets */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Custom Plot Specifications & Features
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Add parcel-specific attributes such as Soil Type, Title Deed type, Topography, or Fencing.
                </p>
              </div>

              {/* 1-Tap Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  1-Tap Kenyan Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SPEC_PRESETS.map((p) => {
                    const isAdded = customAttributes.some(
                      (a) => a.label.toLowerCase() === p.label.toLowerCase()
                    );
                    return (
                      <button
                        key={p.label}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleApplyPreset(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border touch-manipulation min-h-[38px] transition-all flex items-center gap-1.5 ${
                          isAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <Plus className="w-3 h-3 text-sky-600" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Custom Attributes List */}
              {customAttributes.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {customAttributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 sm:gap-3"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={attr.label}
                          onChange={(e) =>
                            handleUpdateCustomSpec(attr.id, 'label', e.target.value)
                          }
                          placeholder="Feature (e.g. Soil Type)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[44px] text-base sm:text-xs"
                        />
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) =>
                            handleUpdateCustomSpec(attr.id, 'value', e.target.value)
                          }
                          placeholder="Value (e.g. Red Volcanic)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[44px] text-base sm:text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSpec(attr.id)}
                        className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-600 active:scale-90 transition-transform touch-manipulation flex-shrink-0"
                        aria-label="Delete feature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Attribute Row */}
              <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Add Your Own Custom Specification:
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newSpecLabel}
                    onChange={(e) => setNewSpecLabel(e.target.value)}
                    placeholder="Specification Name (e.g. Tree Cover)"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[44px] text-base sm:text-xs"
                  />
                  <input
                    type="text"
                    value={newSpecValue}
                    onChange={(e) => setNewSpecValue(e.target.value)}
                    placeholder="Details (e.g. Mature Eucalyptus)"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[44px] text-base sm:text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpec}
                    disabled={!newSpecLabel.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Description & Pitch Textarea */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Key Selling Highlights & Pitch
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Red soil, panoramic hill views, 500m from the main highway, ready freehold title deed..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 text-base"
              />
            </div>
          </div>
        )}
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
