# Repository Guidelines

## Project Overview

Kilo Gateway — AI Model Explorer. A recency-first, searchable explorer of every AI model exposed by the Kilo Gateway API. Stack: **Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript (strict), Bun**.

Product lens is **recency**: newest releases lead, models released in the last 14 days carry a `NEW` badge, and placeholders (`created === 0`) sink to the end. The core job is to compare models by price (per-model + weighted average under user-configurable cost assumptions), context length, modalities, and sparse TerminalBench scores.

Documented principles (PRODUCT.md) you must respect: numbers stay honest (price reflects the user's own assumptions, shown visibly); state is shareable (filters reproduce exactly from a URL); **do not fabricate data** — there are no benchmarks beyond the `terminalBench` fields, no testimonials, no marketing assets.

## Architecture & Data Flow

**Single data source**: `MODELS_API_URL = "https://api.kilo.ai/api/gateway/models"` in `src/lib/constants.ts` — hardcoded, no `process.env` indirection anywhere in the repo.

**Dual-layer fetch (server-first, client fallback)**:

1. `src/app/page.tsx` is an **async Server Component**. `fetchModelsServer()` runs `fetch(MODELS_API_URL, { next: { revalidate: 60 } })` (ISR revalidated every 60s). It captures `fetchedAt = Date.now()` **once server-side** (comment: keep the timestamp identical server/client instead of recomputing per render). On failure it returns `{ models: null, fetchedAt: null }` — it never throws.
2. It renders `<Suspense fallback={null}><ModelsBrowser initialModels={models ?? undefined} initialUpdatedAt={fetchedAt ?? undefined} /></Suspense>`, passing a serializable snapshot across the Server→Client boundary.
3. `src/components/ModelsBrowser.tsx` is a **Client Component** (`"use client"`). If `initialModels` is `undefined` (server fetch failed), it fires a raw `fetch(MODELS_API_URL)` in a once-on-mount `useEffect`.

**URL-as-state engine** (the central pattern): `ModelsBrowser` is the orchestrator. Every filter, sort, view, and cost-assumption is serialized to URL params via `router.replace(newUrl, { scroll: false })` inside `startTransition` (see `updateUrl`). On load it derives sanitized state from `useSearchParams()`. It distinguishes its **own** writes from external navigation using `lastSelfWrittenQueryRef` / `searchParams.toString()` comparison so self-echoing `router.replace` calls never clobber in-flight typing. Invalid shared params are validated, named once in a dismissible amber `role="status"` notice, then pruned from the URL.

**Filter pipeline** (in `filteredModels` `useMemo`): search → provider (CSV multi-select) → free-only → avg-price range ($/1M) → `terminalBench.overallScore` min → `benchMaxCost` max → created-date range. Then **sort** (newest / default / price-asc|desc / bench-asc|desc). When a search query is active **and** the user hasn't explicitly picked a sort this session (`userPickedSort`), relevance ordering wins; placeholders always sink to the end. Pagination is 40/page (`PAGE_SIZE`).

**Coverage-gating is a hard product rule**: TerminalBench is sparse (only ~31/364 models, ~8.5%); pricing is full (364/364). Benchmark/value/leader signals must only render over the scored subset and never imply page-wide TB coverage. `pickBenchValueLeader` (in `src/components/BenchValue.tsx`) returns the cheapest model within the top score quartile, `null` when the scored subset is `< 5` — this deliberately avoids the naive score-per-dollar trap that would crown a free low-score model.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | App Router entry — `page.tsx` (server fetch), `layout.tsx` (root layout/metadata/fonts/dark mode), `globals.css` (Tailwind v4 `@theme` tokens), `favicon.ico` |
| `src/components/` | Client UI — `ModelsBrowser` (orchestrator), `SearchFilter`, `ModelCard`, `BenchValue`, `FreshnessStamp`, `ViewToggle`, `Pagination`, `SkeletonCard` |
| `src/lib/` | Pure utilities & types — `utils.ts` (price math, cost assumptions, formatting, search/recency), `types.ts` (`AIModel` etc.), `constants.ts` (API URL) |

## Development Commands

Run everything through **Bun**:

```bash
bun install        # install dependencies
bun dev            # next dev   (dev server, http://localhost:3000)
bun build          # next build (production build)
bun start          # next start (serve production build)
bun lint           # eslint (flat config, no --fix/--max-warnings)
bun typecheck      # tsc --noEmit (strict)
```

There is **no `test` script** and no test runner installed (see Testing & QA). `bun lint` + `bun typecheck` are the only automated quality gates.

## Code Conventions & Common Patterns

- **Server/Client boundary**: data must cross as a serializable snapshot (e.g. `initialModels`, `initialUpdatedAt`). An async Server Component fetches; `"use client"` components hold interactivity.
- **Hooks style**: `const [x, setX] = useState(...)`; derived data in `useMemo`; `export function ComponentName` (named, not default). Handlers are `handleXChange`, props are `onXChange`.
- **State is URL-first**: don't add ephemeral state for something that should deep-link. `view` (grid|list) is URL state and is deliberately preserved through reset — do not remove it.
- **Cost assumptions** persist in `localStorage` (defaults: 10% output token share, 77.8% input cache hit rate); URL params `avgOutputShare` / `avgCacheHitRate` override and are clamped via `normalizeCostAssumptions`.
- **Error handling**: per-callsite `try/catch`; the server returns a `null` shape (no throw); the client maps errors with `getFetchErrorMessage`. No global error boundary/provider.
- **No `cn`/clsx/tailwind-merge helper** — class strings are inline Tailwind literals. Reuse the shared recipes below instead of introducing a class-merge dep.
- **Comments are dense and explain *why*** (design rationale, edge cases, non-obvious timezone/`created`-unit reasoning). Preserve that voice; don't strip explanatory comments.
- **Styling recipes** (Tailwind, zinc monochrome + closed semantic palette):
  - Card: `rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200`.
  - Badge/pill: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0`.
  - Focus ring (interactivity accent): `focus-visible:ring-2 focus-visible:ring-violet-400`.
- **Color semantics are closed — never repurpose** (DESIGN.md "One Voice" / "Meaning-Only Color" rules): Signal Violet `#8b5cf6` = interactivity only; Terminal Green `#39ff14` (token `--color-neon-green`) = **free only**; Bench Blue (sky `#38bdf8`) = TerminalBench; Amber = caution; Emerald = copy-confirmed; Red = invalid/destructive. **`zinc-500`/`zinc-600` are banned for body copy** (fail contrast on the zinc field).
- **Typography**: Geist sans for human text; Geist Mono for model IDs only; 11px floor for functional text; containers capped at `max-w-screen-xl` (1280px).
- **Accessibility**: `role="group"`+`aria-label` on segmented controls, `aria-pressed` on toggles, `aria-live="polite"` for status/copy announcements, `aria-hidden` on decorative SVGs, tooltips via `id`+`aria-describedby`, 44px mobile tap targets (`max-sm:`). `FreshnessStamp` must stay **outside** any `aria-live` region (its 30s tick would re-announce).
- **A11y gotcha**: the two `aria-modal` surfaces (mobile filters sheet, provider popover) currently lack focus traps — if you touch them, add one.

## Important Files

| File | Role |
|------|------|
| `src/app/page.tsx` | Server Component; ISR fetch (60s); snapshots `fetchedAt`; renders `<ModelsBrowser>` |
| `src/app/layout.tsx` | Root layout; metadata; `<html lang="en" className="dark">`; Geist + Geist Mono via `next/font` |
| `src/app/globals.css` | Tailwind v4 `@import "tailwindcss"`; `@theme` tokens (`--color-neon-green`, `--color-neon-violet`, fonts); dark scheme; 150ms transitions + `prefers-reduced-motion` |
| `src/lib/constants.ts` | `MODELS_API_URL` (hardcoded) |
| `src/lib/types.ts` | `AIModel`, `ModelPricing`, `ModelArchitecture`, `TopProvider`, `TerminalBench`, `ModelsResponse` |
| `src/lib/utils.ts` | ~31 pure/isomorphic helpers: `getAveragePricePerMillion`, `normalizeCostAssumptions`, `formatUsd`, `formatPercent`, `formatProviderName`, `getUniqueProviders`, `getProviderFromId`, `relevanceScore`, `isFreeModel`, `hasPublishedPrice`, `areCostAssumptionsDefault`, `splitProviderParam`, `DEFAULT_COST_ASSUMPTIONS` |
| `src/components/ModelsBrowser.tsx` | Orchestrator: fetch/revalidate, URL sync, filter/sort pipeline, pagination, grid/list render |
| `src/components/SearchFilter.tsx` | Search input, provider combobox, More-filters panel, cost-assumption inputs, mobile bottom sheet |
| `src/components/ModelCard.tsx` | Card with grid + list branches; stat tiles; provider colorMap; FREE/NEW badges; TB disclosure; mono ID copy tray |
| `src/components/BenchValue.tsx` | Coverage-gated leader (`pickBenchValueLeader`, `MIN_SCORED_SUBSET = 5`) + `BenchValueStrip` |
| Config | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `bun.lock` |

## Runtime & Tooling Preferences

- **Package manager: Bun** (`bun.lock` present; no `package-lock`/`pnpm-lock`/`yarn.lock`). Use `bun dev|build|start|lint|typecheck` — never npm/yarn.
- **Runtime is Node-backed**: Next's dev/build/start execute under Node (Next 16 requires Node ≥ 20.9). Bun orchestrates but does not replace Node.
- **Pinned versions** (sensitivity): `next` **16.2.6** and `eslint-config-next` **16.2.6** are both exact and must stay equal; `react`/`react-dom` `^19.2.3`; `typescript` `^5.9.3` (peer-constrained `<6`); `tailwindcss` + `@tailwindcss/postcss` `^4.1.17`.
- **TypeScript**: `strict`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `noEmit`, `isolatedModules`. Path alias **`@/*` → `src/*`** (TS-only metadata; no `baseUrl`).
- **Tailwind v4 is CSS-first**: no `tailwind.config`, no `content` array. `src/app/globals.css` does `@import "tailwindcss"` + `@theme` tokens; `postcss.config.mjs` only wires `@tailwindcss/postcss`.
- **ESLint 9 flat config**: `eslint.config.mjs` spreads `eslint-config-next` (core-web-vitals + TS rules) with a single `node_modules` ignore.
- **`next-env.d.ts` is auto-generated and gitignored** — never hand-edit it.

## Testing & QA

- **No automated test suite exists**: no test/spec files, no `__tests__`, no `vitest`/`jest`/`playwright`/`cypress` config, no `test` script, no CI workflows, no Storybook. Confirmed by repo-wide search.
- **Quality gates** are `bun lint` + `bun typecheck`. QA is design-review driven through `/impeccable` (critique scored /40; latest 28/40; prior 26/40) plus browser verification at **1440px desktop and 375px mobile** before finishing.
- **Documented QA expectation**: benchmark/value signals must be coverage-gated (only render over the scored subset ≥ 5 models; never imply page-wide TerminalBench coverage). Respect the sparse-data reality — do not invent benchmark data.
- If you add tests, follow the observable-contract/behavioral style; there is no existing runner or convention to match, so state the framework you introduce.
