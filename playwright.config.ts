import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 35000,
  expect: {
    timeout: 8000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
  },
  webServer: {
    command: 'npx next start -p 3000',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      AI_PROVIDER: 'mock',
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'http://127.0.0.1:3000',
      NEXTAUTH_SECRET: 'project-loop-fallback-secret-2026-auth-session-key',
    },
  },
});
