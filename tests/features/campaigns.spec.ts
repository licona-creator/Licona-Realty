import { test, expect } from '@playwright/test';
import { assertNoEmDashes } from '../helpers/utils';

test.describe('Campaigns Page', () => {
  test('campaigns route is protected', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });

  test('campaigns redirect page has no em dashes', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');
    await assertNoEmDashes(page);
  });
});
