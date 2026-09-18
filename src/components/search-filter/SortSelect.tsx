import type { SortBy } from "@/lib/utils";
import { ChevronIcon } from "./icons";

export function SortSelect(props: {
  class: string;
  value: string;
  onChange: (value: SortBy) => void;
  selectId?: string;
}) {
  return (
    <div class={props.class}>
      <select
        id={props.selectId}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as SortBy)}
        class="w-full appearance-none pl-3 pr-8 py-2.5 max-sm:py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-body text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400 transition-all duration-200 cursor-pointer"
      >
        <option value="relevance" disabled hidden>
          Sorted by relevance
        </option>
        <optgroup label="Recency">
          <option value="default">Provider default order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </optgroup>
        <optgroup label="Cost">
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </optgroup>
        <optgroup label="Benchmark">
          <option value="bench-asc">Benchmark: low to high</option>
          <option value="bench-desc">Benchmark: high to low</option>
        </optgroup>
      </select>
      <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronIcon />
      </div>
    </div>
  );
}
