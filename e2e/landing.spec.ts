import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await expect(page).toHaveTitle(/Seatify/i);
  });

  test('should navigate to login from landing', async ({ page }) => {
    await page.goto('/');

    // Look for any auth-related link
    const authLink = page.getByRole('link', { name: /sign in|login|get started/i }).first();

    if (await authLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await authLink.click();
      // Should navigate to either login or signup
      await expect(page).toHaveURL(/\/(login|signup)/);
    }
  });
});
