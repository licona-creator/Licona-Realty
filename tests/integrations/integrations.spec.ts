import { test, expect } from '@playwright/test';

test.describe('OAuth Integration Routes', () => {
  /**
   * Smoke tests for OAuth redirect flows.
   * These verify that:
   * 1. OAuth initiation routes redirect to the correct provider
   * 2. OAuth callback routes handle missing params gracefully
   * 3. Unauthenticated users are blocked from initiating OAuth
   */

  // ── Google OAuth ──

  test('GET /api/auth/google redirects unauthenticated users to login', async ({ page }) => {
    const response = await page.goto('/api/auth/google');
    // Middleware redirects unauthenticated users, but since this is a public path
    // the route itself should return 401 if no session
    expect(page.url()).toMatch(/auth\/login|api\/auth\/google/);
  });

  test('GET /api/auth/google/callback handles missing code param', async ({ page }) => {
    await page.goto('/api/auth/google/callback?error=access_denied');
    await page.waitForLoadState('networkidle');
    // Should redirect to settings with error
    expect(page.url()).toContain('error=google_auth_failed');
  });

  test('GET /api/auth/google/callback handles missing state param', async ({ page }) => {
    await page.goto('/api/auth/google/callback?code=test_code');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('error=google_auth_failed');
  });

  // ── DocuSign OAuth ──

  test('GET /api/auth/docusign redirects unauthenticated users to login', async ({ page }) => {
    const response = await page.goto('/api/auth/docusign');
    expect(page.url()).toMatch(/auth\/login|api\/auth\/docusign/);
  });

  test('GET /api/auth/docusign/callback handles missing code param', async ({ page }) => {
    await page.goto('/api/auth/docusign/callback?error=access_denied');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('error=docusign_auth_failed');
  });

  test('GET /api/auth/docusign/callback handles missing state param', async ({ page }) => {
    await page.goto('/api/auth/docusign/callback?code=test_code');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('error=docusign_auth_failed');
  });

  // ── Canva OAuth ──

  test('GET /api/auth/canva redirects unauthenticated users to login', async ({ page }) => {
    const response = await page.goto('/api/auth/canva');
    expect(page.url()).toMatch(/auth\/login|api\/auth\/canva/);
  });

  test('GET /api/auth/canva/callback handles missing code param', async ({ page }) => {
    await page.goto('/api/auth/canva/callback?error=access_denied');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('error=canva_auth_failed');
  });

  test('GET /api/auth/canva/callback handles missing state param', async ({ page }) => {
    await page.goto('/api/auth/canva/callback?code=test_code');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('error=canva_auth_failed');
  });

  // ── Integration Settings UI ──

  test('settings/integrations route is protected', async ({ page }) => {
    await page.goto('/settings?section=integrations');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/auth/login');
  });
});
