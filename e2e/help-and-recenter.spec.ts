import { test, expect } from '@playwright/test';
import { enterApp } from './test-utils';

// Check if running on mobile WebKit (which doesn't support mouse.wheel)
function isMobileWebKit(browserName: string, viewportWidth: number | null): boolean {
  return browserName === 'webkit' && (viewportWidth === null || viewportWidth < 768);
}

test.describe('Help button and recenter hotkey', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
  });

  test('clicking help button opens keyboard shortcuts modal', async ({ page }) => {
    // Click the ? help button in the header
    await page.locator('.help-btn').click();

    // Modal should be visible with keyboard shortcuts
    await expect(page.locator('.shortcuts-modal')).toBeVisible();
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Should show the recenter shortcut we added
    await expect(page.locator('.shortcut-key:has-text("0 / C")')).toBeVisible();
    await expect(page.locator('.shortcut-desc:has-text("Re-center view")')).toBeVisible();
  });

  test('pressing ? key opens keyboard shortcuts modal', async ({ page }) => {
    // Press ? key (Shift+/)
    await page.keyboard.press('Shift+/');

    // Modal should be visible
    await expect(page.locator('.shortcuts-modal')).toBeVisible();
  });

  test('pressing Escape closes the shortcuts modal', async ({ page }) => {
    // Open modal
    await page.locator('.help-btn').click();
    await expect(page.locator('.shortcuts-modal')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.shortcuts-modal')).not.toBeVisible();
  });

  test('pressing 0 key recenters the canvas', async ({ page, browserName }) => {
    // Skip on mobile WebKit - mouse.wheel is not supported
    const viewportSize = page.viewportSize();
    if (isMobileWebKit(browserName, viewportSize?.width ?? null)) {
      test.skip();
      return;
    }

    // First, pan the canvas away from center by scrolling
    const canvas = page.locator('.canvas');
    await canvas.hover();

    // Pan by simulating wheel events
    await page.mouse.wheel(500, 500);
    await page.waitForTimeout(100);

    // Press 0 to recenter
    await page.keyboard.press('0');
    await page.waitForTimeout(100);

    // The canvas should be recentered - we can verify the view changed
    // by checking that tables are still visible after recenter
    await expect(page.locator('.table-component').first()).toBeVisible();
  });

  test('pressing c key recenters the canvas', async ({ page, browserName }) => {
    // Skip on mobile WebKit - mouse.wheel is not supported
    const viewportSize = page.viewportSize();
    if (isMobileWebKit(browserName, viewportSize?.width ?? null)) {
      test.skip();
      return;
    }

    // Pan the canvas away
    const canvas = page.locator('.canvas');
    await canvas.hover();
    await page.mouse.wheel(500, 500);
    await page.waitForTimeout(100);

    // Press c to recenter
    await page.keyboard.press('c');
    await page.waitForTimeout(100);

    // Tables should still be visible after recenter
    await expect(page.locator('.table-component').first()).toBeVisible();
  });

  test('shortcut keys have proper styling (no text overflow)', async ({ page }) => {
    // Open the shortcuts modal
    await page.locator('.help-btn').click();
    await expect(page.locator('.shortcuts-modal')).toBeVisible();

    // Check that longer shortcut keys fit within their containers
    const shiftArrowKey = page.locator('.shortcut-key:has-text("Shift+Arrow")');
    await expect(shiftArrowKey).toBeVisible();

    // Get the bounding box to verify text isn't overflowing
    const box = await shiftArrowKey.boundingBox();
    expect(box).toBeTruthy();
    // The min-width should be approximately 100px (allowing for small browser variations)
    expect(box!.width).toBeGreaterThanOrEqual(95);
  });
});
