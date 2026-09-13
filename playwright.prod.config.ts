import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /production-full-acceptance\.spec\.ts/,
  timeout: 45000,
  expect: {
    timeout: 12000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://project-loop-topaz.vercel.app',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15000,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
});
