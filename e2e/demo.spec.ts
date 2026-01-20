import { test, expect } from '@playwright/test';

test.describe('Demo Page', () => {
  test.describe('accessibility', () => {
    test('should load demo page without authentication', async ({ page }) => {
      await page.goto('/demo');

      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);

      // Should show the canvas view with demo content
      await expect(page.locator('.canvas-container, .seating-canvas, [data-testid="canvas"]')).toBeVisible({ timeout: 10000 });
    });

    test('should display demo banner', async ({ page }) => {
      await page.goto('/demo');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show the demo banner
      const banner = page.locator('.demo-banner');
      await expect(banner).toBeVisible({ timeout: 10000 });
    });

    test('should show demo banner with initial message', async ({ page }) => {
      await page.goto('/demo');

      await page.waitForLoadState('networkidle');

      // Check for demo banner text
      const bannerText = page.locator('.demo-banner-text');
      await expect(bannerText).toBeVisible({ timeout: 10000 });
    });

    test('should have signup CTA in demo banner', async ({ page }) => {
      await page.goto('/demo');

      await page.waitForLoadState('networkidle');

      // Should have a CTA button
      const ctaButton = page.locator('.demo-banner-cta');
      await expect(ctaButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('demo content', () => {
    test('should display pre-seeded tables', async ({ page }) => {
      await page.goto('/demo');

      await page.waitForLoadState('networkidle');

      // Wait for canvas to be interactive
      await page.waitForTimeout(1000);

      // Should have table elements visible
      const tables = page.locator('.table-element, [data-testid="table"]');
      const tableCount = await tables.count();

      // Demo should have at least one table
      expect(tableCount).toBeGreaterThan(0);
    });

    test('should display pre-seeded guests', async ({ page }) => {
      await page.goto('/demo');

      await page.waitForLoadState('networkidle');

      // Wait for canvas to be interactive
      await page.waitForTimeout(1000);

      // Should have guest elements or guest list
      const guests = page.locator('.guest-chip, .guest-avatar, [data-testid="guest"]');
      const guestCount = await guests.count();

      // Demo should have guests
      expect(guestCount).toBeGreaterThan(0);
    });
  });

  test.describe('demo banner CTA', () => {
    test('should navigate to signup when CTA is clicked', async ({ page }) => {
      await page.goto('/demo');

      await page.waitForLoadState('networkidle');

      // Click the CTA button
      const ctaButton = page.locator('.demo-banner-cta');
      await ctaButton.click();

      // Should navigate to signup page
      await expect(page).toHaveURL(/\/signup/);
    });
  });
});

test.describe('Landing Page Choice Modal', () => {
  test('should show choice modal when clicking Start Planning Free', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Find and click the main CTA button
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Should show the choice modal
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should display two options in choice modal', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Should have two options
    const demoOption = page.locator('.landing-choice-option--demo');
    const signupOption = page.locator('.landing-choice-option--signup');

    await expect(demoOption).toBeVisible();
    await expect(signupOption).toBeVisible();
  });

  test('should navigate to demo when Try Demo is clicked', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Click Try Demo option
    const demoOption = page.locator('.landing-choice-option--demo');
    await demoOption.click();

    // Should navigate to demo page
    await expect(page).toHaveURL(/\/dashboard\/events\/.*\/canvas/);
  });

  test('should navigate to signup when Create Account is clicked', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Click Create Account option
    const signupOption = page.locator('.landing-choice-option--signup');
    await signupOption.click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Modal should be visible
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).toBeVisible();

    // Click on the overlay (outside the modal)
    const overlay = page.locator('.landing-choice-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Click close button
    const closeButton = page.locator('.landing-choice-close');
    await closeButton.click();

    // Modal should be hidden
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).not.toBeVisible();
  });
});

test.describe('View Demo Event Button', () => {
  test('should navigate directly to demo from View Demo Event button', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Click the View Demo Event button (not the main CTA)
    const demoButton = page.getByRole('button', { name: /view demo event/i });
    await demoButton.click();

    // Should navigate directly to demo (no modal)
    await expect(page).toHaveURL(/\/dashboard\/events\/.*\/canvas/);
  });
});
