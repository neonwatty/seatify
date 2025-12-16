import { test, expect } from '@playwright/test';
import { enterApp, addTable } from './test-utils';

test.describe('New Table Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
  });

  test('newly added table has highlight animation class', async ({ page }) => {
    // Add a round table (works on mobile and desktop)
    await addTable(page, 'round');

    // The new table should have the newly-added class immediately
    const newlyAddedTable = page.locator('.table-component.newly-added');
    await expect(newlyAddedTable).toBeVisible();
  });

  test('highlight animation class is removed after animation completes', async ({ page }) => {
    // Add a round table (works on mobile and desktop)
    await addTable(page, 'round');

    // Verify newly-added class is present initially
    const newlyAddedTable = page.locator('.table-component.newly-added');
    await expect(newlyAddedTable).toBeVisible();

    // Wait for animation to complete (1.5s) plus a small buffer
    await page.waitForTimeout(1700);

    // The newly-added class should be removed
    await expect(newlyAddedTable).toHaveCount(0);
  });

  test('different table shapes get highlight animation', async ({ page }) => {
    // Test rectangle table (works on mobile and desktop)
    await addTable(page, 'rectangle');

    const newlyAddedTable = page.locator('.table-component.newly-added');
    await expect(newlyAddedTable).toBeVisible();

    // Verify it's a rectangle
    await expect(newlyAddedTable).toHaveClass(/rectangle/);
  });
});
