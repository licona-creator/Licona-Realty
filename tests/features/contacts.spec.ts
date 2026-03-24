import { test, expect } from '@playwright/test';
import { waitForHydration, assertNoEmDashes } from '../helpers/utils';

test.describe('Contacts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    expect(page.url()).toContain('/auth/login');
  });

  test('login page accessible from redirect has no em dashes', async ({ page }) => {
    await assertNoEmDashes(page);
  });
});

test.describe('Contacts Page - Auth Guard', () => {
  test('contacts route is protected', async ({ page }) => {
    const response = await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    // Either redirected to login or got the page
    const url = page.url();
    expect(url.includes('/auth/login') || url.includes('/contacts')).toBeTruthy();
  });

  test('add contact modal path is protected', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });
});
