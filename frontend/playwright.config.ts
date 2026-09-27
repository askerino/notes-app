import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

process.loadEnvFile(path.join(import.meta.dirname, "../.env"));

const frontendPort = 5174;
const apiPort = 5001;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `dotnet run -c Release --no-launch-profile --project src/NotesApp.Api --urls http://127.0.0.1:${apiPort}`,
      cwd: "../backend",
      env: {
        ASPNETCORE_ENVIRONMENT: "Testing",
        ConnectionStrings__AppDatabase: `Host=127.0.0.1;Port=${process.env["E2E_POSTGRES_PORT"]};Database=${process.env["E2E_POSTGRES_DB"]};Username=${process.env["E2E_POSTGRES_USER"]};Password=${process.env["E2E_POSTGRES_PASSWORD"]}`,
        SEED_SAMPLE_DATA: "false",
      },
      url: `http://127.0.0.1:${apiPort}/health/ready`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      env: {
        API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
      },
      url: `http://127.0.0.1:${frontendPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
