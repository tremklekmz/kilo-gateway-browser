"use client";

interface SkeletonCardProps {
  view: "grid" | "list";
}

export function SkeletonCard({ view }: SkeletonCardProps) {
  if (view === "list") {
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-48 bg-zinc-700 rounded" />
            <div className="h-5 w-16 bg-zinc-800 rounded-full" />
          </div>
          <div className="h-4 w-full bg-zinc-800 rounded mb-1" />
          <div className="h-4 w-3/4 bg-zinc-800 rounded mb-3" />
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-zinc-800 rounded" />
            <div className="h-4 w-24 bg-zinc-800 rounded" />
            <div className="h-4 w-24 bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-8 w-32 bg-zinc-800 rounded-lg shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-zinc-700 rounded mb-2" />
          <div className="h-4 w-1/2 bg-zinc-800 rounded" />
        </div>
        <div className="h-5 w-12 bg-zinc-800 rounded-full ml-2" />
      </div>
      <div className="space-y-2 mb-4 flex-1">
        <div className="h-3 w-full bg-zinc-800 rounded" />
        <div className="h-3 w-full bg-zinc-800 rounded" />
        <div className="h-3 w-2/3 bg-zinc-800 rounded" />
      </div>
      <div className="border-t border-zinc-800 pt-3 mt-auto">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-10 bg-zinc-800 rounded-lg" />
          <div className="h-10 bg-zinc-800 rounded-lg" />
        </div>
        <div className="h-8 w-full bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12, view }: { count?: number; view: "grid" | "list" }) {
  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "flex flex-col gap-3"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} view={view} />
      ))}
    </div>
  );
}
