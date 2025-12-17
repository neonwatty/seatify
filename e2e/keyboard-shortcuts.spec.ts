import { test, expect } from '@playwright/test';

// Helper to enter app from landing page
async function enterApp(page: import('@playwright/test').Page) {
  // First set localStorage before the app hydrates
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 11 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 11;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning Free")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

  // Click on first event to enter it (if event list view is shown)
  const eventCard = page.locator('.event-card').first();
  if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await eventCard.click();
    await expect(page.locator('.canvas')).toBeVisible({ timeout: 5000 });
  }
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    // Demo data has 3 tables by default - we'll work with those
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });
  });

  test.describe('Arrow key nudging', () => {
    // Skip on mobile - arrow key nudging is a desktop feature
    test('arrow keys nudge selected table by 10px', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      const initialBounds = await table.boundingBox();

      // Nudge right
      await page.keyboard.press('ArrowRight');

      const afterRight = await table.boundingBox();
      // Allow 2px tolerance for sub-pixel rendering and snap-to-grid adjustments
      expect(Math.abs(afterRight!.x - (initialBounds!.x + 10))).toBeLessThanOrEqual(2);

      // Nudge down
      await page.keyboard.press('ArrowDown');

      const afterDown = await table.boundingBox();
      expect(Math.abs(afterDown!.y - (initialBounds!.y + 10))).toBeLessThanOrEqual(2);
    });

    test('Shift+arrow keys nudge by 1px (fine nudge)', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      const initialBounds = await table.boundingBox();

      // Fine nudge right
      await page.keyboard.press('Shift+ArrowRight');

      const afterRight = await table.boundingBox();
      // Allow 1px tolerance for sub-pixel rendering
      expect(Math.abs(afterRight!.x - (initialBounds!.x + 1))).toBeLessThanOrEqual(1);
    });

    test('arrow keys do nothing when no table is selected', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();
      // Click on empty canvas to deselect
      await page.locator('.canvas').click({ position: { x: 50, y: 50 } });

      const table = page.locator('.table-component').first();
      const initialBounds = await table.boundingBox();

      // Try to nudge
      await page.keyboard.press('ArrowRight');

      // Table should not have moved
      const afterBounds = await table.boundingBox();
      expect(afterBounds!.x).toBeCloseTo(initialBounds!.x, 0);
    });
  });

  test.describe('Delete key', () => {
    // Skip on mobile - keyboard delete is a desktop feature
    test('Delete key removes selected table after confirmation', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      // Select the table
      const table = page.locator('.table-component').first();
      await table.click();

      // Press Delete and accept the confirmation
      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      // Should have 2 tables (was 3, deleted 1)
      await expect(page.locator('.table-component')).toHaveCount(2);

      // Should show deletion toast
      await expect(page.locator('.toast:has-text("Deleted")')).toBeVisible({ timeout: 3000 });
    });

    test('Backspace also removes selected items', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Backspace');

      await expect(page.locator('.table-component')).toHaveCount(2);
    });

    test('Delete key does nothing when nothing is selected', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      // Click on empty canvas to deselect
      await page.locator('.canvas').click({ position: { x: 50, y: 50 } });

      // Press Delete
      await page.keyboard.press('Delete');

      // All 3 tables should still exist
      await expect(page.locator('.table-component')).toHaveCount(3);
    });
  });

  test.describe('Help modal', () => {
    // Skip on mobile - keyboard shortcuts are a desktop feature
    test('? key opens keyboard shortcuts help', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      await page.keyboard.press('Shift+/'); // ? key

      await expect(page.locator('.shortcuts-modal')).toBeVisible();
      await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
    });

    test('Escape closes the help modal', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      await page.keyboard.press('Shift+/');
      await expect(page.locator('.shortcuts-modal')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('.shortcuts-modal')).not.toBeVisible();
    });
  });

  test.describe('Undo/Redo', () => {
    // Skip on mobile - keyboard shortcuts are a desktop feature
    test('Ctrl+Z triggers undo after deleting (which pushes history)', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      // Demo data has 3 tables - delete one to create history
      const table = page.locator('.table-component').first();
      await table.click({ force: true });

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      // Should have 2 tables now (was 3, deleted 1)
      await expect(page.locator('.table-component')).toHaveCount(2);

      // Undo with Ctrl+Z
      await page.keyboard.press('Control+z');

      // Should show undo toast
      await expect(page.locator('.toast:has-text("Undo")')).toBeVisible({ timeout: 3000 });

      // Table should be restored
      await expect(page.locator('.table-component')).toHaveCount(3);
    });
  });
});
