export default function ErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <div class="flex flex-col items-center justify-center py-24 text-center" role="alert">
      <div class="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 class="text-headline text-zinc-200 mb-2">Models are unavailable</h3>
      <p class="text-body text-zinc-400 mb-1 max-w-sm">{props.message}</p>
      <p class="text-caption text-zinc-400 max-w-sm mb-6">Check your connection, then try again.</p>
      <button
        onClick={props.onRetry}
        class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-body font-medium rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Try again
      </button>
    </div>
  );
}
