interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

function GridIcon(props: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.active ? "text-violet-400" : "text-zinc-500"}
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ListIcon(props: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.active ? "text-violet-400" : "text-zinc-500"}
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  );
}

export function ViewToggle(props: ViewToggleProps) {
  return (
    <div
      class="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl"
      role="group"
      aria-label="Layout"
    >
      <button
        onClick={() => props.onViewChange("grid")}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={props.view === "grid"}
        class={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 max-sm:w-11 max-sm:h-11 ${
          props.view === "grid" ? "bg-zinc-700 shadow-sm" : "hover:bg-zinc-800"
        }`}
      >
        <GridIcon active={props.view === "grid"} />
      </button>
      <button
        onClick={() => props.onViewChange("list")}
        title="List view"
        aria-label="List view"
        aria-pressed={props.view === "list"}
        class={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 max-sm:w-11 max-sm:h-11 ${
          props.view === "list" ? "bg-zinc-700 shadow-sm" : "hover:bg-zinc-800"
        }`}
      >
        <ListIcon active={props.view === "list"} />
      </button>
    </div>
  );
}
