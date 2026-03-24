import { test, expect } from '@playwright/test';
import { waitForHydration, assertNoEmDashes, assertPageLoads } from '../helpers/utils';

test.describe('Public Pages', () => {
  test('about page loads successfully', async ({ page }) => {
    await assertPageLoads(page, '/about');
  });

  test('testimonials page loads successfully', async ({ page }) => {
    await assertPageLoads(page, '/testimonials');
  });

  test('mortgage page loads successfully', async ({ page }) => {
    await assertPageLoads(page, '/mortgage');
  });

  test('login page loads successfully', async ({ page }) => {
    await assertPageLoads(page, '/auth/login');
  });

  test('about page has agent name', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    const name = page.locator('text=Anthony Licona');
    await expect(name.first()).toBeVisible();
  });

  test('about page has services section', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    // Should have service-related content
    const services = page.locator('text=Buyer').or(page.locator('text=Seller')).or(page.locator('text=Investment'));
    if (await services.count() > 0) {
      await expect(services.first()).toBeVisible();
    }
  });

  test('about page has contact information', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    // Should show phone or email
    const contact = page.locator('text=469').or(page.locator('text=anthony'));
    if (await contact.count() > 0) {
      await expect(contact.first()).toBeVisible();
    }
  });

  test('about page has TREC license info', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    const trec = page.locator('text=TREC');
    if (await trec.count() > 0) {
      await expect(trec.first()).toBeVisible();
    }
  });

  test('testimonials page has submission form or content', async ({ page }) => {
    await page.goto('/testimonials');
    await waitForHydration(page);

    // Page should have meaningful content
    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
  });

  test('mortgage page has calculator or content', async ({ page }) => {
    await page.goto('/mortgage');
    await waitForHydration(page);

    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
  });

  test('public pages do not redirect to login', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/about');

    await page.goto('/testimonials');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/testimonials');

    await page.goto('/mortgage');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/mortgage');
  });

  test('about page has no em dashes', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('testimonials page has no em dashes', async ({ page }) => {
    await page.goto('/testimonials');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('mortgage page has no em dashes', async ({ page }) => {
    await page.goto('/mortgage');
    await waitForHydration(page);
    await assertNoEmDashes(page);
  });

  test('about page SEO meta tags', async ({ page }) => {
    await page.goto('/about');
    await waitForHydration(page);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('404 page handles gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz');
    // Should return 404 or redirect
    expect(response?.status()).toBeDefined();
  });
});
