import { type Page } from '@playwright/test';

/**
 * Login helper for authenticated tests.
 * Uses test credentials from environment variables.
 */
export async function loginAsAnthony(page: Page) {
  const email = process.env.TEST_EMAIL || 'anthony@liconarealty.com';
  const password = process.env.TEST_PASSWORD || 'TestPassword123!';

  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {
    // If MFA is required or login fails, we stay on login page
  });
}

/**
 * Check if we're on an authenticated page (not redirected to login)
 */
export function isAuthenticated(page: Page): boolean {
  return !page.url().includes('/auth/login');
}

/**
 * Navigate to an authenticated route, handling potential redirects
 */
export async function navigateAuthenticated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
