import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Scheduling Page', () => {
  test('scheduling route is protected', async ({ page }) => {
    await page.goto('/scheduling');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('scheduling redirect page has no em dashes', async ({ page }) => {
    await page.goto('/scheduling');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
