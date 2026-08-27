# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Developers choosing a model to call through the Kilo Gateway. They arrive wanting an up-to-date picture of what is available: what shipped recently, which version of a model family is current, and which option is the best, cheapest, or most capable fit for their task.

## Product Purpose
A fast, searchable overview of every model exposed by the Kilo Gateway API (`https://api.kilo.ai/api/gateway/models`), led by recency. It surfaces the latest releases first, makes pricing (per-model and weighted average under configurable cost assumptions), context length, modalities, TerminalBench scores, and training-data caveats comparable in one place. Success: a developer quickly sees what is new and confidently picks the most up-to-date model that fits budget, context, and capability.

## Positioning
Unified recency-and-comparison view: one searchable, filterable surface over all gateway providers where the newest releases lead and real $/1M-token pricing math (input/output/cache-weighted, assumptions adjustable and shareable via URL) and TerminalBench results sit beside each option — something reading provider docs directly cannot give.

## Operating Context
Used in a browser during development work, often alongside an editor/terminal. Model data is live from the gateway API, server-fetched with 60s revalidation and a client-side fallback. Filter/assumption state lives in the URL, so a filtered view is shareable. Cost assumptions persist in localStorage.

## Capabilities and Constraints
- Default view is newest-first: models sort by release date (API `created` timestamp) unless another sort is chosen; models without a real date (routers/placeholders, `created === 0`) sink to the end.
- Models released within the last 14 days carry a NEW badge in grid and list views.
- Search by model name, ID, or description; filter by provider, free-only, avg-price range, min TerminalBench score, max attempt cost, created-date range; sort by recency, gateway order, price, benchmark.
- Grid and list views; incremental paging (40/page).
- Per-card: provider badge, NEW badge, FREE badge, modality badges, TerminalBench tooltip, created date, copy-ID action, training-on-prompts warning.
- Model ID copy is a secondary action: available on every card, but the success moment is an informed overview, not the copy.
- Pricing strings are per-token from the API and normalized to $/1M for display.

## Brand Commitments
- Name: "Kilo Gateway — AI Model Explorer".
- Voice: technical, terse, developer-first; labels over sentences.

## Evidence on Hand
Live API data (`src/lib/constants.ts` → MODELS_API_URL). No testimonials, benchmarks beyond TerminalBench fields, or marketing assets exist — future work must not fabricate any.

## Product Principles
1. Recency is the lens: the newest releases lead, and it must be obvious how fresh a model is.
2. Numbers stay honest: prices reflect the user's own cost assumptions, visibly.
3. Shareable state: filters and assumptions reproduce exactly from a URL.
4. Copy when needed: the model ID is one glance away, but the overview is the destination.

## Accessibility & Inclusion
Standard web accessibility; dark-first interface. No product-specific requirement established beyond keyboard-reachable controls and WCAG-legible contrast for dense numeric data.
