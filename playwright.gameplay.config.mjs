import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure", screenshot: "on" },
  webServer: {
    command: "bun run dev --host 127.0.0.1 --port 4173",
    port: 4173,
    timeout: 120000,
    reuseExistingServer: false
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
