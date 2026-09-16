interface PaginationProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
}

export function Pagination(props: PaginationProps) {
  return (
    <div class="flex flex-col items-center gap-3 py-8">
      <p class="text-body text-zinc-400 tabular-nums">
        Showing {props.visibleCount} of {props.totalCount} models
      </p>
      <button
        onClick={props.onLoadMore}
        aria-label={`Load more models. Currently showing ${props.visibleCount} of ${props.totalCount}`}
        class="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-body font-medium rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        Load more models
      </button>
    </div>
  );
}
