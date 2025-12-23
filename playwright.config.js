const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000
  },
  retries: process.env.CI ? 1 : 0,
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: process.env.HEADLESS === "0" ? false : true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  webServer: {
    command: "npm run e2e:servers",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
