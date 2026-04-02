interface PaginationProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
}

export function Pagination({ visibleCount, totalCount, onLoadMore }: PaginationProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <p className="text-sm text-zinc-500">
        Showing {visibleCount} of {totalCount} models
      </p>
      <button
        onClick={onLoadMore}
        aria-label={`Load more models. Currently showing ${visibleCount} of ${totalCount}`}
        className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        Load more models
      </button>
    </div>
  );
}
