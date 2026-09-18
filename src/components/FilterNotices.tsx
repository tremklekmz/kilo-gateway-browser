import { Show } from "solid-js";

export default function FilterNotices(props: {
  assumptionsNotice: boolean;
  invalidNotice: string[] | null;
  onDismissAssumptions: () => void;
  onDismissInvalid: () => void;
}) {
  return (
    <>
      {/* Shared-URL cost assumptions that were out of range got clamped — tell the recipient. */}
      <Show when={props.assumptionsNotice}>
        <div
          role="status"
          class="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-caption text-amber-300"
        >
          <span>Shared cost assumptions were outside 0–100% and were adjusted.</span>
          <button
            type="button"
            onClick={props.onDismissAssumptions}
            class="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-11 max-sm:min-w-11 -my-2 max-sm:-mx-1"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      </Show>
      {/* Shared URL carried filter params that failed validation — list them once. */}
      <Show when={props.invalidNotice}>
        <div
          role="status"
          class="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-caption text-amber-300"
        >
          <span>
            Ignored invalid filter(s) from link: {props.invalidNotice!.join(", ")}
          </span>
          <button
            type="button"
            onClick={props.onDismissInvalid}
            class="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-11 max-sm:min-w-11 -my-2 max-sm:-mx-1"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      </Show>
    </>
  );
}
