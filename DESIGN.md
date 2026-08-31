---
name: Kilo Gateway — AI Model Explorer
description: Recency-first dark instrument for comparing gateway models — calibrated zinc surfaces, honest numbers, color reserved for meaning.
colors:
  void: "#09090b"
  surface: "#18181b"
  surface-raised: "#27272a"
  line: "#3f3f46"
  line-strong: "#52525b"
  text-primary: "#f4f4f5"
  text-value: "#d4d4d8"
  text-secondary: "#a1a1aa"
  signal-violet: "#8b5cf6"
  signal-violet-deep: "#7c3aed"
  terminal-green: "#39ff14"
  bench-blue: "#38bdf8"
  warning-amber: "#fbbf24"
  success-emerald: "#34d399"
  danger-red: "#f87171"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.025em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.signal-violet-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-value}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "#e4e4e7"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  chip:
    backgroundColor: "rgba(39, 39, 42, 0.8)"
    textColor: "{colors.text-value}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  stat-pill:
    backgroundColor: "rgba(39, 39, 42, 0.6)"
    textColor: "{colors.text-value}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Kilo Gateway — AI Model Explorer

## Overview

**Creative North Star: "The Calibration Bench"**

This is an instrument panel for model data. The interface is a dark, near-monochrome zinc field that behaves like calibrated lab equipment: dense, labeled, and quiet, so that the numbers — prices, context lengths, benchmark scores — are the brightest, highest-contrast things on screen. The UI never competes with the data. Expression lives in precision (exact radii, a strict focus ring, aligned type) rather than in decoration; there are no gradients, no glow, no decorative imagery anywhere in the system.

Color is a closed semantic vocabulary, not a mood. Violet is the single interactive voice — focus, active state, primary action. Terminal green means exactly one thing: free. Amber means caution, emerald means success, red means invalid or destructive. Everything else is zinc. The only sanctioned chromatic expansion is provider wayfinding: each gateway provider may carry one hue on its badge, applied at the same 10%-tint / 20%-border / 400-level-text recipe, so the rainbow stays functional rather than decorative.

**Key Characteristics:**
- Dark-field zinc monochrome (950 field, 900 surfaces, 800 controls) with 1px tonal borders carrying all structure.
- One interactive accent (Signal Violet) used sparingly — focus rings, active toggles, primary buttons, NEW badges.
- Flat surfaces at rest; depth is earned on hover or floating layers only.
- Pill-shaped identity badges (full radius) against rounded-rectangle controls (8–12px) — the silhouette contrast between "what a model is" and "what you do".
- Numbers in semibold; machine identifiers (model IDs) always in mono.
- Motion is minimal and state-driven: 150ms color/property transitions, 200ms card lift, fully disabled under `prefers-reduced-motion`.

## Colors

A near-monochrome zinc field where every chromatic token is a semantic signal, spent at roughly 10% of any screen.

### Primary
- **Signal Violet** (#8b5cf6, hover-deep #7c3aed): the interactive voice. Focus-visible rings on every control, active view-toggle and filter states, primary "Done / Try again / Clear all" buttons, the violet NEW badge (text #c4b5fd on 15% tint), and footer links. Its rarity is the point: when violet appears, it means "you can act here".

### Secondary
- **Terminal Green** (#39ff14): the free signal, used only for the FREE badge, the "Free only" filter toggle (radio dot included), and $0 prices in list rows. Never decoration, never emphasis; if green appears, the model costs nothing.

### Tertiary
- **Bench Blue** (#38bdf8): TerminalBench scores and their tooltip headline — the capability signal, kept distinct from violet so benchmark and interactivity never blur.
- **Warning Amber** (#fbbf24 / #fcd34d): training-on-prompts warnings, clamped/invalid URL notices, unpriced-model chips. Amber is always advisory, never blocking.
- **Success Emerald** (#34d399): the copy-confirmed state only — a quiet "that worked".
- **Danger Red** (#f87171): range validation errors and the destructive hover on Reset.

### Neutral
- **Void** (#09090b): the page field and header backdrop (used at 80% + backdrop-blur for the sticky header).
- **Surface** (#18181b): cards, sheets, popover shells, input fields.
- **Raised** (#27272a): controls at rest (secondary buttons, stat pills at 40–60% alpha), hover fill on cards (50%).
- **Line** (#3f3f46): default 1px borders on every container and control; **Line Strong** (#52525b) is the hover border.
- **Text Primary** (#f4f4f5): headings and card titles; **Text Value** (#d4d4d8): numbers, model names, input text; **Text Secondary** (#a1a1aa): labels, descriptions, placeholders. Nothing darker is used for text — zinc-500 and below fail contrast on this field and are banned for copy.

### Named Rules
**The One Voice Rule.** Violet speaks only for interactivity and never exceeds ~10% of any screen; if violet appears on something you cannot click or toggle, the system is lying.
**The Meaning-Only Color Rule.** Every non-zinc color maps to exactly one meaning (violet = act, green = free, blue = benchmark, amber = caution, emerald = success, red = invalid). A color that carries no meaning is removed, not repurposed.
**The Provider Wayfinding Rule.** Provider badges may carry one hue each, always as 10% tint fill + 20% border + 400-level text (or zinc when unmapped); provider hue is identity, never state or emphasis.

## Typography

**Display/Body Font:** Geist (with full system-UI fallback stack) — loaded via `next/font` (`--font-geist-sans`) and mapped to the Tailwind theme as `--font-sans` in `globals.css`, so the sans voice renders Geist everywhere.
**Label/Mono Font:** Geist Mono (with system mono fallback) — loaded via `next/font` (`--font-geist-mono`) and mapped as `--font-mono`; reserved for model IDs.

**Character:** utilitarian and self-effacing; hierarchy comes from weight and size steps, never from a second typeface. Text is dense but never below an 11px floor.

### Hierarchy
- **Display** (700, 24px mobile / 30px desktop): the single hero statement ("Latest AI Models"); one per page.
- **Headline** (700, 16px): the brand lockup "Kilo Gateway" in the sticky header.
- **Title** (600, 14px): model names on cards and section labels inside panels.
- **Body** (400, 14px, hero paragraphs capped at `max-w-2xl`; card descriptions 12px at 1.625 line-height): descriptions and helper copy.
- **Label** (500, 12px, uppercase, +2.5% tracking): stat-pill labels, badges, micro-labels; 11px is the absolute floor for functional text (dates, assumption summaries, model IDs).
- **Mono** (11px): model IDs and nothing else — mono is the machine-identity voice.

### Named Rules
**The Two-Voice Rule.** Sans for everything human, mono for everything the machine identifies — never mix roles.
**The 11px Floor Rule.** No functional text renders below 11px; if content must shrink further, it must be cut, not shrunk.

## Layout

A single centered column on a `max-width: 1280px` container with responsive gutters (16px mobile → 24px → 32px). The sticky header (~64px, blurred zinc-950/80, bottom border) carries the brand lockup and view toggle; below it a compact hero (display line + one supporting sentence), then the control rows (search + sort + quick filters on desktop; stacked with a "Filters" button that opens a bottom sheet on mobile), then the model grid.

The grid is a 4-step responsive ladder: 1 column mobile, 2 at ≥640px, 3 at ≥1024px, 4 at ≥1280px, always 16px gaps. Cards pad 20px; list-view rows pad 16px with a 12px-gap column stack. Controls sit in 12px-gap flex rows; filter panel interiors use a 2-column field grid at ≥640px. Rhythm is an 8px base with 4px half-steps inside badges and pills. Mobile honors a 44px minimum interactive target (`max-sm` sizing) on every control, which desktop may relax.

## Elevation & Depth

Depth is flat-by-default and earned. At rest, surfaces separate by tone and 1px borders, never shadow; a card's hover state lightens its border one step, tints its fill, and raises a single soft black shadow — the only resting-surface shadow in the system. Genuinely floating layers (tooltips, the mobile filter sheet, the header's blur) may carry stronger shadows or backdrop blur because they physically hover.

### Shadow Vocabulary
- **Card lift** (`0 10px 15px -3px rgba(0,0,0,.2), 0 4px 6px -4px rgba(0,0,0,.2)`): hover state of model cards only.
- **Tooltip/popover** (`0 10px 15px -3px rgba(0,0,0,.3)` equivalent, `shadow-lg shadow-black/30`): floating disclosure panels.
- **Header veil** (`backdrop-blur(12px)` over #09090b at 80%): sticky header translucency, not a shadow.

### Named Rules
**The Earned Shadow Rule.** Surfaces are flat at rest; a shadow appears only as a response (hover) or for genuinely floating layers. Never rest a static shadow on a page element.

## Shapes

Rounded-rectangle discipline on a three-step ladder plus pills: 12px (cards, inputs, selects, panels, sheets), 8px (buttons, stat pills, code tray, tooltips), 6px (small badges, TB chip), full radius for identity pills (FREE / NEW / provider). Every container and control carries a 1px border from the Line scale — borders, not fills, define structure; backgrounds vary by at most one tonal step at a time. Clipping is rare (truncate and line-clamp do the containment work). Icons are 10–16px inline SVGs, 2–2.5 stroke, `currentColor`, and always inherit their parent's color.

## Components

### Buttons
- **Shape:** rounded rectangles (8px); comfortable padding (10px 16px primary, 6px 12px secondary); 44px min-height on mobile.
- **Primary:** solid Signal Violet-deep (#7c3aed) with white text; hover to #8b5cf6; used for page-level commits only (Done, Try again, Clear all filters).
- **Secondary:** Raised (#27272a) fill, Line border, zinc-300 text; hover lifts to #3f3f46 / stronger border; the Copy ID button switches to an Emerald-tinted state on success.
- **Ghost:** icon-only controls (copy inside the code tray, clear-search ×) are borderless zinc-400 that hover to zinc-200 on a zinc-700 fill.
- **Destructive-adjacent:** Reset stays neutral but hovers toward red border/text — destruction is hinted, never default.
- **Focus:** every button gets the violet focus ring (2px #a78bfa) via `focus-visible`.

### Chips (badges)
- **Style:** full-radius pills, 1px border, 12px text. Identity (provider) pills take a per-provider hue; status pills take their semantic color (FREE green, NEW violet, TB blue); neutral metadata chips are Raised-on-Line.
- **State:** chips are labels, not controls — the only interactive "chip-like" control is the Free-only toggle, which is a bordered rounded-xl button with a radio dot, green when active.

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** Surface (#18181b) on the Void field.
- **Border:** 1px zinc-800 at rest → zinc-600 on hover, with the card-lift shadow.
- **Internal Padding:** 20px (grid), 16px (list rows).
- **Anatomy:** name → badge row → description (2-line clamp with Show more) → optional amber training warning → 2×2 stat-pill grid → date line → mono ID + copy tray. List view compresses to a single row with inline stats.

### Inputs / Fields
- **Style:** Surface fill, Line border, 12px radius, 14px zinc-200 text, zinc-400 placeholder; selects and date ranges share the recipe (dark `colorScheme`).
- **Focus:** border shifts to Signal Violet with a 1px violet glow ring; keyboard focus adds the 2px violet ring. Never a color-only change.
- **Error:** inline red-400 validation text directly under the offending field pair, phrased as a plain-language consequence.
- **Disabled/Hidden:** panels stay mounted and hidden (`max-sm:hidden`, `details` disclosures) rather than unmounting, preserving state.

### Navigation
- **Style:** sticky blurred header with an 8px-radius logo tile (violet icon on Raised), 16px/700 brand, 12px zinc-400 subtitle; grid/list view toggle on the right as a two-button segmented control (active = zinc-700 fill, icons violet when active).

### Stat Pill (signature)
- **Shape:** 8px-radius inset tiles on a 40%-alpha Raised fill with 50%-alpha Line borders, centered uppercase 12px label over 14px semibold value.
- **Behavior:** optional `title`-based disclosure (e.g. the Avg pill explains its cost assumptions); the Avg value renders in Terminal Green when the model is free.

### Dismissible Notice
- **Style:** amber 10% fill, 30% border, 8px radius, 12px amber-300 text, with a 44px-min dismiss ×; announces via `role="status"`. The sole channel for URL/state advisories.

## Do's and Don'ts

### Do:
- **Do** give every interactive element the violet focus-visible ring (2px, #a78bfa) — it is the system's signature of interactivity.
- **Do** keep mobile touch targets at 44px minimum (`max-sm:min-h-[44px]`) on every interactive element, even when desktop is compact.
- **Do** render machine identifiers (model IDs) in mono, with a copy affordance and an `aria-live` "Copied!" confirmation.
- **Do** keep secondary text at zinc-400 (#a1a1aa) or lighter, and functional micro-text at ≥11px.
- **Do** reserve amber for advisory notices with a dismiss affordance, and confirm destructive-capable controls with a red hover before any red default.
- **Do** sort by recency by default and make freshness visible (relative age + absolute date on demand).

### Don't:
- **Don't** use gradients, glows, or decorative color — if a color has no meaning, it doesn't ship.
- **Don't** reuse a semantic color for a second meaning (Terminal Green means free; it is never "go" or "success").
- **Don't** rest a shadow on a static element; depth is hover-earned or floating-layer-only.
- **Don't** set text darker than zinc-400 on the Void field, and don't rely on `title`-attribute-only disclosures for touch or keyboard users — use a focusable, tappable disclosure.
- **Don't** add a new accent hue for a new concept; extend the semantic map (violet/green/blue/amber/emerald/red) or route it through provider wayfinding.
- **Don't** animate anything beyond the 150/200ms state transitions; respect `prefers-reduced-motion` globally.
