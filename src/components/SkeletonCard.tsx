interface SkeletonCardProps {
  view: "grid" | "list";
}

export function SkeletonCard(props: SkeletonCardProps) {
  if (props.view === "list") {
    return (
      <div class="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <div class="h-5 w-48 bg-zinc-700 rounded" />
            <div class="h-5 w-16 bg-zinc-800 rounded-full" />
          </div>
          <div class="h-4 w-full bg-zinc-800 rounded mb-1" />
          <div class="h-4 w-3/4 bg-zinc-800 rounded mb-3" />
          <div class="flex gap-4">
            <div class="h-4 w-24 bg-zinc-800 rounded" />
            <div class="h-4 w-24 bg-zinc-800 rounded" />
            <div class="h-4 w-24 bg-zinc-800 rounded" />
          </div>
        </div>
        <div class="h-8 w-32 bg-zinc-800 rounded-lg shrink-0" />
      </div>
    );
  }

  return (
    <div class="flex flex-col p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="h-5 w-3/4 bg-zinc-700 rounded mb-2" />
          <div class="flex flex-wrap gap-1.5 mb-1.5">
            <div class="h-4 w-14 bg-zinc-800 rounded-full" />
            <div class="h-4 w-10 bg-zinc-800 rounded-full" />
            <div class="h-4 w-12 bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div class="h-5 w-12 bg-zinc-800 rounded-full ml-2" />
      </div>
      <div class="space-y-2 mb-4 flex-1">
        <div class="h-3 w-full bg-zinc-800 rounded" />
        <div class="h-3 w-full bg-zinc-800 rounded" />
        <div class="h-3 w-2/3 bg-zinc-800 rounded" />
      </div>
      <div class="border-t border-zinc-800 pt-3 mt-auto">
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="h-10 bg-zinc-800 rounded-lg" />
          <div class="h-10 bg-zinc-800 rounded-lg" />
        </div>
        <div class="h-8 w-full bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonGrid(props: { count?: number; view: "grid" | "list" }) {
  const count = () => props.count ?? 12;
  return (
    <div
      class={
        props.view === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "flex flex-col gap-3"
      }
    >
      {Array.from({ length: count() }).map(() => (
        <SkeletonCard view={props.view} />
      ))}
    </div>
  );
}
