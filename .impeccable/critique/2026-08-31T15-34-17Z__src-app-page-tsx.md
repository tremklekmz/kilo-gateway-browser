---
target: the models browser surface
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-31T15-34-17Z
slug: src-app-page-tsx
---
# Design Critique — Kilo Gateway AI Model Explorer (`src/app/page.tsx` surface)

Method: dual-agent (A: DesignReview · B: DetectorScan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | URL sort divergence: select reads "Sorted by relevance" while the URL still claims `sort=price-asc` |
| 2 | Match System / Real World | 3 | "Gateway order" and bare "TerminalBench" are unexplained; the avg formula is discoverable only via hover title |
| 3 | User Control and Freedom | 3 | Reset wipes 10 filters in one click, no undo; no way back from relevance override |
| 4 | Consistency and Standards | 2 | Two "Reset" buttons with different scopes; "Copy" vs "Copy ID" between views; two greens for "free" |
| 5 | Error Prevention | 3 | Excellent inline validation at entry time; but invalid URL params are accepted with no "ignored" notice |
| 6 | Recognition Rather Than Recall | 3 | Grid Avg-pill meaning lives in a title-attribute hover only |
| 7 | Flexibility and Efficiency | 2 | No `/` to focus search, no keyboard pagination; 364 models = 8 click-only Load-more presses |
| 8 | Aesthetic and Minimalist Design | 2 | 13 provider colors + 4 modality colors + status colors compete; 4 gray levels collapse into murk |
| 9 | Error Recovery | 3 | EmptyState enumerates the exact active chips; ignored URL params get no diagnosis |
| 10 | Help and Documentation | 2 | TerminalBench scale and the weighted-average formula are never explained on-surface |
| **Total** | | **26/40** | **Acceptable — significant improvements before users are happy** |

Cognitive load checklist: 6/8 pass. Fails: **visual hierarchy** (the release date — the product's lens — is the smallest, dimmest element on the card at 10px zinc-400 while every badge is loud) and **minimal choices** (primary toolbar = 7 visible elements; sort select = 7 flat options; More-filters panel = 5 groups / 8 inputs at one level; provider combobox = 60 options, the one overloaded point properly mitigated by filter input + multiselect + keyboard support).

## Design Specificity Verdict

**Split: the data layer is authored for this product; the chrome is category-interchangeable.**

**LLM assessment** (~60% authored / 40% interchangeable):
- Authored: the cost-assumption summary repeats on every card ("Avg $X per 1M — assumes 50% output, 77.8% cache hit. Adjust in More filters."), in the panel, in chips, and in the URL; amber "unpriced hidden by price filter" chip + role=status line; "Varies" for -1 sentinel pricing; neon-green FREE / violet NEW brand tokens (`globals.css`); mono model-ID strip on every grid card; deliberate en-GB dates.
- Interchangeable: zinc-950/900 rounded-xl dark-admin shell; 13-color provider map + 4 modality colors as decoration (Google yellow, Meta blue, DeepSeek cyan carry brand association but no product meaning; Text modality and TerminalBench badge share sky-400 — two meanings, one hue); default Tailwind type census (16/14/12/11/10px) with no display moment.
- The core miss: **recency — PRODUCT principle 1 — has zero visual voice.** No relative time, no freshness axis, no grouping; a generic items-grid could ship this exact layout.

**Deterministic scan**: CLI scan of all 8 markup files returned **0 findings** — verified a true clean pass (a positive-control probe with known violations fired 5 findings / exit 2). All real defects live in computed rendering, caught by the in-page detector: **465 findings** (default grid), **328** (list view), **472** (More-filters open). Per rule: low-contrast 44–48, ai-color-palette 239–257, undersized-ui-text 40, tiny-text 6–71, nested-cards 134–135, line-length 1, text-overflow 1, all-caps-body 1. The detector caught issues the review missed: a **~152-char line** (hero sub), a **121px text overflow** in a list description, **uppercase body text** in More-filters labels, and the literal nested-cards pattern (StatPill boxes + copy strip inside each card).

**False-positive flag**: `ai-color-palette` (239–257 hits) is mass over-attribution — the rule fires per `<svg>` node, so one sky-400 icon emits 5+ findings. Treat it as **one systemic pattern** (sky-400 "default AI cyan-on-dark" badges — which also collide with the Text modality badge), not hundreds of separate issues.

**Visual overlays**: injection succeeded and the detector ran in-page during Assessment B (overlay boxes confirmed in DOM; 3 screenshots captured). The assessment tab and live server were then torn down per protocol, so **no live overlay is visible right now**; it can be re-surfaced in a [Human] tab on request.

## Overall Impression

The interface's ethical core — honest, shareable price math — is genuinely well-designed and rare. But the page undersells its one differentiating idea (recency is carried entirely by copy, not by the design), and its densest data fails the contrast floor the product itself commits to. Biggest opportunity: make freshness a visible axis and fix the gray-on-gray legibility floor.

## What's Working

1. **Honest-numbers information design.** One formula powers card display, price filtering, and price sorting; assumptions are echoed at every layer; unpriced models are counted and surfaced instead of silently dropped ("8 models without published prices hidden by the price filter"). Most model directories hide the math; this surface makes the math a first-class, shareable object.
2. **Progressive disclosure with state memory.** More-filters collapses 8 advanced inputs behind one button with an active-count badge, auto-expands when a shared URL carries range params, and never overrides the user's manual collapse choice. The empty state then re-discloses the exact active filters as chips.
3. **The provider combobox.** Full aria combobox/listbox semantics (activedescendant, arrow wrap, Enter/Space toggle, Escape with focus return), mobile bottom-sheet with labeled backdrop, aria-live no-match row. The most rigorously built control on the page — a model for the rest.

## Priority Issues

**[P0] Dense-data legibility fails WCAG AA across the card system**
- Why it matters: PRODUCT.md commits to "WCAG-legible contrast for dense numeric data." Measured on the live page: zinc-600 (#52525b) on zinc-950 = **2.57:1** (StatPill assumption note, footer), zinc-500 (#71717a) on zinc-900 cards = **3.67:1** (card descriptions, StatPill labels, hero sub) — the labels naming the numbers are the least legible pixels on the card, at 10–12px.
- Fix: lift on-card zinc-500 text to zinc-400 (6.9:1) and eliminate zinc-600 as a text color entirely; establish a label/value brightness step (labels zinc-500 on page bg, values zinc-200).
- Command: `/impeccable harden`

**[P1] Recency — the product's lens — is visually mute**
- Why it matters: principle 1 says "it must be obvious how fresh a model is." The release date is the smallest, dimmest element (10px zinc-400 grid / 11px list); NEW covers <4% of models; fresh vs 2-year-old cards are visually identical. The differentiating idea is carried by copy, not design.
- Fix: promote the date to a first-class scan signal — relative primary ("3d ago", "2mo ago" with absolute on hover), a slim freshness indicator for ≤30d cards, optionally month-sectioned grid. Date should outrank the model-ID row.
- Command: `/impeccable shape`

**[P1] Primary decision points exceed working-memory limits**
- Why it matters: 7 visible elements in the primary toolbar row, 7 flat sort options mixing recency/price/benchmark families, and 5 filter groups presented at one level — all measured live. Choosing a sort is a 7-way scan every time.
- Fix: cut the primary row to search + provider + More filters + count; group sort into labeled optgroups (Recency / Cost & benchmark); order the panel Price → Benchmark → Date → Assumptions with section headers; collapse the expert-only Cost-assumptions block by default.
- Command: `/impeccable distill`

**[P1] Shared-URL sort silently overridden**
- Why it matters: opening `/?q=glm&provider=z-ai&sort=price-asc` renders relevance order while the URL still claims `sort=price-asc` — sender and recipient see different orders for the same link, breaking PRODUCT principle 3 ("reproduce exactly") with no error shown.
- Fix: honor an explicit URL sort on shared loads (relevance stands down when a sort param exists); if relevance must win, announce the divergence with a one-click "Apply price order".
- Command: `/impeccable clarify`

**[P2] Mobile ergonomics: 630px of toolbar chrome before the first card; sub-44px targets on core actions**
- Why it matters: at 390×844 the toolbar stacks into 7 full-width rows before any model appears; ViewToggle buttons are 32×32, the mobile Copy button ~30×22 (label hidden below sm), and the "Copied!" success moment barely registers on touch.
- Fix: collapse the mobile toolbar to search + one "Filters (n)" sheet; raise ViewToggle/Copy to ≥44×44 hit areas via padding; keep the "Copied!" label visible on mobile or add a brief toast.
- Command: `/impeccable adapt`

## Persona Red Flags

**Alex (power user)**: No accelerators anywhere — no `/` to focus search, no j/k, no Esc-to-clear, no jump-to-end; 364 models = 8 click-only Load-more presses. Cards are dead ends: no click-through detail view; the only interactions are Copy, Show more, and a badge tooltip. Relevance override fights him: sharing `?sort=bench-desc&q=agent` lands on relevance order and he must re-pick his sort.

**Sam (accessibility)**: Failing contrast on core reading text (zinc-600 on zinc-950 = 2.57:1; zinc-500 on zinc-900 = 3.67:1 — StatPill labels, descriptions, dates, IDs, footer). Sub-44px targets: ViewToggle 32×32, mobile Copy 30×22, notice dismiss "×". "Copied!" is not announced (no aria-live on the copy state change); the grid Avg-pill explanation is a title attribute invisible to keyboard/AT; the TerminalBench tooltip opens on hover but not on focus (details toggle is the keyboard path). Violet focus rings and dark colorScheme date inputs are correct.

**Riley (stress tester)**: Invalid URL params are accepted into the UI then silently ignored — `?priceMin=-5&benchMin=7` populated inputs with -5 and 7, applied no filter (364/364), left the junk params live in the URL, and warned only about benchMin. Same class of value, three behaviors: benchMin=7 → red warning; priceMin=-5 → nothing; avgOutputShare=999 → amber clamp notice (the one handled case). Reset preserves `view` but silently skips cost assumptions — two "Reset" buttons with different scopes and no hint of it.

## Minor Observations

- Text modality badge and TerminalBench badge are both sky-400; Meta blue / Microsoft sky / DeepSeek cyan are near-identical at badge size.
- FREE badge is neon-green but free-model prices in list view render emerald-400 — two greens for one concept.
- Sort option casing mixes sentence ("Newest first") and title ("Price: Low to High") in the same select.
- "Gateway order" requires insider knowledge; "Provider default order" would be self-explanatory.
- The count readout shows "364 / 364" with no unit below sm.
- When pagination exhausts, the Load-more block simply vanishes — an "All 364 models shown" terminal line would close the loop (peak-end).
- Changing cost assumptions silently re-prices every visible card; only the panel's "Current: …" line changes — nothing explains the grid jump.
- The amber-notice dismiss "×" and combobox footer buttons are small touch targets.
- Reduced-motion, scrollbar theming, and color-scheme handling in `globals.css` are quietly solid.

## Questions to Consider

- If recency is the lens, why is the release date the smallest, dimmest text on the card — what would this page look like if "how fresh?" were answerable from across the room?
- Does a shared URL owe the recipient the sender's intent (price order) or the sender's session behavior (relevance ranking)? Which of the two conflicting states is the lie — and should the divergence be a visible contract rather than a silent one?
- Avg $/1M is the only number that changes under the user's own assumptions — should it be typographically marked as "yours" so a shared link's recipient can instantly tell tuned numbers from catalog truth?
