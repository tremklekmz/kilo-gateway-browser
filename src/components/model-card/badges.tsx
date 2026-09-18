import { formatProviderName } from "@/lib/utils";

export function ProviderBadge(props: { provider: string }) {
  const colorMap: Record<string, string> = {
    openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    meta: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    google: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    mistralai: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    deepseek: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "x-ai": "bg-slate-500/10 text-slate-300 border-slate-500/20",
    kilo: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cohere: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    qwen: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    microsoft: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    nvidia: "bg-green-500/10 text-green-400 border-green-500/20",
    perplexity: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  const colorClass =
    colorMap[props.provider.toLowerCase()] ||
    "bg-zinc-700/50 text-zinc-400 border-zinc-600/30";

  return (
    <span
      class={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium border ${colorClass} shrink-0`}
    >
      {formatProviderName(props.provider)}
    </span>
  );
}

export function FreeBadge() {
  return (
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold bg-neon-green/10 text-neon-green border border-neon-green/30 shrink-0">
      FREE
    </span>
  );
}

export function NewBadge() {
  return (
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold bg-violet-500/15 text-violet-300 border border-violet-400/30 shrink-0">
      NEW
    </span>
  );
}

export function BenchValueTick() {
  return (
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 shrink-0"
      title="Cheapest per attempt among the top TerminalBench scorers in the current results"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Best value
    </span>
  );
}
