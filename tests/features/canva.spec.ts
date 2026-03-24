import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Canva Studio Page', () => {
  test('canva route is protected', async ({ page }) => {
    await page.goto('/canva');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('canva redirect page has no em dashes', async ({ page }) => {
    await page.goto('/canva');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
