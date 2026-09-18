import type { JSX } from "@solidjs/web";

export const MODALITY_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  text: {
    label: "Text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" />
      </svg>
    ),
    color: "bg-blue-400/10 text-blue-200 border-blue-400/20",
  },
  image: {
    label: "Image",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  audio: {
    label: "Audio",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
    color: "bg-zinc-700/50 text-zinc-300 border-zinc-600/30",
  },
  video: {
    label: "Video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m22 8-6 4 6 4V8z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

export function ModalityBadges(props: { modalities: string[] }) {
  if (!props.modalities || props.modalities.length === 0) return null;
  const normalized = props.modalities.map((m) => m.toLowerCase().split("+")[0].trim());
  const unique = Array.from(new Set(normalized));
  // "text" is the near-universal baseline modality for a model gateway — it
  // appears on ~90% of cards and carries no discriminating signal. Suppress it
  // so only the differentiators (image/audio/video) render.
  const discriminating = unique.filter((mod) => mod !== "text");
  if (discriminating.length === 0) return null;
  return (
    <div class="flex flex-wrap gap-1">
      {discriminating.map((mod) => {
        const cfg = MODALITY_CONFIG[mod];
        if (!cfg) return null;
        return (
          <span
            class={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium border ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}
