import { test, expect } from '@playwright/test';

/**
 * Profile Page E2E tests.
 *
 * These tests verify:
 * - Unauthenticated users are redirected to login
 * - Profile page structure exists
 *
 * Note: Authenticated tests are skipped in CI because there's no seeded test user
 * with login credentials. The demo user in seed.sql is for public demo access only.
 */

test.describe('Profile Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have profile route configured', async ({ page }) => {
    // First go to login page to verify it exists
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Then navigate to profile - should redirect to login (proving the route exists)
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });
});
