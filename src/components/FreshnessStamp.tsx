import { createSignal, onCleanup } from "solid-js";

function formatFreshness(updatedAtMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - updatedAtMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Live "Updated X ago" stamp for the dataset's fetch moment. Ticks itself
 * every 30s so the label stays current without re-rendering the owning list.
 * Render it OUTSIDE any aria-live region — the tick would otherwise re-announce
 * on a screen reader every 30s.
 */
export function FreshnessStamp(props: { updatedAt: number; class?: string }) {
  const [now, setNow] = createSignal(Date.now());
  const timer = setInterval(() => setNow(Date.now()), 30_000);
  onCleanup(() => clearInterval(timer));

  return (
    <time
      datetime={new Date(props.updatedAt).toISOString()}
      title={`Data fetched ${new Date(props.updatedAt).toLocaleString()}`}
      class={props.class}
    >
      Updated {formatFreshness(props.updatedAt, now())}
    </time>
  );
}
