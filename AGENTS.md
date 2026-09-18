# Agent Instructions & Guidelines: LandSales Project

## 1. UI/UX & Mobile-First Design (Apple Design Skill)

All UI components, screen layouts, touch interactions, and visual styling for this project MUST follow Apple's Human Interface Guidelines (HIG), backed by the local **Apple Design Skill**.

* **Core Skill Instructions:** [SKILL.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/SKILL.md)
* **HIG Reference Index:** [hig-lookup.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig-lookup.md)

### Rules for UI Development:
1. **Always Load Foundation Guidelines:**
   * Accessibility: [accessibility.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/accessibility.md) (Strict $\ge 44 \times 44\text{ pt}$ touch targets, WCAG AA contrast).
   * Layout & iOS Conventions: [layout.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/layout.md) and [designing-for-ios.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/designing-for-ios.md) (Safe areas, Dynamic Island, Home Indicator padding).
   * Typography & Color: [typography.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/typography.md) and [color.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/color.md).
2. **Component-Specific Guidelines:**
   * Forms & Data Entry: [entering-data.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/entering-data.md), [text-fields.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/text-fields.md), [pickers.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/pickers.md).
   * Modals & Dialogs: [modality.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/modality.md), [sheets.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/sheets.md), [action-sheets.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/action-sheets.md).
   * Buttons & Controls: [buttons.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/buttons.md), [toggles.md](file:///home/justin/dev/brainstorm/.agents/skills/apple-design/references/hig/toggles.md).
3. **iPhone Safari Compatibility:**
   * All form inputs must have `font-size: 16px` or larger to prevent disruptive iOS Safari viewport zoom on focus.
   * Use proper `inputmode`: `inputmode="numeric"` for price inputs, `inputmode="tel"` for phone numbers.
   * Apply `touch-action: manipulation` on buttons and interactive elements to eliminate the 300ms tap delay.
   * Dynamic viewports: `viewport-fit=cover`, `min-h-dvh` (Dynamic Viewport Height).

---

## 2. Project Specifications & Deliverables
* Master Product Requirements: [SPECIFICATION.md](file:///home/justin/dev/brainstorm/SPECIFICATION.md)
