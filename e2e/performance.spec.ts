import { test, expect } from '@playwright/test';

test.describe('5.7 Measured Performance — Browser Navigation & Web Vitals', () => {
  test('measure navigation timings across critical routes', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');

    const routes = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Feedback Inbox', path: '/feedback' },
      { name: 'Ask LOOP', path: '/ask' },
      { name: 'Reports', path: '/reports' },
      { name: 'Settings', path: '/settings' },
    ];

    const measurements: Array<{ route: string; domContentLoadedMs: number; loadMs: number }> = [];

    for (const route of routes) {
      const t0 = performance.now();
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      const dclTime = performance.now() - t0;

      await page.waitForLoadState('load');
      const loadTime = performance.now() - t0;

      measurements.push({
        route: route.name,
        domContentLoadedMs: Math.round(dclTime * 10) / 10,
        loadMs: Math.round(loadTime * 10) / 10,
      });
    }

    console.log('\n========================================================================');
    console.log('            BROWSER NAVIGATION & RENDERING PERFORMANCE TIMINGS          ');
    console.log('========================================================================');
    console.table(measurements);

    // Verify all pages load well within responsive thresholds (< 3000ms locally)
    for (const m of measurements) {
      expect(m.domContentLoadedMs).toBeLessThan(3500);
      expect(m.loadMs).toBeLessThan(4000);
    }
  });
});
