import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Settings Page', () => {
  test('settings route is protected', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('settings redirect page has no em dashes', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
