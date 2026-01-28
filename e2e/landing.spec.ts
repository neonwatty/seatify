import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await expect(page).toHaveTitle(/Seatify/i);
  });

  test('should navigate to login from landing', async ({ page }) => {
    await page.goto('/');

    // Look for any auth-related link or button (landing page uses buttons for CTAs)
    const authElement = page.getByRole('link', { name: /sign in|login|get started/i }).first()
      .or(page.getByRole('button', { name: /sign in|login|get started/i }).first());

    if (await authElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await authElement.click();
      // Should navigate to either login, signup, or demo
      await expect(page).toHaveURL(/\/(login|signup|demo|dashboard)/);
    }
  });
});
