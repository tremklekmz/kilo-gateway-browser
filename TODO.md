# TODO

- [ ] Convert More-filters panel styling (`renderFiltersPanel` in `src/components/SearchFilter.tsx`) from the `.mf-panel` CSS block in `src/index.css` to inline Tailwind literals per repo convention (AGENTS.md: no parallel styling channel).
  - Origin: styling was authored as scoped CSS for the impeccable live-variant preview (Tailwind classes can't be JIT-generated inside a preview payload) and transplanted verbatim during carbonize instead of re-idiomized.
  - Mechanical conversions: `.mf-fl` → shared label recipe (`block text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2`); `.mf-fi` → shared input recipe; disclosure/grid selectors → `data-[bench-open]:grid` variants; `focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/30` on `.mf-fx`.
  - Genuinely CSS-only leftovers: `::-webkit-details-marker` reset and input styling inside `.mf-fx` (keep as one-line CSS or a small component, not a class-merge dep).
  - Done when: `.mf-panel` rules are deleted from `src/index.css`, `npm run lint` + `npm run typecheck` pass, desktop 1440px and mobile 375px renders match the shipped lane design.
