import { test, expect } from '@playwright/test';

// Mobile viewport size (iPhone 14 Pro)
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Helper to enter the app from landing page on mobile
async function enterAppMobile(page: import('@playwright/test').Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 10 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 10;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

// Helper to enter app on desktop
async function enterAppDesktop(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 10 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 10;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

test.describe('Mobile Toolbar Menu - Visibility', () => {
  test('hamburger menu is visible on mobile viewport', async ({ page }) => {
    await enterAppMobile(page);

    // Hamburger button should be visible
    await expect(page.locator('.hamburger-btn')).toBeVisible();

    // Desktop toolbar buttons should not be visible
    await expect(page.locator('.toolbar-btn:has-text("Add Table")')).not.toBeVisible();
  });

  test('desktop toolbar is visible on desktop viewport', async ({ page }) => {
    await enterAppDesktop(page);

    // Hamburger button should not be visible
    await expect(page.locator('.hamburger-btn')).not.toBeVisible();

    // Desktop toolbar buttons should be visible
    await expect(page.locator('.toolbar-btn:has-text("Add Table")')).toBeVisible();
  });
});

test.describe('Mobile Toolbar Menu - Menu Interaction', () => {
  test('hamburger button opens menu', async ({ page }) => {
    await enterAppMobile(page);

    // Click hamburger button
    await page.locator('.hamburger-btn').click();

    // Menu sheet should appear
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();

    // Backdrop should be visible
    await expect(page.locator('.mobile-menu-backdrop')).toBeVisible();
  });

  test('menu closes on backdrop click', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Click backdrop at the top of the screen (outside menu)
    await page.locator('.mobile-menu-backdrop').click({ position: { x: 10, y: 10 } });

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });

  test('menu closes on Escape key', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });

  test('hamburger button animates to X when menu is open', async ({ page }) => {
    await enterAppMobile(page);

    // Click to open
    await page.locator('.hamburger-btn').click();

    // Hamburger button should have active class
    await expect(page.locator('.hamburger-btn')).toHaveClass(/active/);
  });
});

test.describe('Mobile Toolbar Menu - View Switching', () => {
  // Note: These tests use 'Mobile Chrome' project which has proper mobile emulation
  // The custom viewport tests have positioning issues with fixed elements

  test('menu contains view buttons', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Check that view buttons exist in the DOM
    await expect(page.locator('.menu-view-btn:has-text("Canvas")')).toBeAttached();
    await expect(page.locator('.menu-view-btn:has-text("Guest List")')).toBeAttached();
  });

  test('active view is highlighted in menu', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Canvas button should be active (default view)
    await expect(page.locator('.menu-view-btn:has-text("Canvas")')).toHaveClass(/active/);
  });
});

test.describe('Mobile Toolbar Menu - Actions', () => {
  test('menu contains action buttons', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Check that action buttons exist in the DOM
    await expect(page.locator('.menu-item:has-text("Add Guest")')).toBeAttached();
    await expect(page.locator('.menu-item:has-text("Add Table")')).toBeAttached();
  });

  test('menu contains import option', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Import should be in the menu
    await expect(page.locator('.menu-item:has-text("Import")')).toBeAttached();
  });
});

test.describe('Mobile Toolbar Menu - Canvas Tools', () => {
  test('relationships toggle is available in menu', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Relationships toggle should exist in the menu
    await expect(page.locator('.menu-item:has-text("Show Relationships")')).toBeAttached();
  });
});

test.describe('Mobile Toolbar Menu - Event Info', () => {
  test('shows event name in menu footer', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Event name should exist in the footer
    await expect(page.locator('.menu-footer .event-name')).toBeAttached();
  });

  test('shows guest count in menu footer', async ({ page }) => {
    await enterAppMobile(page);

    await page.locator('.hamburger-btn').click();
    await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
    await page.waitForTimeout(300);

    // Guest count should exist in the footer
    await expect(page.locator('.menu-footer .guest-count')).toBeAttached();
  });
});
