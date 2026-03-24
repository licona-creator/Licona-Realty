import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Approval Queue', () => {
  test('approval-queue route is protected', async ({ page }) => {
    await page.goto('/approval-queue');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('approval queue redirect page has no em dashes', async ({ page }) => {
    await page.goto('/approval-queue');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
