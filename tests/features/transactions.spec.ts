import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Transactions Page', () => {
  test('transactions route is protected', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('transaction pipeline redirect has no em dashes', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
