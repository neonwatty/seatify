/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';
import { TEST_USER } from './auth.setup';

/**
 * Extended test fixtures for Seatify E2E tests.
 *
 * Provides:
 * - authenticatedPage: A page with pre-authenticated state (uses saved storage state)
 * - testUser: The test user credentials
 */

// Extend the base test with custom fixtures
export const test = base.extend<{
  testUser: { email: string; password: string };
}>({
  // Provide test user credentials to tests
  testUser: async ({}, use) => {
    await use(TEST_USER);
  },
});

/**
 * Test fixture for authenticated tests.
 *
 * Usage in tests:
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test('should show dashboard', async ({ page }) => {
 *   // page is already authenticated
 *   await page.goto('/dashboard');
 *   await expect(page).toHaveURL('/dashboard');
 * });
 * ```
 */
export { expect };

/**
 * Helper to log in manually within a test (for tests that need fresh auth).
 */
export async function loginAsTestUser(
  page: import('@playwright/test').Page,
  user = TEST_USER
): Promise<void> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper to log out within a test.
 */
export async function logout(page: import('@playwright/test').Page): Promise<void> {
  // Click user menu
  await page.locator('.user-menu-button').click();

  // Click sign out
  await page.locator('.menu-item.sign-out').click();

  // Wait for redirect to home or login
  await expect(page).toHaveURL(/^\/$|\/login/, { timeout: 5000 });
}
