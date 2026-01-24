import { test, expect } from '@playwright/test';

/**
 * Profile Page E2E tests.
 *
 * Tests verify that:
 * - Profile route exists and is protected
 * - Unauthenticated users are redirected to login
 *
 * Note: Authenticated profile tests are skipped in CI until
 * we have a reliable auth fixture for E2E tests.
 */

test.describe('Profile Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('profile route should exist and be protected', async ({ page }) => {
    // Navigate to profile page (will redirect to login since not authenticated)
    await page.goto('/profile');

    // Should redirect to login, not show a 404 page
    await expect(page).toHaveURL(/\/login/);

    // The login page should be visible (confirming successful redirect, not 404)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
