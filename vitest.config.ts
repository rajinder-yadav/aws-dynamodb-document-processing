import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/test/**"],
    exclude: ["node_modules", "dist", ".pnpm-store"],
    coverage: {
      include: ["src/**"],
      exclude: ["node_modules", "dist", "src/**/test"],
      reporter: ["text", "json", "html"],
    },
  },
});
