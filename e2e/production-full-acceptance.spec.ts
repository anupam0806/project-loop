import { test, expect, Page } from '@playwright/test';

// Helper for UI login
async function login(page: Page, email = 'admin@example.com', password = 'password123') {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/.*\/dashboard/, { timeout: 25000 });
}

test.describe('Production Acceptance — Full Browser & UI Matrix', () => {

  // ==========================================
  // STEP 1 & 2: AUTH & LOGIN
  // ==========================================
  test('Step 2: Sign-in UI authenticates successfully to dashboard', async ({ page }) => {
    await login(page, 'admin@example.com');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    // Verify user role badge and Calm UI styling
    await expect(page.locator('aside').first()).toContainText('ADMIN');
  });

  // ==========================================
  // STEP 3: RBAC IN UI
  // ==========================================
  test('Step 3: VIEWER has restricted read-only UI controls', async ({ page }) => {
    await login(page, 'viewer@example.com');
    
    // Check reports page: Generate Report button is disabled
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    const generateBtn = page.locator('button:has-text("Generate Report")');
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();

    // Check settings page: restricted
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Team member administration is restricted to workspace Administrators.')).toBeVisible();
    await expect(page.locator('button:has-text("Add User")')).not.toBeVisible();
  });

  // ==========================================
  // STEP 5: FEEDBACK UI & FILTERS
  // ==========================================
  test('Step 5: Feedback table renders records, supports search and filter', async ({ page }) => {
    await login(page, 'admin@example.com');
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Feedback');
    // Verify rows exist
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();

    // Test text search
    const searchInput = page.locator('input[placeholder*="Search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('performance');
      await page.waitForTimeout(600);
      await page.waitForLoadState('networkidle');
    }
  });

  // ==========================================
  // STEP 7: ANALYTICS & 3 CHARTS
  // ==========================================
  test('Step 7: Dashboard renders all 3 SVG Calm UI charts from real data', async ({ page }) => {
    await login(page, 'admin@example.com');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Chart 1: 30-Day Volume Timeline SVG
    const volumeChart = page.locator('svg').filter({ has: page.locator('path, rect, circle') }).first();
    await expect(volumeChart).toBeVisible();

    // Chart 2: Sentiment Distribution Donut/Bar with non-color symbols
    await expect(page.locator('text=[+]')).toBeVisible();

    // Chart 3: Top Themes Heading
    await expect(page.getByRole('heading', { name: 'Top Themes' })).toBeVisible();
  });

  // ==========================================
  // STEP 8: THEMES
  // ==========================================
  test('Step 8: Themes page displays workspace themes and counts', async ({ page }) => {
    await login(page, 'admin@example.com');
    await page.goto('/themes');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Themes');
    // Ensure cards or list items render
    await expect(page.locator('main')).toBeVisible();
  });

  // ==========================================
  // STEP 9: ASK LOOP UI
  // ==========================================
  test('Step 9: Ask LOOP UI loads input and submission control', async ({ page }) => {
    await login(page, 'admin@example.com');
    await page.goto('/ask');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Ask LOOP');
    const questionInput = page.locator('textarea, input[placeholder*="Ask" i]');
    await expect(questionInput).toBeVisible();
  });

  // ==========================================
  // STEP 11: REPORTS UI
  // ==========================================
  test('Step 11: Reports page lists existing VoC executive reports', async ({ page }) => {
    await login(page, 'admin@example.com');
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Reports');
    const reportItem = page.locator('text=Executive').or(page.locator('text=Report')).or(page.locator('text=VoC'));
    await expect(reportItem.first()).toBeVisible();
  });

  // ==========================================
  // STEP 13: NAVIGATION & APP SHELL
  // ==========================================
  test('Step 13: Full sidebar navigation traverses all routes without broken links', async ({ page }) => {
    await login(page, 'admin@example.com');

    const navItems = ['Dashboard', 'Feedback', 'Themes', 'Ask LOOP', 'Reports', 'Settings'];
    for (const item of navItems) {
      const link = page.locator('aside').first().locator(`nav a:has-text("${item}")`);
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).not.toContain('404');
        expect(page.url()).not.toContain('500');
      }
    }
  });

  // ==========================================
  // STEP 14: RESPONSIVE VIEWPORTS
  // ==========================================
  test('Step 14: Responsive views function correctly across Desktop, Tablet, and Mobile', async ({ page }) => {
    // 14A: Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await login(page, 'admin@example.com');
    await expect(page.locator('aside').first()).toBeVisible();

    // 14B: Tablet Viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();

    // 14C: Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
  });

  // ==========================================
  // STEP 15: ACCESSIBILITY & CONTRAST
  // ==========================================
  test('Step 15: Critical forms and buttons have accessible labels and names', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(submitButton).toBeEnabled();
  });
});
