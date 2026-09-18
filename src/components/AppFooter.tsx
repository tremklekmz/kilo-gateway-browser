export default function AppFooter() {
  return (
    <footer class="border-t border-zinc-800/60 py-6">
      <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-caption text-zinc-400">
        Data sourced from{" "}
        <a
          href="https://api.kilo.ai/api/gateway/models"
          target="_blank"
          rel="noopener noreferrer"
          class="text-violet-400 hover:text-violet-300 transition-colors"
        >
          api.kilo.ai
        </a>
      </div>
    </footer>
  );
}
