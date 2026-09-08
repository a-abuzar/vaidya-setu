import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    setupFiles: ["./test-setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.kilo/**",
      "**/.next/**",
      "**/.open-next/**",
    ],
  },
});
