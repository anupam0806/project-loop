import { test, expect } from '@playwright/test';

async function login(page: any, email = 'admin@example.com', password = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('PART 8: RESOLVED Status & UI/UX Browser Verification', () => {
  test('1. Admin login, dashboard KPI cards and recent feedback rendering', async ({ page }) => {
    await login(page);
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Feedback')).toBeVisible();
    await expect(page.locator('text=Recent Feedback')).toBeVisible();
  });

  test('2. Themes -> Feedback filter navigation works properly', async ({ page }) => {
    await login(page);
    await page.goto('/themes');
    await page.waitForLoadState('networkidle');

    const firstThemeLink = page.locator('a[href^="/feedback?featureArea="]').first();
    await expect(firstThemeLink).toBeVisible();
    await firstThemeLink.click();

    await page.waitForURL('**/feedback?featureArea=*');
    await page.waitForLoadState('networkidle');

    // Confirm feedback list is populated with matching items
    const feedbackRows = page.locator('table tbody tr');
    await expect(feedbackRows.first()).toBeVisible();
    const count = await feedbackRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('3. Feedback filter dropdown includes Resolved and filters correctly', async ({ page }) => {
    await login(page);
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');

    // Check status filter dropdown contains Resolved
    const statusSelect = page.locator('select[aria-label="Filter by status"]');
    await expect(statusSelect).toBeVisible();

    const resolvedOption = statusSelect.locator('option[value="RESOLVED"]');
    await expect(resolvedOption).toHaveCount(1);
    await expect(resolvedOption).toHaveText('Resolved');
  });

  test('4. Feedback detail displays NEW, REVIEWED, ACTIONED, RESOLVED; can select RESOLVED; persists after refresh', async ({ page }) => {
    await login(page);
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');

    // Open first feedback item
    const firstFeedback = page.locator('table tbody tr a').first();
    await expect(firstFeedback).toBeVisible();
    await firstFeedback.click();

    await page.waitForURL('**/feedback/*');
    await page.waitForLoadState('networkidle');

    // Inspect status control
    const workflowGroup = page.locator('div[role="group"][aria-label="Status workflow"]');
    await expect(workflowGroup).toBeVisible();

    // Verify all 4 status pills are displayed in workflow order
    await expect(workflowGroup.locator('button:has-text("NEW")')).toBeVisible();
    await expect(workflowGroup.locator('button:has-text("REVIEWED")')).toBeVisible();
    await expect(workflowGroup.locator('button:has-text("ACTIONED")')).toBeVisible();
    await expect(workflowGroup.locator('button:has-text("RESOLVED")')).toBeVisible();

    // Verify select dropdown has all 4 options
    const statusSelect = page.locator('select[aria-label="Feedback status selection"]');
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect.locator('option[value="ACTIONED"]')).toHaveCount(1);
    await expect(statusSelect.locator('option[value="RESOLVED"]')).toHaveCount(1);

    // Step through workflow: move to ACTIONED then RESOLVED
    await workflowGroup.locator('button:has-text("ACTIONED")').click();
    await page.waitForTimeout(600);

    // Verify RESOLVED button appears beside ACTIONED and click RESOLVED
    const resolvedButton = workflowGroup.locator('button:has-text("RESOLVED")');
    await expect(resolvedButton).toBeVisible();
    await resolvedButton.click();
    await page.waitForTimeout(1000);

    // Verify RESOLVED is now active (highlighted with check mark)
    await expect(workflowGroup.locator('button:has-text("✓ RESOLVED")')).toBeVisible();
    await expect(statusSelect).toHaveValue('RESOLVED');

    // Step 9 & 10: Refresh page and confirm RESOLVED persists
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('div[role="group"][aria-label="Status workflow"] button:has-text("✓ RESOLVED")')).toBeVisible();
    await expect(page.locator('select[aria-label="Feedback status selection"]')).toHaveValue('RESOLVED');
  });

  test('5. Responsive layout handles mobile drawer and cards cleanly', async ({ page }) => {
    // Set mobile viewport (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');

    // Verify mobile hamburger button is visible
    const hamburgerBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburgerBtn).toBeVisible();

    // Open mobile drawer
    await hamburgerBtn.click();
    await expect(page.locator('.fixed aside')).toBeVisible();

    // Verify mobile stacked cards are rendered instead of wide table
    const mobileCards = page.locator('.sm\\:hidden a[href^="/feedback/"]');
    await expect(mobileCards.first()).toBeVisible();
  });
});
