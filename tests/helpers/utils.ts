import { type Page, expect } from '@playwright/test';

/** Brand color constants for visual assertions */
export const BRAND = {
  colors: {
    navy: '#132236',
    gold: '#d3a971',
    surface: '#f4f4f4',
    text: '#1a1a1a',
    white: '#ffffff',
  },
  fonts: {
    playfair: 'Playfair Display',
    montserrat: 'Montserrat',
    inter: 'Inter',
    dmSerif: 'DM Serif Display',
    sacramento: 'Sacramento',
  },
};

/** Wait for page to be fully loaded and hydrated */
export async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for Next.js hydration
  await page.waitForTimeout(500);
}

/** Check that no console errors occurred */
export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/** Assert element has specific CSS property value */
export async function assertCss(
  page: Page,
  selector: string,
  property: string,
  expectedValue: string
) {
  const value = await page.locator(selector).first().evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property
  );
  expect(value).toContain(expectedValue);
}

/** Assert no em dashes in visible text */
export async function assertNoEmDashes(page: Page) {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('\u2014');
}

/** Assert no window.alert calls */
export async function assertNoAlerts(page: Page) {
  let alertFired = false;
  page.on('dialog', () => {
    alertFired = true;
  });
  // Give time for any alerts to fire
  await page.waitForTimeout(1000);
  expect(alertFired).toBe(false);
}

/** Check page returns 200 status */
export async function assertPageLoads(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status()).toBeLessThan(400);
}

/** Check viewport-specific visibility */
export async function assertVisibleAtViewport(
  page: Page,
  selector: string,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(300);
  await expect(page.locator(selector).first()).toBeVisible();
}
