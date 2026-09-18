import { Show } from "solid-js";
import { FreshnessStamp } from "../FreshnessStamp";

export function ResultsCount(props: {
  filteredCount: number;
  totalCount: number;
  updatedAt: number | null;
}) {
  return (
    <div class="max-sm:py-0.5 max-sm:text-caption flex items-center justify-start sm:px-3 sm:py-2.5 text-body text-zinc-400 whitespace-nowrap">
      <span role="status" aria-label={`${props.filteredCount} of ${props.totalCount} models shown`}>
        <span class="text-zinc-200 font-semibold tabular-nums">{props.filteredCount}</span>
        <span class="mx-1">/</span>
        <span>{props.totalCount}</span>
        <span class="ml-1">models</span>
      </span>
      <Show when={props.updatedAt != null}>
        <FreshnessStamp updatedAt={props.updatedAt!} class="ml-2 text-zinc-400" />
      </Show>
    </div>
  );
}
