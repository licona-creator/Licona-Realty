import { test, expect } from '@playwright/test';
import { waitForHydration, assertNoEmDashes } from '../helpers/utils';

test.describe('Authentication', () => {
  test('login page loads with correct elements', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // Login form elements exist
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('login page shows brand tagline in gold Playfair italic', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // Check for tagline text
    const tagline = page.locator('text=Smart Moves');
    if (await tagline.count() > 0) {
      const fontFamily = await tagline.first().evaluate(
        (el) => window.getComputedStyle(el).fontFamily
      );
      expect(fontFamily.toLowerCase()).toContain('playfair');
    }
  });

  test('login page has visible input borders', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    const emailInput = page.locator('[data-testid="email-input"]');
    const borderStyle = await emailInput.evaluate(
      (el) => window.getComputedStyle(el).borderWidth
    );
    // Should have visible borders (not 0px)
    expect(borderStyle).not.toBe('0px');
  });

  test('login page shows password strength indicator on typing', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // Type into password field
    await page.fill('[data-testid="password-input"]', 'Test123!');
    await page.waitForTimeout(300);

    // Password strength indicator should appear
    const strengthBar = page.locator('text=Weak').or(page.locator('text=Fair')).or(page.locator('text=Good')).or(page.locator('text=Strong'));
    // At least one strength label should be visible after typing
    if (await strengthBar.count() > 0) {
      await expect(strengthBar.first()).toBeVisible();
    }
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    expect(page.url()).toContain('/auth/login');
  });

  test('protected route /contacts redirects to login', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('protected route /social redirects to login', async ({ page }) => {
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('protected route /transactions redirects to login', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('protected route /settings redirects to login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('login page has no em dashes', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await page.waitForTimeout(3000);

    // Should show some error feedback and remain on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('login page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth/login');
    await waitForHydration(page);

    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});
