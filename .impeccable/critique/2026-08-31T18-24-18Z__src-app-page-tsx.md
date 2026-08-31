---
target: critique
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-31T18-24-18Z
slug: src-app-page-tsx
---
Method: dual-agent (A: AssessmentA · B: AssessmentB)
> **Revised 2026-08-31 (post-critique data review):** Findings 1, 2, and 4 were re-examined against live
> gateway data (364 models; TerminalBench coverage 31/364 = 8.5%; pricing coverage 364/364 = 100%).
> Corrections appear inline as "Data-grounded revision" under each affected finding; the full evidence table
> is in "Addendum: TerminalBench coverage evidence" at the end. Original findings are preserved verbatim.

# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No data-freshness indicator anywhere despite revalidate=60 and a recency-led premise; Load-more click has no feedback |
| 2 | Match System / Real World | 3 | "Avg $/1M" is invented math requiring a tooltip to decode; chip says "Gateway order" while the select says "Provider default order" |
| 3 | User Control and Freedom | 3 | TerminalBench tooltip can't be dismissed by outside tap on touch; everything else (Reset, clear, Escape, dismissible notices) is solid |
| 4 | Consistency and Standards | 3 | Neon green = FREE badge AND active "Free only" filter (two meanings, one color); amber = training warning AND URL notices; wording drift between select and chips |
| 5 | Error Prevention | 3 | Excellent range validation with plain-language consequences; nothing at stake needs stronger prevention |
| 6 | Recognition Rather Than Recall | 3 | Grid cards hide the Avg-price basis in a tooltip (list rows show it inline); "relevance" mode is implicit and only visible in the select's disabled option |
| 7 | Flexibility and Efficiency | 3 | Full URL-state + localStorage + combobox keyboard nav are strong; no "/" shortcut, no saved presets, no multi-model compare |
| 8 | Aesthetic and Minimalist Design | 3 | "Text" modality badge on nearly every card is repeated noise; list meta line is a dense key-value wall |
| 9 | Error Recovery | 3 | Raw "HTTP 500: Internal Server Error" from the fetch is rendered verbatim to end users (ModelsBrowser.tsx:485 → ErrorState) |
| 10 | Help and Documentation | 1 | Zero help: TerminalBench scale unexplained (is 73% good?), Avg-price math unexplained beyond tooltip, no link to Kilo docs/glossary |
| **Total** | | **28/40** | **Good — address weak areas, solid foundation** |

Cognitive load: 2 checklist failures (chunking ≤4, minimal choices ≤4) + 2 partial failures (visual hierarchy, working memory) → **moderate**. Overloaded decision points: sort select (8 options in one popup), expanded More-filters panel (6 groups, ~10 inputs, SearchFilter.tsx:584-825), provider combobox (60 providers, mitigated by its filter input).

# Design Specificity Verdict

**MID — an authored data layer wearing a category-interchangeable shell.**

**LLM assessment**: The product logic is genuinely specific: recency-first sort with NEW<14d (utils.ts:288-331), assumptions-aware "Avg $/1M" with shareable URL params + localStorage (utils.ts:29, ModelsBrowser.tsx:198-220), TerminalBench badge carrying avg attempt cost (ModelCard.tsx:124-199), gateway model-ID copy as the primary action, unpriced-model (-1 sentinel) handling surfaced as an amber chip (ModelsBrowser.tsx:92, 865). But the visual identity is the default 2025 dev-tool kit: zinc-950 + violet-500 + rounded-xl, Geist, 40 identical stat-pill cards. The only brand risk taken is one neon-green (#39ff14, globals.css:4) spent entirely on the FREE badge. TerminalBench — the differentiator — gets a 10px icon chip visually identical in weight to a "Text" modality badge. Missed product character: no freshness timestamp anywhere (data revalidates every 60s, page.tsx:8, but the user is never told how fresh "newest" is), and the promise "pick the current best" (ModelsBrowser.tsx:932) is never followed by any recommendation signal.

**Deterministic scan**: CLI scan of src/app + src/components was **CLEAN** (exit 0, 59 rules, 9 files; positive control confirmed the scanner fires). The in-page detector run told a different story: **44 anti-patterns in the live DOM** — 38 `ai-color-palette` + 6 `tiny-text`. The gap is real information: the palette findings come from dynamic class strings (the 13-hue provider color map in ModelCard.tsx:64-78 and sky-400 TerminalBench accents) that regex scanning of source cannot see because Tailwind classes are assembled at runtime. The detector caught the full provider-color rainbow the LLM review underweighted (it called out violet + neon green only). False-positive flags: 18 of the 38 palette hits are chevron SVG strokes inheriting cyan from their parent TerminalBench `<summary>` — one root cause counted per element, not 18 issues; provider pills are a defensible identity system, though 13 hues does fight the zinc/violet base. The 6 `tiny-text` hits (11px spans: "This provider may train on your prompts.", model IDs, "per 1M" suffix) are mostly intentional secondary metadata — except the training warning, which is a message users must notice and should not sit below 12px.

**Visual overlays**: The detector ran live in a [Human]-labeled browser tab during the scan (injection via eval after a script-element transport quirk in the harness) and its overlay was visible there while it ran; that tab has since been released, so no persistent overlay remains. Console summary: `[impeccable] 44 anti-patterns found`.

# Overall Impression

This is a rigorous, well-engineered browser that stops one step short of its own product promise. State management (URL + localStorage + sanitized deep links), feedback on the critical action (Copy ID), and consistent interaction states are genuinely above average. But the hero says "pick the current best" and then hands the user 40 uniform cards and leaves the synthesis to them. The single biggest opportunity: make TerminalBench and price work together visibly — right now the differentiator is a 12px blue chip competing with a "Text" badge.

# What's Working

1. **URL-as-state done properly** — every filter/sort/view/assumption serializes, deep-links auto-expand the relevant panel (SearchFilter.tsx:496-498), invalid shared params are sanitized, named in a dismissible notice, then pruned from the URL (ModelsBrowser.tsx:583-620). Rare, rigorous shareability — exactly what PRODUCT.md principle 3 demands.
2. **The commit action is the best-executed interaction**: Copy ID with 44px mobile targets, icon swap + "Copied!" confirmation, clipboard fallback (ModelCard.tsx:414-430).
3. **Genuinely consistent state system**: violet focus-visible rings on every interactive element, real prefers-reduced-motion handling (globals.css:50-58), calm amber notice language ("Ignored invalid filter(s) from link: priceMin=-5"), informative per-view skeletons.

# Priority Issues

1. **[P1] No decision support at the moment of choice.**
   The hero promises "pick the current best" but the UI offers no best-value signal, no price-vs-benchmark anchor, no compare selection; the user does all synthesis mentally across 40 uniform cards. This is the product's entire job (PRODUCT.md: developers picking a model); everything else is search plumbing.
   **Fix**: add one authored signal — e.g. a "best TB $/attempt" or score-per-$ leader marker on the leading card, or a compact price-vs-score mini-axis in list view; alternatively make bench-desc a default sort toggle alongside Newest.
   **Command**: `/impeccable shape`
   **Data-grounded revision (2026-08-31):** The proposed value math is coverage-bound: both `overallScore` and
   `avgAttemptCostUsd` live inside `terminalBench`, so score-per-dollar exists for the same 31/364 models (8.5%)
   and nowhere else. A naive score-per-$ leaderboard crowns the free NVIDIA Nemotron ($0 cost, 0.155 score) and
   ranks a 0.31-score model second — cheap-mediocre wins, so a page-wide "best value" crown would mislead. The
   Fix line's fallback is stale: a `bench-desc` sort toggle already ships (SearchFilter.tsx:449-450) and already
   sinks unscored models in both directions (ModelsBrowser.tsx:805-818). Surviving shape, coverage-gated: render
   a leader/value marker only over the currently-filtered scored subset and only when it holds ≥5 models (users
   who set Min benchmark result self-select coverage); a price-vs-score scatter over the 31 scored points,
   labeled "scored models only," is also defensible. Never blend the 100%-coverage price signal (FREE badge,
   price sort) with the 8.5%-coverage capability signal into a global ranking.

2. **[P1] TerminalBench is buried below its importance.**
   The differentiating benchmark renders as a 12px sky-blue chip identical in weight to modality badges (ModelCard.tsx:170); no scale context (0-1? %? is 0.73 good?); tooltip only on hover/tap. Its `<details>` popover is also a hover-trap on desktop (opens on enter, click is preventDefault-ed) and on mobile opens upward over the card above, won't close on outside tap, and the badge is a 22px target (60.75×22 measured at 375px) — below WCAG 2.5.8's 24px minimum and far below the app's own 44px convention.
   **Fix**: promote TB into the 2×2 stat grid (or 5-across on xl), add a one-line scale hint in the tooltip ("0-100, agentic terminal tasks"), give the chip its own accent, and replace the hover-trap popover with a tap-friendly disclosure that closes on outside tap.
   **Command**: `/impeccable layout`
   **Data-grounded revision (2026-08-31):** The emphasis premise dies on coverage: TerminalBench data exists for
   31/364 models, and only 6 of the 40 cards on the default first page carry it — TB differentiates a small
   scored subset, not the page. "Promote TB into the stat grid" must be conditional on data presence; the
   91.5% of cards without a score should truthfully read "not measured," which makes sparsity visible instead
   of implying universality. Unaffected by coverage and still valid: the missing scale hint (live range
   0.155–0.762; say "0–100, agentic terminal tasks"), the 22px tap target vs the app's own 44px convention,
   the desktop hover-trap `<details>`, and the no-outside-tap-close defect.

3. **[P1] Avg $/1M depends on invisible state.**
   The headline number is a function of cost assumptions edited in a collapsed panel (SearchFilter.tsx:760); grid cards disclose the basis only in a hover tooltip (ModelCard.tsx:593) — title-attribute only, invisible to keyboard and most AT. List rows mitigate ("per 1M · 10% output, 77.8% cache hit"); grid cards don't. A user comparing $0.4463 vs $0.7524 must remember both numbers share a hidden basis. The clamped-assumption amber warning (ModelsBrowser.tsx:972-989) is evidence this opacity already causes real confusion.
   **Fix**: show the assumption suffix inline on grid cards too (list view already does, ModelCard.tsx:508-510), or add a persistent one-line strip above the grid whenever custom assumptions are active.
   **Command**: `/impeccable clarify`

4. **[P2] List view can't be scanned for comparison.**
   List mode — the comparison mode — keeps card-style inline key-value runs instead of aligned numeric columns (ModelCard.tsx:485-528): Context/In/Out/Avg are flex-wrapped spans, so prices can't be scanned down a column and shift horizontally per row. Power users switch to list precisely to compare prices.
   **Fix**: right-aligned numeric columns for Context/In/Out/Avg/TB/Age on desktop; let description truncate to one line.
   **Command**: `/impeccable layout`
   **Data-grounded revision (2026-08-31):** User challenged the premise: do we need list view at all? Analysis:
   keep it, but redefine its job as the comparison table. Pricing exists for 364/364 models, so price/context
   columns are fully servable for every row (TB renders as a sparse "—" column — honest); `view=list` is
   URL-shared state and PRODUCT.md commits to grid+list, so deletion is a product-doc change, not cleanup;
   ModelCard.tsx renders the same data twice (list branch 454-544, grid branch 546-636), which argues for
   consolidating into one table-true list, not for deleting. Counter-case: on mobile list rows wrap to
   near-card heights, so the advantage is desktop-only, and no usage data exists to prove anyone toggles.
   Recommendation: table-ize (right-aligned numeric columns, TB as sparse column, assumption suffix as column);
   clean-kill alternative (delete list branch, drop `view` from URL sanitize, update PRODUCT.md) remains open.
   Decision pending user.

5. **[P2] Freshness is asserted, never shown.**
   Cards show relative age ("3d") with the absolute date only in a title attribute (ModelCard.tsx:601-604) — lost on touch. The dataset never shows when it refreshed (revalidate=60, ModelsBrowser.tsx:8). For a recency-led explorer, "how new is this data" is the first trust question, and the end-of-list moment ("All 364 models shown", 12px zinc-400) is the emotional floor: no next step, no summary, no freshness stamp.
   **Fix**: add "Updated X min ago" near the count readout; render the absolute date as visible text on max-sm instead of title-only.
   **Command**: `/impeccable adapt`

# Persona Red Flags

**Alex (Power User)**: List view — the comparison view — has no column alignment; prices can't be scanned down a column (ModelCard.tsx:485-513). No multi-model compare or pin: choosing between 5 candidates means mental tabulation of 2×2 pill grids across a 4-col grid. Cost-assumption reset lives only inside panel → nested details (SearchFilter.tsx:786). No "/" search shortcut, no sort by benchmark-per-dollar even though both inputs exist in the data.

**Sam (Accessibility)**: Both aria-modal=true surfaces lack focus traps — mobile filters sheet (SearchFilter.tsx:955-960) and provider popover (SearchFilter.tsx:188-192) — keyboard users tab straight through the backdrop into the page behind. StatPill info rides on title attribute only (ModelCard.tsx:303): the Avg-pill's assumption disclosure is effectively hover-only. TB tooltip is role=tooltip but never receives focus. 22px TB tap target vs the app's own 44px standard on copy/clear — same surface, two standards.

**Casey (Mobile)**: TerminalBench badge is a 22px tap target; tooltip opens upward over the card above and won't close on outside tap. Sort and provider live only behind a second tap (Filters sheet). Hero + controls consume ~300px before the first card; at scrollY=200 the first card is still partially below fold — recency content pushed off the first glance. Native date pickers show cryptic "dd----yyyy" placeholders (aria-label only).

# Minor Observations

- h1 is the 16px brand lockup while the page topic "Latest AI Models" is an h2 (ModelsBrowser.tsx:912, 928) — inverted heading order.
- ErrorState shows raw HTTP status text to end users (ModelsBrowser.tsx:485, 1016).
- Sort chip label "Gateway order" ≠ select option "Provider default order" (ModelsBrowser.tsx:850 vs SearchFilter.tsx:440).
- Modality "Text" badge is ~90% redundant across cards — 40× per page of zero-information pills.
- Mobile count readout is centered under a left-aligned search (SearchFilter.tsx:892).
- "Load more models" gives no acknowledgment; new cards render below the fold (40/364 → 80/364 happens off-screen).
- End-of-list note only appears after Load more, so 364-model single-page results never confirm completeness.
- Scroll position correctly preserved on view toggle (verified: scrollY 2000 after toggle) — good.
- 40 visible cards but 46 `.group` matches — TerminalBenchBadge's `<details>` also carries `group`; harmless but makes card-count assertions brittle in tests.

# Questions to Consider

- If TerminalBench score is the capability proxy this tool exists to surface, why does a heatmap of first-fixation land on four identical zinc stat pills instead of it?
- Does anyone actually change cost assumptions — or should the tool pick 10%/77.8%, defend it in one line, and delete two expert inputs?
- What does "NEW" mean to a weekly visitor — would "Added to gateway 12 Aug" (absolute, always visible) build more trust than a badge that silently expires at day 15?

# Addendum: TerminalBench coverage evidence (2026-08-31, live API)

Pulled from `https://api.kilo.ai/api/gateway/models` at review time:

| Fact | Value |
|---|---|
| Models in API | 364 |
| Models with TerminalBench data | 31 (8.5%) |
| TB-scored models in the default first page (newest 40) | 6 |
| Models with real pricing | 364 (100%) |
| TB overallScore range | 0.155 – 0.762 |
| TB avgAttemptCostUsd range | $0.00 (free) – $113.54 |

Notes for future runs acting on this snapshot:

- Findings 1 and 2 are coverage-gated: any value signal, leader marker, or TB promotion must render only for
  scored models and must not imply page-wide benchmark coverage.
- "Questions to Consider" item 1 (why TB doesn't headline the stat grid) inherits the same coverage bound —
  TB cannot headline a page where 91.5% of rows have no score.
- Finding 4's list-view question was raised by the user and answered with a recommendation (keep + table-ize);
  it is a pending product decision, not a settled fix.
