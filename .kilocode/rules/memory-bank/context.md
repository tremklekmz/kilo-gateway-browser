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

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page | ✅ Ready |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
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
| 2026-02-22 | Added client-side fallback fetch: page.tsx does server-side fetch, ModelsBrowser falls back to client fetch if server fetch fails |
| 2026-02-18 | Created README.md and updated memory bank |
| Initial | Template created with base setup |
