'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Map,
  Filter,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Check,
} from 'lucide-react';

interface TourStep {
  id: string;
  targetId: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  positionPreference?: 'bottom' | 'top';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'add-plot',
    targetId: 'tour-add-plot',
    badge: 'Step 1 of 4',
    title: 'Add New Property',
    description:
      'Tap here to create a land listing. Capture plot dimensions, drop an exact GPS pin on OpenStreetMap, and upload parcel photos and walkthrough video.',
    icon: Plus,
    positionPreference: 'bottom',
  },
  {
    id: 'view-mode',
    targetId: 'tour-view-mode',
    badge: 'Step 2 of 4',
    title: 'List & Master Map View',
    description:
      'Toggle between a fast inventory list and an interactive territory map showing all your listed parcels across Kenya in real-time.',
    icon: Map,
    positionPreference: 'bottom',
  },
  {
    id: 'status-filters',
    targetId: 'tour-status-filters',
    badge: 'Step 3 of 4',
    title: 'Deal Pipeline Filters',
    description:
      'Filter your inventory by status: Available, Pending sales, or Sold. For closed or pending deals, you can manage buyer installments and conveyancing milestones.',
    icon: Filter,
    positionPreference: 'bottom',
  },
  {
    id: 'settings',
    targetId: 'tour-settings',
    badge: 'Step 4 of 4',
    title: 'Agent Profile & WhatsApp',
    description:
      'Configure your agent phone number and custom WhatsApp inquiry greeting so client leads connect straight to your WhatsApp without friction.',
    icon: Settings,
    positionPreference: 'bottom',
  },
];

interface AgentOnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentOnboardingTour({
  isOpen,
  onClose,
}: AgentOnboardingTourProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; arrowSide: 'top' | 'bottom' }>({
    top: 100,
    left: 20,
    arrowSide: 'top',
  });

  const step = TOUR_STEPS[currentStepIndex];

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(360, viewportWidth - 32);
    const tooltipHeight = 220; // approximate height

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Boundary check horizontal
    if (left < 16) left = 16;
    if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16;
    }

    // Determine vertical position
    let top = rect.bottom + 12;
    let arrowSide: 'top' | 'bottom' = 'top';

    // If bottom overflow, place above
    if (top + tooltipHeight > viewportHeight - 16) {
      top = Math.max(16, rect.top - tooltipHeight - 12);
      arrowSide = 'bottom';
    }

    setPopoverPos({ top, left, arrowSide });
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight' && currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen || !step) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('plotpilot_tour_completed', 'true');
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed last step!
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const StepIcon = step.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Full-screen SVG overlay with a transparent cutout hole for the target element */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
        onClick={handleDismiss}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White fills everything (opaque) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out the spotlight hole (100% transparent, crystal-sharp) */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dark overlay with the hole cut out */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Crisp glowing ring right around the cutout hole */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out rounded-2xl ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent shadow-lg shadow-sky-500/20"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Apple HIG Floating Tooltip Popover */}
      <div
        className="fixed transition-all duration-300 ease-out z-[101]"
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
          width: 'min(360px, calc(100vw - 32px))',
        }}
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-slate-900/40 text-slate-900 relative">
          {/* Header: Badge & Skip Button */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200/60 text-sky-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>{step.badge}</span>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 w-8 h-8 rounded-full flex items-center justify-center transition-all touch-manipulation"
              title="Skip Tour"
              aria-label="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Icon */}
          <div className="flex items-start gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-sky-200">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all touch-manipulation ${
                    idx === currentStepIndex
                      ? 'w-6 bg-sky-600'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons (Apple HIG >= 44x44pt touch area) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all min-h-[40px] touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 rounded-xl shadow-md shadow-sky-600/20 transition-all min-h-[40px] touch-manipulation"
              >
                <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                {isLastStep ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
