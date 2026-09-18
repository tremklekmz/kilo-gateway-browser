import { createSignal, Show } from "solid-js";

/** Unique-per-instance id for aria-describedby wiring on disclosure popovers. */
let disclosureIdCounter = 0;
function nextDisclosureId(): string {
  disclosureIdCounter += 1;
  return `disclosure-${disclosureIdCounter}`;
}

export function StatPill(props: { label: string; value: string; info?: string }) {
  const [open, setOpen] = createSignal(false);
  const infoId = nextDisclosureId();
  return (
    <div class="relative min-w-0">
      <button
        type="button"
        onClick={() => props.info && setOpen((current) => !current)}
        aria-label={
          props.info ? `${props.label}: ${props.value}. Show pricing assumptions` : `${props.label}: ${props.value}`
        }
        aria-expanded={props.info ? (open() ? "true" : "false") : undefined}
        aria-describedby={props.info && open() ? infoId : undefined}
        class="w-full flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span class="text-caption text-zinc-400 font-medium uppercase tracking-wide leading-none mb-1">
          {props.label}
        </span>
        <span class="text-value text-zinc-200 leading-none tabular-nums truncate w-full text-center">
          {props.value}
        </span>
      </button>
      <Show when={props.info && open()}>
        <p
          id={infoId}
          class="absolute left-1/2 top-full z-20 mt-1 w-max max-w-56 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-caption text-zinc-300 shadow-lg"
        >
          {props.info}
        </p>
      </Show>
    </div>
  );
}
