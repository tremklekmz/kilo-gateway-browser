---
target: src/app/page.tsx
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:E:\\Dev\\js\\kilo-gateway-browser\\src\\app\\page.tsx"
target_fingerprint: "sha256:7b6c1542972c77d3e14f2aae7b4f9c013115e097f9901b2c3cb0597313963cbe"
target_path: "E:\\Dev\\js\\kilo-gateway-browser\\src\\app\\page.tsx"
timestamp: 2026-09-02T16-26-32Z
slug: src-app-page-tsx
---
## Design Health Score

Operate surface; all 10 heuristics apply.

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Freshness, loading, count, copy confirmation, and errors are visible; initial Suspense fallback is null and filter updates have no explicit progress cue. |
| 2 | Match System / Real World | 3/4 | Latest, Free, $/1M, dates, and Copy ID fit developers; TB, Avg, and 0–1 scores need translation. |
| 3 | User Control and Freedom | 4/4 | Clear search, empty-state recovery, mobile close/done/Escape, and URL history provide strong exits. |
| 4 | Consistency and Standards | 3/4 | Shared zinc/violet recipes are strong; Copy ID vs Copy, grid/list density, and icon-only view controls drift. |
| 5 | Error Prevention | 3/4 | Constraints, URL sanitization, range guidance, and no-result warnings help; reset scope versus persisted cost assumptions is surprising. |
| 6 | Recognition Rather Than Recall | 3/4 | Labels and summaries help; TB, Avg, and title-only disclosures still require memory/hover. |
| 7 | Flexibility and Efficiency | 3/4 | URL state, relevance ordering, filters, sort, list/grid, paging, and persisted assumptions serve power users; no shortcuts or saved comparisons. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Calibration-bench restraint is coherent, but cards and expanded filters carry too many simultaneous groups and decisions. |
| 9 | Error Recovery | 3/4 | Plain-language error states, retry, filter chips, and clear-all work; stale-data/recovery methodology is absent. |
| 10 | Help and Documentation | 2/4 | Microcopy is good, but TerminalBench, pricing, provider, and training caveats lack in-context explanation. |
| **Total** | | **31/40** | **Good; significant improvements remain in clarity and density.** |

## Design Specificity Verdict

The interface is authored for Kilo Gateway rather than category-interchangeable: recency-first ordering, NEW badges, freshness stamp, honest weighted $/1M math, sparse TerminalBench signals, URL-shareable assumptions, mono IDs, and semantic color roles express the actual product. Its outer composition remains familiar (sticky dark header, search/filter row, four-column card grid), so specificity currently lives more in data semantics than in a distinctive interaction signature.

Deterministic detector: 0 CLI findings from the current rendered UI component targets (`src/components/ModelsBrowser.tsx`, `src/components/ModelCard.tsx`, `src/components/SearchFilter.tsx`, and `src/components/BenchValue.tsx`). Browser inspection also succeeded at 1440px desktop and 375px mobile. Desktop shows the header, hero, controls, benchmark strip, and four-column grid rendering correctly. Mobile shows the responsive header, hero, search field, Filters button, count/freshness status, benchmark strip, and single-column card layout rendering correctly. No visible horizontal overflow or runtime errors were observed. An earlier isolated browser visual scan reported 132 findings across 131 element groups; treat that result as historical. Its ai-color-palette and overused-font findings conflict with intentional DESIGN.md tokens, nested-card findings reflect stat tiles inside model cards, and text-occlusion findings targeted detector overlay labels. No current user-visible overlay is claimed.

## Overall Impression

Credible, restrained, and unusually honest for a model catalog. The single biggest opportunity is to turn dense evidence into a confident decision path: freshness, budget, and capability should lead; mechanics and caveats should be progressively disclosed.

## What's Working

1. Recency is structural: newest sorting, NEW badges, relative age, and freshness status directly serve the product lens.
2. Pricing is trustworthy: weighted Avg values are tied to explicit assumptions and shareable/persisted state.
3. Semantic restraint is excellent: violet means action, green means free, blue means benchmark, amber means caution, emerald means success.

## Priority Issues

### [P1] The default decision surface is cognitively overfull

**Why it matters:** Search, provider, sort, view, multiple card badges, descriptions, warnings, five stats, assumptions, dates, and copy actions compete in the first pass. This produces high extraneous load for both comparison and scanning.

**Fix:** Keep Search, Provider, Sort, and one recommended metric in the first pass. Group price/benchmark/date into a single Refine disclosure with presets such as Free, Under $X, Released recently, and Benchmarked. Lead cards with 2–3 comparison values; move caveats and IDs to secondary disclosure.

**Suggested command:** `/impeccable distill`, then `/impeccable layout`

### [P1] Cost and benchmark semantics are not self-explanatory at choice time

**Why it matters:** Avg $/1M, In, Out, TB, and 0–1 values require developer knowledge. Assumption context is hidden under More filters, and absent benchmark data can be misread as poor performance.

**Fix:** Add tappable/focusable disclosures for Avg and TerminalBench. Show benchmark as a consistently formatted percentage plus “not measured.” Place the active cost-basis summary beside the first Avg value.

**Suggested command:** `/impeccable clarify`

### [P1] Recency does not command enough visual authority

**Why it matters:** Freshness is the product’s differentiator, but card release information is a small date line and absolute dates depend on title/ARIA disclosure.

**Fix:** Put “Updated X ago” beside the hero heading/count, elevate “Released 2d ago” into the card header, explicitly label the 14-day NEW rule, and keep the absolute date one tap away.

**Suggested command:** `/impeccable layout`

### [P1] Reset semantics conflict with visible state

**Why it matters:** Custom cost assumptions contribute to active state/chips, but Reset filters intentionally preserves them. Users can reset results and still see custom Avg math without understanding why.

**Fix:** Either reset assumptions with all active state and call it Reset all, or split Filters from Cost basis in the state summary and give each explicit reset scope.

**Suggested command:** `/impeccable clarify`

### [P2] Contextual help depends too heavily on hover/title attributes

**Why it matters:** Mobile and keyboard users cannot reliably discover absolute dates, TerminalBench meaning, and copy affordance details. The detector’s historical tiny-text findings also warrant review.

**Fix:** Use focusable/tappable info buttons with short popovers, consistent visible labels, and an in-catalog methodology panel. Review 11px date/assumption metadata for hierarchy rather than shrinking further.

**Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (Power User):** URL state, relevance sorting, list/grid, and paging are strong, but there are no keyboard accelerators, saved comparison sets, or bulk ID copy. Reaching custom assumptions requires opening More filters rather than using a fast path.

**Jordan (First-Timer):** TB, Avg, In/Out, 0–1, and provider IDs are unexplained. Dense cards expose many competing numbers before a novice knows what matters. The training warning is consequential but not explained inline; no-result chips feel like query debugging.

## Minor Observations

- Tiny metadata meets the 11px floor but is easy to miss in a dark dense layout.
- List header “TB” and card “TerminalBench” should use one term.
- “Created date” and “Released” describe the same field inconsistently.
- Provenance names api.kilo.ai but not fetch timestamp/methodology.
- Grid/list has no first-use guidance about scan versus detail.
- Null Suspense fallback can create a blank first viewport under slow server rendering.

## Questions to Consider

1. If recency is the lens, why does freshness compete with five other metrics instead of leading the hero and every card?
2. What would happen if the first viewport asked only “What’s new?” and “What fits my budget?” while benchmark and cost mechanics appeared after that decision?
3. Is copying an ID really the product’s success moment, or should the interface end by making one model feel confidently chosen?
