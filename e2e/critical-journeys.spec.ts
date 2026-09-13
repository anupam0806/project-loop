import { test, expect, Page } from '@playwright/test';

// Helper to sign in via UI
async function login(page: Page, email: string, password = 'password123') {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('5.6 Playwright E2E — Critical User Journeys', () => {

  // ==========================================
  // 1. AUTHENTICATION
  // ==========================================
  test.describe('1. Authentication & Session Protection', () => {
    test('successful login redirects to dashboard with session', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('Sign in to Project LOOP');
      
      await page.locator('input[type="email"]').fill('admin@example.com');
      await page.locator('input[type="password"]').fill('password123');
      await page.locator('button[type="submit"]').click();

      await page.waitForURL('**/dashboard');
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('header')).toContainText('ADMIN');
    });

    test('invalid login displays error alert and prevents access', async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('admin@example.com');
      await page.locator('input[type="password"]').fill('wrong-password-xyz');
      await page.locator('button[type="submit"]').click();

      const errorAlert = page.locator('.text-negative[role="alert"]');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText('Invalid email or password');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('unauthenticated access to protected route redirects to login', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/dashboard');
      await page.waitForURL('**/login', { timeout: 10000 });
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  // ==========================================
  // 2. RBAC PERMISSIONS
  // ==========================================
  test.describe('2. Role-Based Access Control (RBAC)', () => {
    test('ADMIN has full management access in settings', async ({ page }) => {
      await login(page, 'admin@example.com');
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('Workspace & Settings');
      await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible();
      await expect(page.locator('button:has-text("Add User")')).toBeVisible();
    });

    test('ANALYST is restricted from user administration in settings', async ({ page }) => {
      await login(page, 'analyst@example.com');
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=Team member administration is restricted to workspace Administrators.')).toBeVisible();
      await expect(page.locator('button:has-text("Add User")')).not.toBeVisible();
    });

    test('VIEWER has read-only restrictions on reports and settings', async ({ page }) => {
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
  });

  // ==========================================
  // 3. DASHBOARD & 3-CHART COMPLIANCE
  // ==========================================
  test.describe('3. Dashboard & Visual Charts', () => {
    test('dashboard loads KPIs and renders all three SVG charts from real data', async ({ page }) => {
      await login(page, 'admin@example.com');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 1. Verify KPI summary cards render
      await expect(page.locator('text=Total Feedback')).toBeVisible();
      await expect(page.locator('text=Positive Sentiment')).toBeVisible();
      await expect(page.locator('text=Negative Sentiment')).toBeVisible();

      // 2. Verify Chart 1: Volume Timeline SVG with aria-label
      const volumeSvg = page.locator('svg[aria-label="Feedback volume timeline chart"]');
      await expect(volumeSvg).toBeVisible();

      // 3. Verify Chart 2: Sentiment Distribution SVG with accessible non-color markers
      const sentimentSvg = page.locator('svg[aria-label="Sentiment distribution chart"]');
      await expect(sentimentSvg).toBeVisible();
      // Verify accessible indicators [+] and [-]
      await expect(page.getByText('[+]')).toBeVisible();
      await expect(page.getByText('[-]')).toBeVisible();

      // 4. Verify Chart 3: Top Themes Horizontal Bar Chart SVGs
      const themesSvg = page.locator('svg[aria-label^="Theme "]').first();
      await expect(themesSvg).toBeVisible();
    });
  });

  // ==========================================
  // 4. FEEDBACK INBOX & DETAIL
  // ==========================================
  test.describe('4. Feedback Inbox, Search & Detail', () => {
    test('feedback inbox loads, supports search and inspects feedback detail', async ({ page }) => {
      await login(page, 'admin@example.com');
      await page.goto('/feedback');
      await page.waitForLoadState('networkidle');

      // Verify page title and search input
      await expect(page.locator('h1')).toContainText('Feedback Inbox');
      const searchInput = page.locator('input[placeholder*="Search feedback"]');
      await expect(searchInput).toBeVisible();

      // Test Search query input
      await searchInput.fill('support');
      await page.waitForTimeout(400); // debounce
      
      // Click first feedback item
      const firstFeedbackLink = page.locator('a[href^="/feedback/"]').first();
      await expect(firstFeedbackLink).toBeVisible();
      await firstFeedbackLink.click();

      // Verify Feedback Detail Page
      await page.waitForURL('**/feedback/*');
      await expect(page.locator('text=Customer Submission')).toBeVisible();
      await expect(page.locator('text=Channel:')).toBeVisible();
      await expect(page.locator('text=AI Analysis & Classification')).toBeVisible();

      // Verify permitted status interaction (ADMIN)
      const statusSelect = page.locator('select');
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('REVIEWED');
        await page.waitForTimeout(500);
      }
    });

    test('VIEWER sees status as read-only badge rather than select dropdown', async ({ page }) => {
      await login(page, 'viewer@example.com');
      await page.goto('/feedback');
      await page.waitForLoadState('networkidle');

      const firstFeedbackLink = page.locator('a[href^="/feedback/"]').first();
      await expect(firstFeedbackLink).toBeVisible();
      await firstFeedbackLink.click();

      await page.waitForURL('**/feedback/*');
      await expect(page.locator('text=Customer Submission')).toBeVisible();
      // VIEWER should not see editable select for status
      await expect(page.locator('select')).not.toBeVisible();
    });
  });

  // ==========================================
  // 5. ASK LOOP
  // ==========================================
  test.describe('5. Ask LOOP (Grounded AI Q&A)', () => {
    test('Ask LOOP accepts question, returns grounded answer and citations', async ({ page }) => {
      await login(page, 'analyst@example.com');
      await page.goto('/ask');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('Ask LOOP');
      const input = page.locator('input[placeholder*="Ask a question"]');
      await expect(input).toBeVisible();

      // Submit grounded query
      await input.fill('What are the most common usability issues reported by customers?');
      await page.locator('button[type="submit"]:has-text("Ask")').click();

      // Wait for answer and citations container
      await expect(page.locator('text=Answer')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Sources')).toBeVisible();
    });
  });

  // ==========================================
  // 6. REPORTS
  // ==========================================
  test.describe('6. Voice of Customer Reports', () => {
    test('reports list loads and opens report detail with metrics and narrative', async ({ page }) => {
      await login(page, 'admin@example.com');
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('Voice of Customer Reports');
      
      // Check seeded report exists
      const reportLink = page.locator('a[href^="/reports/"]').first();
      await expect(reportLink).toBeVisible();
      await reportLink.click();

      // Verify report detail content
      await page.waitForURL('**/reports/*');
      await expect(page.locator('text=1. Factual Statistics')).toBeVisible();
      await expect(page.locator('text=2. Executive Narrative')).toBeVisible();
      await expect(page.locator('text=Summary Overview')).toBeVisible();
    });
  });

  // ==========================================
  // 7. SETTINGS
  // ==========================================
  test.describe('7. Workspace & Team Settings', () => {
    test('ADMIN sees workspace details and user roster', async ({ page }) => {
      await login(page, 'admin@example.com');
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=Workspace Profile')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'analyst@example.com' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'viewer@example.com' })).toBeVisible();
    });
  });

  // ==========================================
  // 8. TENANT ISOLATION
  // ==========================================
  test.describe('8. Tenant Isolation & Error Boundaries', () => {
    test('accessing foreign/non-existent feedback ID returns safe 404 error state', async ({ page }) => {
      await login(page, 'admin@example.com');
      
      // Navigate directly to non-existent or foreign workspace feedback ID
      await page.goto('/feedback/00000000-0000-0000-0000-000000000000');
      await page.waitForLoadState('networkidle');

      // Verify safe error state is shown without crashing or revealing system internals
      const errorMsg = page.locator('text=Feedback record not found in this workspace.');
      await expect(errorMsg).toBeVisible();
    });
  });

});
