# src/components — UI Components (Apple HIG)

Presentation + client interactivity, grouped by domain. All visual work MUST follow Apple's Human Interface Guidelines, backed by `.agents/skills/apple-design/`.

## STRUCTURE
```
components/
├── client/      # public buyer page: ClientPhotoGallery, ClientListingMap, ShareButton
├── common/      # OfflineBanner, ThemeSegmentedControl
├── deals/       # SaleRecordDrawer, DealLedgerModal (pipeline UI)
├── layout/      # AgentNavbar
├── map/         # Leaflet: LocationPickerMap, ListingViewMap, MasterDashboardMap
├── onboarding/  # AgentOnboardingTour
└── plots/       # PlotForm (listing builder)
```

## CONVENTIONS
- Interactive components start with `'use client'`; Leaflet components MUST be client-only (window-dependent) and are dynamically imported by their pages.
- Icons: `lucide-react`. Styling: Tailwind utility classes only — no CSS modules.
- Colors use the `slate` scale + `sky` primary. Dark mode remaps the slate vars globally (see `globals.css`), so use `bg-slate-50 text-slate-900` — **not** `dark:` variants.
- Use `.pt-safe` / `.pb-safe` for Dynamic Island / Home Indicator padding.

## APPLE HIG RULES (mandatory)
- Touch targets ≥ 44×44pt: `min-h-[44px] min-w-[44px]` (or `w-11 h-11`).
- Add `touch-manipulation` to interactive elements; `active:scale-95` for press feedback.
- Never drop form input font below 16px — global CSS forces 16px `!important` to stop iOS Safari focus zoom; do not override.
- `inputmode="numeric"` for KES price, `inputmode="tel"` for phone; `min-h-dvh` for full-height views.
- Frosted surfaces: `backdrop-blur-xl bg-white/85`; squircle cards `rounded-2xl` / `rounded-3xl`.
- Full HIG reference set: `.agents/skills/apple-design/`.

## ANTI-PATTERNS
- Do NOT render Leaflet on the server — wrap in `'use client'` + dynamic import with `ssr: false`.
- Do NOT add `dark:` utility variants for base surfaces — the theme system remaps slate tokens.
- Do NOT hardcode hex colors — use Tailwind tokens / CSS vars from `globals.css`.
- Do NOT import server-only modules (`@/lib/auth`) into client components.

## SEE
- `PlotForm.tsx` (955 LOC) is the canonical form pattern: KES formatting, size presets, GPS capture, client-side image compression, R2 presigned uploads.
