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

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    // Demo data has 3 tables by default - we'll work with those
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });
  });

  test.describe('Toast appearance and behavior', () => {
    // Skip on mobile - keyboard Delete is a desktop feature
    test('delete action shows toast notification', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      const toast = page.locator('.toast');
      await expect(toast).toBeVisible({ timeout: 3000 });
      await expect(toast).toContainText('Deleted');
    });

    test('toast appears at bottom center of screen', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      const toastContainer = page.locator('.toast-container');
      await expect(toastContainer).toBeVisible({ timeout: 3000 });

      // Check it's positioned at bottom center
      await expect(toastContainer).toHaveCSS('position', 'fixed');
      // Bottom position varies by viewport, just check it's set
      const bottomValue = await toastContainer.evaluate(el => getComputedStyle(el).bottom);
      expect(parseInt(bottomValue)).toBeGreaterThan(0);
    });

    test('toast auto-dismisses after a few seconds', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      const table = page.locator('.table-component').first();
      await table.click();

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      const toast = page.locator('.toast').first();
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Wait for auto-dismiss (default is 3 seconds)
      await expect(toast).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Undo toast with action button', () => {
    // Skip on mobile - keyboard shortcuts are a desktop feature
    test('undo toast has Redo action button', async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
      if (isMobile) test.skip();

      // Demo data has 3 tables - delete one to create history
      const table = page.locator('.table-component').first();
      await table.click({ force: true });

      page.on('dialog', dialog => dialog.accept());
      await page.keyboard.press('Delete');

      // Should have 2 tables now
      await expect(page.locator('.table-component')).toHaveCount(2);

      // Undo with Ctrl+Z
      await page.keyboard.press('Control+z');

      const toast = page.locator('.toast:has-text("Undo")');
      await expect(toast).toBeVisible({ timeout: 3000 });

      // Should have a Redo action button
      await expect(toast.locator('.toast-action:has-text("Redo")')).toBeVisible();
    });
  });
});
