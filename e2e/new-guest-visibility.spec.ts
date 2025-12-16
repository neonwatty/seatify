import { test, expect } from '@playwright/test';
import { enterApp, clickAddGuest } from './test-utils';

test.describe('New Guest Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
  });

  test('newly added guest is automatically selected', async ({ page }) => {
    // Click Add Guest button (works on mobile and desktop)
    await clickAddGuest(page);

    // Wait for the new guest to appear
    await page.waitForTimeout(300);

    // Find the newest canvas guest (should have .selected class)
    const selectedGuest = page.locator('.canvas-guest.selected');
    await expect(selectedGuest).toBeVisible();
  });

  test('newly added guest has highlight animation class', async ({ page }) => {
    // Click Add Guest button (works on mobile and desktop)
    await clickAddGuest(page);

    // The new guest should have the newly-added class immediately
    const newlyAddedGuest = page.locator('.canvas-guest.newly-added');
    await expect(newlyAddedGuest).toBeVisible();
  });

  test('highlight animation class is removed after animation completes', async ({ page }) => {
    // Click Add Guest button (works on mobile and desktop)
    await clickAddGuest(page);

    // Verify newly-added class is present initially
    const newlyAddedGuest = page.locator('.canvas-guest.newly-added');
    await expect(newlyAddedGuest).toBeVisible();

    // Wait for animation to complete (1.5s) plus a small buffer
    await page.waitForTimeout(1700);

    // The newly-added class should be removed
    await expect(newlyAddedGuest).toHaveCount(0);
  });

  test('newly added guest shows name label (due to selection)', async ({ page }) => {
    // Click Add Guest button (works on mobile and desktop)
    await clickAddGuest(page);

    // Wait for the new guest
    await page.waitForTimeout(300);

    // The selected guest should have visible label
    const selectedGuest = page.locator('.canvas-guest.selected');
    const label = selectedGuest.locator('.canvas-guest-label');

    // Label should be visible (opacity 1 due to selection)
    await expect(label).toBeVisible();
  });
});
