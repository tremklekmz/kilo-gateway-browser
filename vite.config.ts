import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

// BASE_PATH is set by the Pages workflow ("BASE_PATH=/<repo>/") so a project
// site builds with the right asset prefix. Unset locally → "/".
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [solid(), tailwindcss()],
  resolve: {
    // TS-only alias in tsconfig; Vite needs the same mapping at build time.
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
