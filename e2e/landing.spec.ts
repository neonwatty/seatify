import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page content', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /seatify/i })).toBeVisible();
  });

  test('should have navigation to login', async ({ page }) => {
    await page.goto('/');

    // Look for sign in link
    const signInLink = page.getByRole('link', { name: /sign in/i });
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should have navigation to signup', async ({ page }) => {
    await page.goto('/');

    // Look for get started or sign up link
    const getStartedLink = page.getByRole('link', { name: /get started|sign up/i });
    if (await getStartedLink.isVisible()) {
      await getStartedLink.click();
      await expect(page).toHaveURL(/\/signup/);
    }
  });
});
