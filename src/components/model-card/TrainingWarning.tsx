import { createSignal, Show } from "solid-js";

/** Unique-per-instance id for aria-describedby wiring on disclosure popovers. */
let disclosureIdCounter = 0;
function nextDisclosureId(): string {
  disclosureIdCounter += 1;
  return `disclosure-${disclosureIdCounter}`;
}

export function TrainingWarning() {
  const [open, setOpen] = createSignal(false);
  const infoId = nextDisclosureId();
  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open() ? "true" : "false"}
        aria-describedby={open() ? infoId : undefined}
        class="flex items-center gap-2 text-micro text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-md px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span aria-hidden="true">!</span>
        <span>This provider may train on your prompts.</span>
      </button>
      <Show when={open()}>
        <p
          id={infoId}
          class="mt-1 rounded-md border border-amber-500/20 bg-zinc-800 px-3 py-2 text-micro text-amber-200"
        >
          Review the provider's data-use policy before sending sensitive prompts.
        </p>
      </Show>
    </div>
  );
}
