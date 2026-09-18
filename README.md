# Kilo Gateway AI Model Explorer

A recency-first, searchable explorer of every AI model exposed by the Kilo Gateway API — built as a SolidJS single-page app on Vite, hosted on GitHub Pages.

## Features

- **Recency-First Overview**: Opens sorted by release date; models released in the last 14 days carry a NEW badge, so the latest versions lead.
- **Advanced Filtering**: Filter by provider (multi-select), free/paid status, average price range, TerminalBench score/cost, and created-date range.
- **URL as State**: Every filter, sort, view, and cost assumption serializes to the URL — every shared link reproduces the exact view.
- **Honest Numbers**: Prices are blended using user-configurable cost assumptions (output token share, cache hit rate), always shown visibly.
- **Grid & List Views**: List view is a true comparison table with aligned numeric columns.
- **Dark Mode**: Zinc monochrome field with violet (interactivity), neon-green (free), sky (TerminalBench) semantic accents.

## Tech Stack

- **Framework**: [SolidJS 1.9](https://www.solidjs.com/) (signals, no virtual DOM)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (CSS-first `@theme` tokens)
- **Language**: [TypeScript 5.9](https://www.typescriptlang.org/) (strict)
- **Hosting**: GitHub Pages (project site, `/<repo>/` subpath)

## Data Pipeline

`api.kilo.ai` sends no CORS headers, so a browser SPA cannot call it directly. Instead the
catalogue is snapshotted into the repo and shipped as a static asset:

1. `public/data/models.json` — committed snapshot of the gateway catalogue.
2. `bun run models:sync` — refetches the catalogue into that file (runtime built-ins only; no
   dependencies required).
3. A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs every 15 minutes: it
   snapshots the catalogue, commits it when the bytes changed, builds, and deploys to Pages.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 (package manager, script runner, and runtime).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Refresh the local catalogue snapshot (optional; a recent one is committed):
   ```bash
   bun run models:sync
   ```
4. Start the development server:
   ```bash
   bun run dev
   ```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

- `src/App.tsx` — SPA shell and orchestrator: filter/sort pipeline as Solid memos.
- `src/lib/appState.ts` — URL-as-state engine: reads/writes query params, catalogue fetch.
- `src/lib/utils.ts` — Pure helpers: price math, cost assumptions, formatting, search/recency.
- `src/lib/bench.ts` — Coverage-gated TerminalBench value-leader selection.
- `src/components/` — UI components (SearchFilter, ModelCard, ViewToggle, etc.).
- `public/data/models.json` — Committed catalogue snapshot (refreshed by CI every 15 min).
- `scripts/sync-models.mjs` — Snapshot fetcher used locally and by CI.

## Development

### Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start Vite dev server |
| `bun run build` | Build for production (`BASE_PATH=/<repo>/` for Pages) |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | Run ESLint checks |
| `bun run typecheck` | Run TypeScript type checks |
| `bun run models:sync` | Refresh the catalogue snapshot |

## Deployment

The site deploys automatically on every push to the default branch (and every 15 minutes
when the catalogue changes). Pages serves the app under `/<repo>/`; `vite.config.ts` reads
the `BASE_PATH` environment variable that the workflow sets for this.

## License

MIT
