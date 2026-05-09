import { defineConfig, devices } from "@playwright/test";

// Sobe o servidor Next em modo dev com E2E_TEST=1 para liberar as fixtures
// /__e2e__/entrega e /__e2e__/preview, que renderizam EntregaClient e
// PreviewClient com dados estáticos (zero dependência do banco).
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    port: 3000,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
