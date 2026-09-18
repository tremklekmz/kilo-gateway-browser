import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { formatProviderName, splitProviderParam } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

export function ProviderCombobox(props: {
  class?: string;
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
}) {
  const selected = createMemo(() => splitProviderParam(props.provider));
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [activeIndex, setActiveIndex] = createSignal(0);
  let triggerRef: HTMLButtonElement | undefined;
  let listRef: HTMLUListElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let dialogRef: HTMLDivElement | undefined;

  // Focus trap inside the aria-modal popover (mobile bottom sheet + desktop
  // popover share the dialog). Compute phase tracks `open()`; the untracked
  // effect phase owns the listener and returns its cleanup.
  createEffect(
    () => open(),
    (isOpen) => {
      const dialog = dialogRef;
      if (!isOpen || !dialog) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      dialog.addEventListener("keydown", onKeyDown);
      return () => dialog.removeEventListener("keydown", onKeyDown);
    },
  );

  createEffect(
    () => open(),
    (isOpen) => {
      if (!isOpen) return;
      const onPointerDown = (event: PointerEvent) => {
        if (rootRef && !rootRef.contains(event.target as Node)) {
          setOpen(false);
          triggerRef?.focus();
        }
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    },
  );

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return props.providers;
    return props.providers.filter(
      (p) => p.toLowerCase().includes(q) || formatProviderName(p).toLowerCase().includes(q),
    );
  });

  const commit = (next: string[]) => props.onProviderChange(next.join(","));

  const toggleProvider = (p: string) =>
    commit(
      selected().includes(p) ? selected().filter((s) => s !== p) : [...selected(), p],
    );

  const close = () => {
    setOpen(false);
    triggerRef?.focus();
  };

  const triggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered().length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + delta + filtered().length) % filtered().length);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const target = event.target as HTMLElement;
      if (target.closest("button")) return; // footer buttons keep native behavior
      if (filtered().length === 0) return;
      event.preventDefault();
      toggleProvider(filtered()[activeIndex()]);
    }
  };

  createEffect(
    () => activeIndex(),
    (index) => {
      listRef?.children[index]?.scrollIntoView({ block: "nearest" });
    },
  );

  const triggerLabel = createMemo(() => {
    if (selected().length === 0) return "All Providers";
    if (selected().length === 1) return formatProviderName(selected()[0]);
    return `Providers: ${selected().length}`;
  });

  return (
    <div ref={rootRef} class={props.class} onKeyDown={onKeyDown} data-testid="provider-combobox">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={triggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open() ? "true" : "false"}
        aria-controls={open() ? "provider-listbox" : undefined}
        class={`relative w-full flex items-center justify-between gap-2 pl-3 pr-8 py-2.5 max-sm:py-3 border rounded-xl text-body transition-all duration-200 cursor-pointer focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 ${
          selected().length > 0
            ? "bg-zinc-900 text-violet-200 border-violet-500/40"
            : "bg-zinc-900 text-zinc-200 border-zinc-700"
        }`}
      >
        <span class="truncate">{triggerLabel()}</span>
        <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDownIcon open={open()} />
        </span>
      </button>

      <Show when={open()}>
        {/* Mobile backdrop — tap to close */}
        <button
          type="button"
          aria-label="Close provider filter"
          onClick={close}
          class="fixed inset-0 z-30 bg-black/60 sm:hidden cursor-default"
        />
        {/* Popover (sm+) / bottom sheet (below sm) */}
        <div
          ref={dialogRef}
          class="z-40 sm:absolute sm:left-0 sm:right-0 sm:top-full sm:bottom-auto sm:mt-2 fixed inset-x-0 bottom-0 sm:rounded-xl border border-zinc-700 bg-zinc-900 sm:shadow-xl shadow-2xl overflow-hidden flex flex-col max-sm:rounded-t-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
            <input
              autofocus
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="provider-listbox"
              aria-label="Filter providers"
              aria-activedescendant={
                filtered().length > 0 ? `provider-option-${filtered()[activeIndex()]}` : undefined
              }
              placeholder="Filter providers..."
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setActiveIndex(0);
              }}
              class="w-full px-3 py-2 max-sm:py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-body text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          <ul
            id="provider-listbox"
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Providers"
            class="overflow-y-auto p-1 max-h-64 max-sm:max-h-[50vh]"
          >
            <Show
              when={filtered().length > 0}
              fallback={
                <li class="px-3 py-2 text-body text-zinc-400" aria-live="polite">
                  No providers match &lsquo;{query().trim()}&rsquo;
                </li>
              }
            >
              <For each={filtered()}>
                {(p, index) => {
                  const isSelected = createMemo(() => selected().includes(p));
                  return (
                    <li
                      id={`provider-option-${p}`}
                      role="option"
                      aria-selected={isSelected() ? "true" : "false"}
                      onClick={() => toggleProvider(p)}
                      class={`flex items-center gap-2 px-3 py-2 max-sm:py-3 rounded-lg text-body cursor-pointer transition-colors ${
                        index() === activeIndex()
                          ? "bg-zinc-800 text-zinc-200"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <span
                        class={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected() ? "bg-violet-500 border-violet-500 text-white" : "border-zinc-600"
                        }`}
                      >
                        <Show when={isSelected()}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </Show>
                      </span>
                      {formatProviderName(p)}
                    </li>
                  );
                }}
              </For>
            </Show>
          </ul>

          <div class="flex items-center justify-between gap-2 p-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => commit([])}
              class="px-2 py-1 text-caption max-sm:min-h-11 max-sm:text-body rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              class="px-2 py-1 text-caption max-sm:min-h-11 max-sm:text-body rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
