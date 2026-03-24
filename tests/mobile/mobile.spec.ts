import { test, expect } from '@playwright/test';
import { waitForHydration, assertNoEmDashes } from '../helpers/utils';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('login page renders correctly at 375px', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('login form inputs are usable at mobile width', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    const emailInput = page.locator('[data-testid="email-input"]');
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    // Input should be at least 200px wide on mobile
    if (box) {
      expect(box.width).toBeGreaterThan(200);
    }
  });

  test('about page is responsive at 375px', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376); // 375 + 1px tolerance
  });

  test('testimonials page is responsive at 375px', async ({ page }) => {
    await page.goto('/testimonials');
    await waitForHydration(page);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test('mortgage page is responsive at 375px', async ({ page }) => {
    await page.goto('/mortgage');
    await waitForHydration(page);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test('no horizontal scrollbar on login at 375px', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    const hasHorizontalScroll = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test('mobile login page has no em dashes', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('protected routes redirect to login on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('public pages load correctly on mobile', async ({ page }) => {
    const publicPages = ['/about', '/testimonials', '/mortgage'];
    for (const path of publicPages) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
    }
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('login page renders correctly at tablet width', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('about page renders correctly at tablet width', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(769);
  });
});
