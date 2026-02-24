import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "touch prisma/test.db && DATABASE_URL=file:./test.db npx prisma migrate deploy && DATABASE_URL=file:./test.db npm run dev -- --port 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
