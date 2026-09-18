import { ViewToggle } from "@/components/ViewToggle";

export default function AppHeader(props: {
  view: "grid" | "list";
  onViewChange: (v: "grid" | "list") => void;
}) {
  return (
    <header class="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
      <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            {/* Logo mark */}
            <div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p class="text-title font-bold text-zinc-100 leading-none">Kilo Gateway</p>
              <p class="text-caption text-zinc-400 leading-none mt-0.5">AI Model Explorer</p>
            </div>
          </div>
          <ViewToggle
            view={props.view}
            onViewChange={props.onViewChange}
          />
        </div>
      </div>
    </header>
  );
}
