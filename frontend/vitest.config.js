import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? "./test-results/junit.xml" : undefined,
    include: ["test/**/*.test.js"],
    restoreMocks: true,
    clearMocks: true
  }
});
