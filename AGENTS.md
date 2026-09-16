# Repository Guidelines

## Project Overview

Kilo Gateway — AI Model Explorer. A recency-first, searchable explorer of every AI model exposed by the Kilo Gateway API. Stack: **SolidJS 2.0 RC (signals, `@solidjs/web` renderer), Vite 8, Tailwind CSS 4, TypeScript (strict), npm**. Deployed as a static SPA on **GitHub Pages** under `/<repo>/`.

Product lens is **recency**: newest releases lead, models released in the last 14 days carry a `NEW` badge, and placeholders (`created === 0`) sink to the end. The core job is to compare models by price (per-model + weighted average under user-configurable cost assumptions), context length, modalities, and sparse TerminalBench scores.

Documented principles (PRODUCT.md) you must respect: numbers stay honest (price reflects the user's own assumptions, shown visibly); state is shareable (filters reproduce exactly from a URL); **do not fabricate data** — there are no benchmarks beyond the `terminalBench` fields, no testimonials, no marketing assets.

## Architecture & Data Flow

**Single data source**: `MODELS_API_URL = "https://api.kilo.ai/api/gateway/models"` in `src/lib/constants.ts` — hardcoded, no `process.env` indirection anywhere in the repo.

**Committed snapshot (CORS workaround)**: the gateway API sends no CORS headers, so a browser SPA cannot call it. `scripts/sync-models.mjs` (Node built-ins only) fetches the catalogue into `public/data/models.json`, which ships as a static asset. Locally: `npm run models:sync`. In CI: `.github/workflows/deploy.yml` runs every 15 minutes, commits the snapshot when its bytes changed, then builds and deploys. The app fetches only `MODELS_SNAPSHOT_URL` (`${BASE_URL}data/models.json`).

**URL-as-state engine** (the central pattern): `src/lib/appState.ts` owns the whole engine. Every filter, sort, view, and cost-assumption write lands in both the signal and the URL in one handler — `updateFilters` computes the next state, writes the signal, and serializes to query params via `history.replaceState` in the same synchronous step (Solid 2 staged writes forbid side effects inside functional setters), so the URL is the single shareable truth and a rendered frame never shows state the URL does not confirm. Search is debounced (250 ms); all other writes are immediate. There is no router, so the React port's self-echo suppression machinery does not exist here — `replaceState` fires no navigation events. Invalid shared params are validated, named once in a dismissible amber `role="status"` notice, then pruned from the URL once (notice persists until dismissed).

**Filter pipeline** (in `App.tsx`, `filtered` memo): search → provider (CSV multi-select) → free-only → avg-price range ($/1M) → `terminalBench.overallScore` min → `benchMaxCost` max → created-date range. Then **sort** (newest / oldest / default / price-asc|desc / bench-asc|desc). When a search query is active **and** the user hasn't explicitly picked a sort this session (`userPickedSort`), relevance ordering wins; placeholders always sink to the end. Pagination is 40/page (`PAGE_SIZE`).

**Coverage-gating is a hard product rule**: TerminalBench is sparse (only ~34/377 models, ~9%); pricing is full (377/377). Benchmark/value/leader signals must only render over the scored subset and never imply page-wide TB coverage. `pickBenchValueLeader` (in `src/lib/bench.ts`) returns the cheapest model within the top score quartile, `null` when the scored subset is `< 5` — this deliberately avoids the naive score-per-dollar trap that would crown a free low-score model.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/` | SPA source — `index.tsx` (entry, `render(() => <App />)`), `App.tsx` (shell + orchestrator), `index.css` (Tailwind v4 `@theme` tokens) |
| `src/components/` | UI — `SearchFilter`, `ModelCard`, `BenchValue`, `FreshnessStamp`, `ViewToggle`, `Pagination`, `SkeletonCard` |
| `src/lib/` | State & pure logic — `appState.ts` (URL-as-state engine, fetch), `utils.ts` (price math, cost assumptions, formatting, search/recency), `bench.ts` (coverage-gated leader), `types.ts`, `constants.ts` |
| `public/data/` | `models.json` — committed catalogue snapshot, refreshed by CI every 15 min |
| `scripts/` | `sync-models.mjs` — snapshot fetcher (local + CI) |
| `.github/workflows/` | `deploy.yml` — scheduled sync + Pages deploy |

## Development Commands

```bash
npm install        # install dependencies
npm run dev        # vite dev server (http://localhost:5173)
npm run build      # vite build (BASE_PATH=/<repo>/ for Pages subpath)
npm run preview    # serve the production build
npm run lint       # eslint (flat config, no --fix/--max-warnings)
npm run typecheck  # tsc --noEmit (strict)
npm run models:sync # refresh public/data/models.json (Node built-ins only)
```

Bun works too (`bun run dev`, etc.); there is no lockfile committed yet. There is **no `test` script** and no test runner installed (see Testing & QA). `npm run lint` + `npm run typecheck` are the only automated quality gates.

## Code Conventions & Common Patterns

- **Solid idioms**: props are getters — read `props.x` inside JSX/tracked scopes, never destructure; components run their setup **once**, so use `createSignal`/`createMemo`/`createEffect`, not React-style re-render assumptions. `onCleanup` for timers/listeners. `<For>` for keyed lists (no `key` prop), `<Show>` for conditionals.
- **State is URL-first**: don't add ephemeral state for something that should deep-link. `view` (grid|list) is URL state and is deliberately preserved through reset — do not remove it.
- **All filter mutations go through `AppState`** (`app.updateFilters`, `app.setSearch`, `app.setSortBy`, …) — never write the URL directly from a component.
- **Cost assumptions** persist in `localStorage` (defaults: 10% output token share, 77.8% input cache hit rate); URL params `avgOutputShare` / `avgCacheHitRate` override and are clamped via `normalizeCostAssumptions`.
- **Error handling**: per-callsite `try/catch`; fetch failures map through `getFetchErrorMessage` to the ErrorState surface. No global error boundary/provider.
- **No `cn`/clsx/tailwind-merge helper** — class strings are inline Tailwind literals. Reuse the shared recipes below instead of introducing a class-merge dep.
- **Comments are dense and explain *why*** (design rationale, edge cases, non-obvious timezone/`created`-unit reasoning). Preserve that voice; don't strip explanatory comments.
- **Styling recipes** (Tailwind, zinc monochrome + closed semantic palette):
  - Card: `rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200`.
  - Badge/pill: `inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium border shrink-0`.
  - Focus ring (interactivity accent): `focus-visible:ring-2 focus-visible:ring-violet-400`.
- **Color semantics are closed — never repurpose** (DESIGN.md "One Voice" / "Meaning-Only Color" rules): Signal Violet `#8b5cf6` = interactivity only; Terminal Green `#39ff14` (token `--color-neon-green`) = **free only**; Bench Blue (sky `#38bdf8`) = TerminalBench; Amber = caution; Emerald = copy-confirmed; Red = invalid/destructive. **`zinc-500`/`zinc-600` are banned for body copy** (fail contrast on the zinc field).
- **Typography**: Geist Variable sans for human text + Geist Mono Variable for model IDs only — self-hosted via `@fontsource-variable/*` packages, imported in `src/index.tsx`, tokens in `src/index.css` `@theme`. Use the role ramp classes (`text-display(-sm)`, `text-headline`, `text-title`, `text-body`, `text-value` + `tabular-nums`, `text-caption`, `text-micro`) — never raw `text-xs`/`text-sm`/arbitrary sizes beside them; 11px floor for functional text; containers capped at `max-w-screen-xl` (1280px).
- **Accessibility**: `role="group"`+`aria-label` on segmented controls, `aria-pressed` on toggles, `aria-live="polite"` for status/copy announcements, `aria-hidden` on decorative SVGs, tooltips via `id`+`aria-describedby`, 44px mobile tap targets (`max-sm:`). `FreshnessStamp` must stay **outside** any `aria-live` region (its 30s tick would re-announce). Both `aria-modal` surfaces (mobile filters sheet, provider popover) have focus traps — keep them when editing.

## Important Files

| File | Role |
|------|------|
| `src/index.tsx` | Entry: `render(() => <App />, #root)`; imports `index.css` |
| `src/App.tsx` | Shell + orchestrator: filter/sort pipeline memos, header/hero/main/footer markup, error/empty states, bench strip, grid/list render |
| `src/lib/appState.ts` | URL-as-state engine: `createAppState()` — filters signal, debounced search, replaceState writes, invalid-param prune + notices, snapshot fetch |
| `src/lib/bench.ts` | Coverage-gated leader (`pickBenchValueLeader`, `MIN_SCORED_SUBSET = 5`) |
| `src/index.css` | Tailwind v4 `@import "tailwindcss"`; `@theme` tokens (`--color-neon-green`, `--color-neon-violet`, fonts); dark scheme; 150ms transitions + `prefers-reduced-motion` |
| `src/lib/constants.ts` | `MODELS_API_URL` (hardcoded), `MODELS_SNAPSHOT_URL` (from `import.meta.env.BASE_URL`) |
| `src/lib/types.ts` | `AIModel`, `ModelPricing`, `ModelArchitecture`, `TopProvider`, `TerminalBench`, `ModelsResponse` |
| `src/lib/utils.ts` | ~30 pure helpers: `getAveragePricePerMillion`, `normalizeCostAssumptions`, `formatUsd`, `formatPercent`, `formatProviderName`, `getUniqueProviders`, `getProviderFromId`, `relevanceScore`, `isFreeModel`, `hasPublishedPrice`, `areCostAssumptionsDefault`, `splitProviderParam`, `DEFAULT_COST_ASSUMPTIONS` |
| `src/components/SearchFilter.tsx` | Search input, provider combobox, More-filters panel, cost-assumption inputs, mobile bottom sheet (receives `AppState` directly) |
| `src/components/ModelCard.tsx` | Card with grid + list branches; stat tiles; provider colorMap; FREE/NEW badges; TB disclosure; mono ID copy tray |
| `public/data/models.json` | Committed catalogue snapshot — the app's only data fetch |
| `scripts/sync-models.mjs` | Snapshot fetcher: Node built-ins only (CI runs it before `npm ci`) |
| Config | `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.mjs`, `index.html` |

## Runtime & Tooling Preferences

- **Package manager: npm** (CI uses `npm ci`; add a lockfile via `npm install` before merging). Bun works for local runs.
- **Pinned majors** (sensitivity): `solid-js` + `@solidjs/web` 2.0.0-rc.8 (pin exact while on the RC — upgrade together); `@solidjs/vite-plugin` ^3.0.0-next; `vite` ^8; `typescript` ^5.9 (peer-constrained `<6`); `tailwindcss` + `@tailwindcss/vite` ^4.1; `eslint` ^9 flat config with `typescript-eslint`.
- **TypeScript**: `strict`, `moduleResolution: "bundler"`, `jsx: "preserve"` + `jsxImportSource: "@solidjs/web"`, `noEmit`, `isolatedModules`. Path alias **`@/*` → `src/*`** — declared in `tsconfig.json` **and** mirrored in `vite.config.ts` `resolve.alias` (TS alone does not affect the build).
- **Tailwind v4 is CSS-first**: no `tailwind.config`, no `content` array. `src/index.css` does `@import "tailwindcss"` + `@theme` tokens; `@tailwindcss/vite` wires the plugin.
- **ESLint 9 flat config**: `typescript-eslint` recommended; ignores `node_modules`, `dist`, `public/data`, and harness dirs (`.omp`, `.impeccable`, `.kilo`).
- **GitHub Pages project site**: the workflow sets `BASE_PATH=/<repo>/`; `vite.config.ts` maps it to Vite's `base`. Do not hardcode absolute asset paths — `favicon.ico` is referenced relatively.

## Testing & QA

- **No automated test suite exists**: no test/spec files, no `__tests__`, no `vitest`/`jest`/`playwright`/`cypress` config, no `test` script, no Storybook. Confirmed by repo-wide search.
- **Quality gates** are `npm run lint` + `npm run typecheck`. QA is design-review driven through `/impeccable` plus browser verification at **1440px desktop and 375px mobile** before finishing.
- **Documented QA expectation**: benchmark/value signals must be coverage-gated (only render over the scored subset ≥ 5 models; never imply page-wide TerminalBench coverage). Respect the sparse-data reality — do not invent benchmark data.
- If you add tests, follow the observable-contract/behavioral style; there is no existing runner or convention to match, so state the framework you introduce.
