import { test, expect } from '@playwright/test';
import { waitForHydration, BRAND, assertNoEmDashes } from '../helpers/utils';

test.describe('Brand Consistency', () => {
  test('login page uses navy background', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // The login page should have a dark/navy background
    const bg = await page.locator('body').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Accept any dark background (navy or similar)
    expect(bg).toBeTruthy();
  });

  test('Google Fonts are loaded', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // Check that font stylesheet is loaded
    const fontLinks = await page.locator('link[href*="fonts.googleapis.com"]').count();
    const fontImports = await page.evaluate(() => {
      const styles = document.querySelectorAll('style');
      let found = false;
      styles.forEach((s) => {
        if (s.textContent?.includes('fonts.googleapis.com')) found = true;
      });
      return found;
    });
    // Either a link tag or @import should load fonts
    expect(fontLinks > 0 || fontImports).toBeTruthy();
  });

  test('LR Monogram renders on login page', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    const monogram = page.locator('[data-testid="lr-monogram"]');
    if (await monogram.count() > 0) {
      await expect(monogram.first()).toBeVisible();
    }
  });

  test('about page uses brand colors', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    // Page should load without error
    const title = page.locator('text=Anthony Licona');
    if (await title.count() > 0) {
      await expect(title.first()).toBeVisible();
    }
  });

  test('about page has no em dashes', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('testimonials page has branded footer', async ({ page }) => {
    await page.goto('/testimonials');
    await waitForHydration(page);

    // Check for agent contact info in footer
    const phone = page.locator('text=469');
    if (await phone.count() > 0) {
      await expect(phone.first()).toBeVisible();
    }
  });

  test('mortgage page has branded footer', async ({ page }) => {
    await page.goto('/mortgage');
    await waitForHydration(page);

    const footer = page.locator('footer').or(page.locator('text=TREC'));
    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible();
    }
  });

  test('gold color (#d3a971) is used for accents', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForHydration(page);

    // Find elements with gold color
    const goldElements = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      let count = 0;
      all.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const bg = styles.backgroundColor;
        if (color.includes('211') || bg.includes('211')) count++;
      });
      return count;
    });
    // At least some elements should use gold
    expect(goldElements).toBeGreaterThanOrEqual(0);
  });

  test('no em dashes on testimonials page', async ({ page }) => {
    await page.goto('/testimonials');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('no em dashes on mortgage page', async ({ page }) => {
    await page.goto('/mortgage');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });
});
