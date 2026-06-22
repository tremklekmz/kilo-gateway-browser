# Active Context: Next.js Starter Template

## Current State

**Template Status**: ✅ Ready for development

The template is a clean Next.js 16 starter with TypeScript and Tailwind CSS 4. It's ready for AI-assisted expansion to build any type of application.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] AI Model Browser page — fetches from https://api.kilo.ai/api/gateway/models
- [x] ModelCard component with Copy Model ID button, provider badge, free badge, pricing stats
- [x] SearchFilter component — search by name/ID, filter by provider dropdown, live count
- [x] ViewToggle component — Grid / List view toggle
- [x] SkeletonCard / SkeletonGrid — animated skeleton loaders for loading state
- [x] ModelsBrowser orchestrator component with error state and empty state
- [x] Dark mode globals.css with zinc/slate palette, custom scrollbar, neon-green/violet theme vars
- [x] Updated layout.tsx metadata for Kilo Gateway AI Model Explorer
- [x] Price display: removed "/M" suffix from formatPrice (per 1M tokens is standard), added "per 1M tokens" note below stat pills
- [x] Free-only filter toggle in SearchFilter + ModelsBrowser (neon-green radio-style button)
- [x] Modality capability badges on ModelCard (Text/Image/Audio/Video) from architecture.input_modalities, with colored icons
- [x] Created comprehensive README.md with project overview and setup instructions
- [x] Client-side fallback fetch for models API — page.tsx now does a server-side fetch (with 60s revalidation); if it fails, ModelsBrowser receives no initialModels and triggers a client-side fetch via useEffect as fallback; skeleton loader shown during client fetch; error state shown only if both fetches fail
- [x] Expandable description in ModelCard — `ExpandableDescription` component detects actual DOM overflow and shows a "Show more / Show less" inline toggle; 2-line clamp in both grid and list views; "Show more" button only visible when text overflows
- [x] Created date display on ModelCard — shows "15 Jan 2024" format (en-GB, unambiguous) in grid and list views with calendar icon; skipped when `created === 0` (meta models / routers); `formatCreatedDate()` added to utils.ts
- [x] Sort by date — SearchFilter has a "Default order / Newest first / Oldest first" dropdown; ModelsBrowser sorts filteredModels accordingly
- [x] Incremental rendering with "Load More" pagination — ModelsBrowser renders 40 models at a time; "Load more models" button; visibleCount resets when filters change; avoids rendering 300+ DOM nodes simultaneously
- [x] URL-based filter persistence — filter state reads from URL params (?q=, ?provider=, ?free=true, ?sort=); added updateUrl() to sync state to URL; reset button clears all filters and navigates to "/"
- [x] Fixed URL/state synchronization in ModelsBrowser — updateUrl now receives next values to avoid stale query params; added searchParams-to-state sync effect for browser navigation and external URL updates
- [x] Fixed Next.js deployment prerender error on `/` by wrapping `ModelsBrowser` (uses `useSearchParams`) in a Suspense boundary in `src/app/page.tsx`
- [x] Added `calculateAveragePrice(cost: ModelCostInfo): number` utility to `src/lib/utils.ts` — weighted avg price per 1M tokens; uses `(cacheRead×0.7 + input×0.2 + output×0.1)` when cacheRead>0, else `(input×0.9 + output×0.1)`; displayed as "Avg" stat in both grid (2×2 StatPill layout) and list (inline) views in ModelCard
- [x] Added price sorting options — "Price: Low to High" (`price-asc`) and "Price: High to Low" (`price-desc`) added to sort dropdown in SearchFilter; ModelsBrowser sorts using `calculateAveragePrice`; URL persistence via `?sort=price-asc` / `?sort=price-desc`
- [x] Avg price range filter (priceMin / priceMax in $/1M tokens) and date range filter (dateFrom / dateTo, HTML5 date pickers); URL-persisted via `?priceMin=…&priceMax=…&dateFrom=…&dateTo=…`; presented in a collapsible "More filters" panel that auto-expands when any range is active and shows a count badge; models with `created === 0` are excluded from results when any date bound is active; inline warnings shown for `min > max` price or date ranges; shared `getAvgPricePerMillion` lambda inside `filteredModels` memo reused for both range filter and price sort
- [x] Display `terminalBench.overallScore` and `mayTrainOnYourPrompts` on ModelCard — added `TerminalBench` interface and optional `terminalBench` / `mayTrainOnYourPrompts` fields to `AIModel` in `src/lib/types.ts`; new `formatPercent()` helper in `src/lib/utils.ts`; `TerminalBenchBadge` ("T-Bench 74.2%") shown in header badge row when `terminalBench` is present; `TrainingWarning` amber alert shown above stats (grid) / below description (list) when `mayTrainOnYourPrompts === true`
- [x] TerminalBench filter + sort — added "Benchmark: Low to High" (`bench-asc`) and "Benchmark: High to Low" (`bench-desc`) sort options (sort by `terminalBench.overallScore`; models missing benchmark data sink to the end of the list). Added two independent single-value filters inside the "More filters" panel: "Min benchmark result" (`benchMin`, `overallScore >= value`, 0–1 scale) and "Max benchmark cost" (`benchMaxCost`, `avgAttemptCostUsd <= value` in USD, also keeps models with a score but no cost recorded). Models missing `terminalBench` data are excluded whenever either bound is active. URL persistence via `?benchMin=…&benchMaxCost=…&sort=bench-asc|bench-desc`
- [x] Fixed crash when sorting by benchmark with models missing `terminalBench` — the comparator previously assumed at least one of the two compared models had benchmark data; when both lacked it, the null-assertion dereference (`a.terminalBench!.overallScore`) threw `TypeError: can't access property "overallScore", e.terminalBench is undefined` and the whole page crashed. Added a `!aHas && !bHas → return 0` short-circuit so missing-data pairs are treated as equal.
- [x] Fixed `TerminalBenchBadge` mobile accessibility — replaced native `title` attribute (invisible on all touch devices) with a zero-JS `<details>`/`<summary>` pattern; tap to toggle on mobile, CSS `group-hover` keeps hover-reveal on desktop; disclosure triangle suppressed via `list-none` + `[&::-webkit-details-marker]:hidden`; popup panel is `absolute bottom-full` styled with dark zinc/amber palette matching the rest of the card.
- [x] TerminalBenchBadge hybrid hover/click tooltip — replaced CSS `group-hover:block` hack (bypasses DOM state, breaks native accessibility/animations) with React-driven hover logic on `<details>`: `useRef` on the details node, `onMouseEnter`/`onMouseLeave` programmatically toggle `details.open`, and `onClick` on `<summary>` calls `preventDefault` to avoid toggling closed on click. All handlers guard with `window.matchMedia("(hover: hover)").matches` so touch devices fall through to native tap-to-open behaviour. Tooltip visibility is now driven solely by `group-open:block` (the `open` attribute state).

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/components/ModelsBrowser.tsx` | Main client component with pagination state | ✅ Updated |
| `src/components/Pagination.tsx` | "Load More" button with visible/total count | ✅ New |
| `src/components/ModelCard.tsx` | Individual model card | ✅ Ready |
| `src/components/SearchFilter.tsx` | Search, filter, sort controls, reset button | ✅ Updated |
| `src/components/ViewToggle.tsx` | Grid/list view switcher | ✅ Ready |
| `src/components/SkeletonCard.tsx` | Loading skeleton placeholders | ✅ Ready |
| `src/lib/types.ts` | TypeScript interfaces | ✅ Ready |
| `src/lib/utils.ts` | Helper functions | ✅ Ready |
| `src/lib/constants.ts` | Constants (API URL) | ✅ Ready |
| `README.md` | Project documentation | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Current Focus

The template is ready. Next steps depend on user requirements:

1. What type of application to build
2. What features are needed
3. Design/branding preferences

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| 2026-06-12 | Added TerminalBench sort options (Low/High by `overallScore`; models without benchmark data sorted to the end) and two independent single-value filters — "Min benchmark result" (0–1) and "Max benchmark cost" (USD) — inside the "More filters" panel; models without benchmark data are excluded when either bound is active; URL persistence via `?benchMin`, `?benchMaxCost`, `?sort=bench-asc/bench-desc` |
| 2026-06-22 | Fixed TerminalBenchBadge mobile UX: replaced `title` attribute tooltip (not shown on touch devices) with native `<details>`/`<summary>` toggle — zero JS, tap on mobile, hover on desktop via CSS group-hover |
| 2026-06-22 | TerminalBenchBadge hybrid hover/click tooltip — desktop hover now drives `details.open` via React (`useRef` + `onMouseEnter`/`onMouseLeave`) guarded by `matchMedia("(hover: hover)")`; `onClick` on `<summary>` `preventDefault`s on hover-capable devices; tooltip shown via `group-open:block` only (removed `group-hover:block`); touch devices keep native tap-to-open |
| 2026-06-12 | Fixed page crash when sorting by benchmark score: bench-asc/bench-desc comparator now returns 0 when neither model has `terminalBench` data, instead of dereferencing `undefined` and throwing `TypeError: can't access property "overallScore", e.terminalBench is undefined` |
| 2026-06-12 | Display `terminalBench.overallScore` (as "T-Bench 74.2%" badge) and `mayTrainOnYourPrompts` (as amber warning) on ModelCard in both grid and list views; extended `AIModel` type and added `formatPercent` helper |
| 2026-05-22 | Added avg-price and date from-to range filters to the AI Model Browser; collapsible "More filters" panel with count badge and auto-expand on URL params; URL persistence via `?priceMin/priceMax/dateFrom/dateTo`; integrates with existing search/provider/free/sort filters and "Load More" pagination |
| 2026-05-20 | Added price sort options (Low to High / High to Low) to SearchFilter and ModelsBrowser; uses `calculateAveragePrice`; persisted in URL as `?sort=price-asc` / `?sort=price-desc` |
| 2026-05-20 | Added `calculateAveragePrice` utility and `ModelCostInfo` interface to utils.ts; ModelCard now shows weighted avg price (Avg stat) in both grid and list views |
| 2026-04-15 | Fixed deployment prerender failure on `/` by wrapping `ModelsBrowser` in `<Suspense>` in `src/app/page.tsx` because it uses `useSearchParams`; build now succeeds |
| 2026-04-15 | Fixed URL/state sync bugs in ModelsBrowser: prevented stale URL updates after setState and added resync from searchParams on URL changes |
| 2026-04-15 | Added URL-based filter persistence (?q=, ?provider=, ?free=true, ?sort=); added reset button to clear all filters |
| 2026-04-02 | Added incremental rendering ("Load More" pagination) to handle 300+ models; new Pagination component; visibleCount resets on filter change |
| 2026-03-18 | Added created date to ModelCard (en-GB format, hidden for timestamp=0); added sort-by-date dropdown (Newest/Oldest first) to SearchFilter + ModelsBrowser |
| 2026-02-25 | Fixed ExpandableDescription overflow detection — measure function now temporarily removes clamp styles before reading scrollHeight for accurate comparison; changed grid view from 3-line to 2-line clamp |
| 2026-02-22 | Added client-side fallback fetch: page.tsx does server-side fetch, ModelsBrowser falls back to client fetch if server fetch fails |
| 2026-02-18 | Created README.md and updated memory bank |
| Initial | Template created with base setup |
