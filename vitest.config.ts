import { defineConfig } from "vitest/config";
import { config } from "dotenv";

export default defineConfig({
  test: {
    setupFiles: ["./test-setup.ts"],
  },
});
