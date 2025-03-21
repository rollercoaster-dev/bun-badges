import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Enable global test utilities
    globals: true,

    // Environment to run tests in
    environment: "node",

    // Include file patterns
    include: ["src/tests/e2e/**/*.spec.ts"],

    // Setup files to run before tests
    setupFiles: ["./tests/setup.ts"],

    // Test timeouts
    testTimeout: 10000,

    // Reporter
    reporters: ["default"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/"],
    },
  },

  // Resolve path aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
