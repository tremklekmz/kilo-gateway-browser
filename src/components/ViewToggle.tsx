"use client";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-violet-400" : "text-zinc-500"}
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-violet-400" : "text-zinc-500"}
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

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
      <button
        onClick={() => onViewChange("grid")}
        title="Grid view"
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
          view === "grid"
            ? "bg-zinc-700 shadow-sm"
            : "hover:bg-zinc-800"
        }`}
      >
        <GridIcon active={view === "grid"} />
      </button>
      <button
        onClick={() => onViewChange("list")}
        title="List view"
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
          view === "list"
            ? "bg-zinc-700 shadow-sm"
            : "hover:bg-zinc-800"
        }`}
      >
        <ListIcon active={view === "list"} />
      </button>
    </div>
  );
}
