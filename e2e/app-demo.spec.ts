import { test, expect } from '@playwright/test';
import {
  enterApp,
  isMobileViewport,
  addTable,
  clickAddGuest,
  switchView,
  toggleRelationships,
  openMobileMenu,
} from './test-utils';

test.describe('Seatify App Demo', () => {
  test('landing page shows correct branding', async ({ page }) => {
    await page.goto('/');

    // Check page title contains Seatify
    await expect(page).toHaveTitle(/Seatify/);

    // Check landing page logo
    await expect(page.locator('.landing-logo')).toContainText('Seatify');

    // Check CTA button exists
    await expect(page.locator('button:has-text("Start Planning")')).toBeVisible();
  });

  test('demo data loads with tables and guests', async ({ page }) => {
    await enterApp(page);

    // Demo should have tables visible
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Demo should have guests (either seated or unassigned)
    const seatedGuests = page.locator('.seat-guest');
    const canvasGuests = page.locator('.canvas-guest');

    // Wait for guests to load
    await page.waitForTimeout(500);

    // Should have guests in the app
    const seatedCount = await seatedGuests.count();
    const canvasCount = await canvasGuests.count();
    expect(seatedCount + canvasCount).toBeGreaterThan(0);
  });

  test('can switch between Canvas and Guest List views', async ({ page }) => {
    await enterApp(page);

    // Should start in Canvas view
    await expect(page.locator('.canvas')).toBeVisible();

    // Click on Guest List view
    await switchView(page, 'guests');

    // Should show guest list (look for the sidebar content changing)
    await page.waitForTimeout(500);

    // Switch back to Canvas
    await switchView(page, 'canvas');

    // Canvas should be visible again
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('can toggle relationships panel', async ({ page }) => {
    await enterApp(page);

    // Find and click the Relationships button
    await toggleRelationships(page);

    // Relationships panel should appear
    await expect(page.locator('.relationships-panel')).toBeVisible();

    // Click close button to hide it
    await page.locator('.relationships-panel-header .close-btn').click();

    // Panel should be hidden
    await expect(page.locator('.relationships-panel')).not.toBeVisible();
  });

  test('optimize button is visible in canvas view', async ({ page }) => {
    await enterApp(page);
    const isMobile = await isMobileViewport(page);

    if (isMobile) {
      // On mobile, optimize is in the hamburger menu
      await openMobileMenu(page);
      await expect(page.locator('.menu-item:has-text("Optimize"), .menu-item:has-text("Reset")')).toBeVisible();
    } else {
      // Optimize button should be visible in desktop toolbar
      await expect(page.locator('.toolbar-btn.optimize, .toolbar-btn.reset')).toBeVisible();
    }
  });

  test('can add a new table via dropdown', async ({ page }) => {
    await enterApp(page);

    // Count initial tables
    const initialCount = await page.locator('.table-component').count();

    // Use the helper to add a table (works on both mobile and desktop)
    await addTable(page, 'round');

    // Verify a new table was added
    await expect(page.locator('.table-component')).toHaveCount(initialCount + 1, { timeout: 5000 });
  });

  test('can add a new guest', async ({ page }) => {
    await enterApp(page);

    // Count initial guests
    const initialSeated = await page.locator('.seat-guest').count();
    const initialCanvas = await page.locator('.canvas-guest').count();
    const initialTotal = initialSeated + initialCanvas;

    // Click Add Guest button (works on both mobile and desktop)
    await clickAddGuest(page);

    // Wait for guest to be added
    await page.waitForTimeout(500);

    // Count after
    const finalSeated = await page.locator('.seat-guest').count();
    const finalCanvas = await page.locator('.canvas-guest').count();
    const finalTotal = finalSeated + finalCanvas;

    expect(finalTotal).toBe(initialTotal + 1);
  });

  test('can zoom in and out on canvas', async ({ page }) => {
    await enterApp(page);

    // Zoom controls are hidden on very small screens (< 480px)
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 480) {
      test.skip();
      return;
    }

    // Get initial zoom display value
    const zoomDisplay = page.locator('.zoom-display');
    const initialZoom = await zoomDisplay.textContent();

    // Click zoom in
    await page.locator('.zoom-controls button').first().click();

    // Zoom should have changed
    const newZoom = await zoomDisplay.textContent();
    expect(newZoom).not.toBe(initialZoom);
  });

  test('event name is editable', async ({ page }) => {
    await enterApp(page);

    const eventNameInput = page.locator('.event-name-input');

    // Clear and type new name
    await eventNameInput.clear();
    await eventNameInput.fill('My Wedding Reception');

    // Value should be updated
    await expect(eventNameInput).toHaveValue('My Wedding Reception');
  });
});

test.describe('Optimization Feature', () => {
  test('clicking optimize changes button to reset', async ({ page }) => {
    // Set onboarding completion before navigating
    await page.addInitScript(() => {
      const data = { state: { hasCompletedOnboarding: true }, version: 11 };
      localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
    });

    // Navigate to landing page and enter app fresh
    await page.goto('/');
    await page.click('button:has-text("Start Planning Free")');
    await page.waitForURL(/\/#\/events/);
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

    // Click on first event to enter it
    const eventCard = page.locator('.event-card').first();
    if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eventCard.click();
      await page.waitForURL(/\/#\/events\/[^/]+\/canvas/);
      await expect(page.locator('.canvas')).toBeVisible({ timeout: 5000 });
    }

    const isMobile = await isMobileViewport(page);
    await page.waitForTimeout(1000);

    if (isMobile) {
      // On mobile, optimize is in the hamburger menu
      await openMobileMenu(page);
      const optimizeItem = page.locator('.menu-item:has-text("Optimize")');
      const resetItem = page.locator('.menu-item:has-text("Reset")');

      // If optimize is visible, clicking it should change it to reset
      if (await optimizeItem.isVisible()) {
        await optimizeItem.click();
        await page.waitForTimeout(1000);

        // Re-open menu and check for reset
        await openMobileMenu(page);
        await expect(resetItem).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Check if optimize button exists
      const optimizeBtn = page.locator('.toolbar-btn.optimize');
      const resetBtn = page.locator('.toolbar-btn.reset');

      // If optimize is visible, clicking it should show reset
      if (await optimizeBtn.isVisible()) {
        await optimizeBtn.click();

        // Wait for animation/processing
        await page.waitForTimeout(1000);

        // Should now show reset button
        await expect(resetBtn).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
