import { test, expect } from '@playwright/test';
import { waitForHydration, assertNoEmDashes } from '../helpers/utils';

test.describe('Social Media Page', () => {
  test('social route is protected', async ({ page }) => {
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('social redirect page has no em dashes', async ({ page }) => {
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
