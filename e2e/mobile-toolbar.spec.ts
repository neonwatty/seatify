import { test, expect } from '@playwright/test';

// Mobile viewport size (iPhone 14 Pro)
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Skip these tests on chromium project in CI since viewport changes don't work reliably
// in headless CI environment with Desktop Chrome viewport settings
// eslint-disable-next-line no-empty-pattern
test.beforeEach(async ({}, testInfo) => {
  if (testInfo.project.name === 'chromium' && process.env.CI) {
    test.skip(true, 'Mobile toolbar tests require mobile viewport - skipped on chromium in CI');
  }
});

// Helper to enter the app from landing page on mobile
// Note: Canvas view uses immersive mode without iOS Tab Bar
// So we navigate to guests view where iOS Tab Bar is available
async function enterAppMobile(page: import('@playwright/test').Page) {
  // Set mobile viewport before any navigation
  await page.setViewportSize(MOBILE_VIEWPORT);

  // Set up localStorage via init script (runs before each page load)
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 15 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.state.hasSeenImmersiveHint = true; // Skip immersive hint
    data.version = 15;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });

  // Navigate to the app - viewport is already set to mobile
  await page.goto('/');
  await page.click('button:has-text("Start Planning Free")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

  // Click on first event to enter it (if event list view is shown)
  const eventCard = page.locator('.event-card').first();
  if (await eventCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await eventCard.click();
    await expect(page.locator('.canvas')).toBeVisible({ timeout: 5000 });

    // Navigate to guests view where iOS Tab Bar is available
    // Canvas view uses immersive mode without the iOS Tab Bar
    const currentUrl = page.url();
    const guestsUrl = currentUrl.replace('/canvas', '/guests');
    await page.goto(guestsUrl);
    await page.waitForTimeout(300);
  }

  // Wait for the iOS Tab Bar to appear
  await expect(page.locator('.ios-tab-bar')).toBeVisible({ timeout: 5000 });
}

// Helper to enter app on desktop
async function enterAppDesktop(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 15 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 15;
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

test.describe('Mobile iOS Tab Bar - Visibility', () => {
  test('iOS Tab Bar is visible on mobile viewport', async ({ page }) => {
    await enterAppMobile(page);

    // iOS Tab Bar should be visible
    await expect(page.locator('.ios-tab-bar')).toBeVisible();

    // Desktop toolbar buttons should not be visible
    await expect(page.locator('.toolbar-btn:has-text("Add Table")')).not.toBeVisible();
  });

  test('desktop toolbar is visible on desktop viewport', async ({ page }) => {
    await enterAppDesktop(page);

    // iOS Tab Bar should not be visible on desktop
    await expect(page.locator('.ios-tab-bar')).not.toBeVisible();

    // Desktop toolbar buttons should be visible
    await expect(page.locator('.toolbar-btn:has-text("Add Table")')).toBeVisible();
  });
});

test.describe('Mobile iOS Tab Bar - Menu Interaction', () => {
  test('Settings tab opens menu', async ({ page }) => {
    await enterAppMobile(page);

    // Click Settings tab in iOS Tab Bar
    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();

    // Menu sheet should appear
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();

    // Backdrop should be visible
    await expect(page.locator('.mobile-menu-backdrop')).toBeVisible();
  });

  test('menu closes on backdrop click', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Click backdrop at the top of the screen (outside menu)
    await page.locator('.mobile-menu-backdrop').click({ position: { x: 10, y: 10 } });

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });

  test('menu closes on Escape key', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });

  test('Settings tab opens menu sheet', async ({ page }) => {
    await enterAppMobile(page);

    const settingsTab = page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")');

    // Click Settings tab
    await settingsTab.click();

    // Menu sheet should open (Settings is an action button, not a nav tab)
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
  });
});

test.describe('Mobile iOS Tab Bar - Navigation', () => {
  test('iOS Tab Bar contains navigation tabs', async ({ page }) => {
    await enterAppMobile(page);

    // Check that navigation tabs exist
    await expect(page.locator('.ios-tab-bar .tab-bar-item:has-text("Canvas")')).toBeVisible();
    await expect(page.locator('.ios-tab-bar .tab-bar-item:has-text("Guests")')).toBeVisible();
    await expect(page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")')).toBeVisible();
  });

  test('active tab is highlighted in iOS Tab Bar', async ({ page }) => {
    await enterAppMobile(page);

    // Guests tab should be active (we're on guests view)
    await expect(page.locator('.ios-tab-bar .tab-bar-item:has-text("Guests")')).toHaveClass(/active/);
  });

  test('clicking Canvas tab navigates to canvas view', async ({ page }) => {
    await enterAppMobile(page);

    // Click Canvas tab
    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Canvas")').click();
    await page.waitForTimeout(300);

    // Should navigate to canvas view (URL changes)
    await expect(page).toHaveURL(/\/canvas/);
  });
});

test.describe('Mobile Menu Sheet - Actions', () => {
  test('menu contains action buttons', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Check that action buttons exist in the DOM
    // On guests view, Add Guest should be available
    await expect(page.locator('.menu-item:has-text("Add Guest")')).toBeAttached();
    // Note: Add Table is canvas-specific and not available on guests view
    // Canvas uses immersive mode with BottomControlSheet instead of iOS Tab Bar
  });

  test('menu contains view section', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // View section should have Dashboard, Canvas, and Guest List options
    await expect(page.locator('.menu-view-btn:has-text("Dashboard")')).toBeAttached();
    await expect(page.locator('.menu-view-btn:has-text("Canvas")')).toBeAttached();
    await expect(page.locator('.menu-view-btn:has-text("Guest List")')).toBeAttached();
  });
});

test.describe('Mobile Menu Sheet - Canvas Tools', () => {
  // Note: Canvas view now uses immersive mode with BottomControlSheet
  // Canvas-specific tools like "Show Relationships" are in the BottomControlSheet, not hamburger menu
  // The iOS Tab Bar is only available on guests view, which doesn't have canvas tools

  test.skip('relationships toggle is available in menu', async ({ page }) => {
    // This test is skipped because:
    // - Canvas view uses immersive mode (no iOS Tab Bar)
    // - Guests view has iOS Tab Bar but not canvas tools
    // Canvas tools are now accessed via BottomControlSheet in immersive mode
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Relationships toggle should exist in the menu
    await expect(page.locator('.menu-item:has-text("Show Relationships")')).toBeAttached();
  });
});

test.describe('Mobile Menu Sheet - Event Info', () => {
  test('shows event name in menu footer', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Event name should exist in the footer
    await expect(page.locator('.menu-footer .event-name')).toBeAttached();
  });

  test('shows guest count in menu footer', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.ios-tab-bar .tab-bar-item:has-text("Settings")').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Guest count should exist in the footer
    await expect(page.locator('.menu-footer .guest-count')).toBeAttached();
  });
});
