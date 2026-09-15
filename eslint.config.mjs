import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "public/data/**",
      // Harness tooling shipped with the checkout, not app source.
      ".omp/**",
      ".impeccable/**",
      ".kilo/**",
    ],
  },
  ...tseslint.configs.recommended,
);
