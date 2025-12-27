import { test, expect } from '@playwright/test';
import { openMobileMenu, closeMobileMenu } from './test-utils';

// Mobile viewport size (iPhone 14 Pro)
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Helper to enter app on mobile
async function enterAppMobile(page: import('@playwright/test').Page) {
  // Set mobile viewport before any navigation
  await page.setViewportSize(MOBILE_VIEWPORT);

  // Set up localStorage via init script (runs before each page load)
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 11 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 11;
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
  }

  // Wait for the mobile toolbar to appear
  await expect(page.locator('.hamburger-btn')).toBeVisible({ timeout: 5000 });
}

// Skip on chromium in CI (mobile tests need mobile viewport)
test.beforeEach(async (_fixtures, testInfo) => {
  if (testInfo.project.name === 'chromium' && process.env.CI) {
    test.skip(true, 'Mobile settings tests require mobile viewport - skipped on chromium in CI');
  }
});

test.describe('Mobile Settings Section - Visibility', () => {
  test('settings section visible in mobile menu', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Settings section should exist (uses .menu-section-label)
    await expect(page.locator('.menu-section-label:has-text("Settings")')).toBeAttached();
  });

  test('version number displayed correctly', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Version should show 0.9.0
    await expect(page.locator('.menu-item:has-text("Version 0.9.0")')).toBeAttached();
  });
});

test.describe('Mobile Settings - Theme Cycling', () => {
  test('theme cycles through modes: system → light → dark → system', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Find theme button and verify initial state (system)
    const themeItem = page.locator('.menu-item:has-text("Theme")');
    await expect(themeItem).toBeAttached();
    await expect(themeItem).toContainText('System');

    // Click to cycle to light mode
    await themeItem.click();
    await page.waitForTimeout(100);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeItem).toContainText('Light');

    // Click to cycle to dark mode
    await themeItem.click();
    await page.waitForTimeout(100);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeItem).toContainText('Dark');

    // Click to cycle back to system
    await themeItem.click();
    await page.waitForTimeout(100);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(themeItem).toContainText('System');
  });

  test('theme persists after menu close and reopen', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    const themeItem = page.locator('.menu-item:has-text("Theme")');

    // Cycle to dark mode (system → light → dark)
    await themeItem.click();
    await themeItem.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Close menu
    await closeMobileMenu(page);

    // Reopen menu
    await openMobileMenu(page);

    // Theme should still be dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.menu-item:has-text("Theme")')).toContainText('Dark');
  });
});

test.describe('Mobile Settings - Tour Integration', () => {
  test('Take a Tour starts onboarding wizard', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Click Take a Tour
    await page.locator('.menu-item:has-text("Take a Tour")').click();

    // Onboarding wizard should appear
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });
});

test.describe('Mobile Settings - Help/Shortcuts', () => {
  test('Keyboard Shortcuts opens help modal', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Click Keyboard Shortcuts
    await page.locator('.menu-item:has-text("Keyboard Shortcuts")').click();

    // Help modal should appear
    await expect(page.locator('.shortcuts-modal')).toBeVisible({ timeout: 3000 });

    // Menu should close
    await expect(page.locator('.mobile-menu-sheet')).not.toBeVisible();
  });
});

test.describe('Mobile Settings - Subscribe', () => {
  test('Subscribe opens email capture modal', async ({ page }) => {
    // Clear any previous email submission
    await page.addInitScript(() => {
      const stored = localStorage.getItem('seating-arrangement-storage');
      const data = stored ? JSON.parse(stored) : { state: {}, version: 11 };
      data.state = data.state || {};
      data.state.hasCompletedOnboarding = true;
      data.state.hasSubmittedEmail = false;
      data.version = 11;
      localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
    });

    await enterAppMobile(page);
    await openMobileMenu(page);

    // Click Subscribe for Updates
    const subscribeItem = page.locator('.menu-item:has-text("Subscribe")');
    if (await subscribeItem.isVisible()) {
      await subscribeItem.click();

      // Email capture modal should appear
      await expect(page.locator('.email-capture-modal')).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Bottom Navigation Routing', () => {
  test('Canvas tab navigates to canvas view', async ({ page }) => {
    await enterAppMobile(page);

    // Click Guests tab first to be on a different view
    await page.locator('.bottom-nav-item:has-text("Guests")').click();
    await page.waitForTimeout(300);

    // Now click Canvas tab
    await page.locator('.bottom-nav-item:has-text("Canvas")').click();
    await page.waitForTimeout(300);

    // Verify URL changed to canvas
    await expect(page).toHaveURL(/\/canvas/);

    // Canvas should be visible
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('Guests tab navigates to guests view', async ({ page }) => {
    await enterAppMobile(page);

    // Should start on canvas (default)
    await expect(page).toHaveURL(/\/canvas/);

    // Click Guests tab
    await page.locator('.bottom-nav-item:has-text("Guests")').click();
    await page.waitForTimeout(300);

    // Verify URL changed to guests
    await expect(page).toHaveURL(/\/guests/);

    // Guest list should be visible
    await expect(page.locator('.guest-management-view')).toBeVisible({ timeout: 5000 });
  });

  test('active tab highlights correctly', async ({ page }) => {
    await enterAppMobile(page);

    // Canvas tab should be active by default
    const canvasTab = page.locator('.bottom-nav-item:has-text("Canvas")');
    const guestsTab = page.locator('.bottom-nav-item:has-text("Guests")');

    await expect(canvasTab).toHaveClass(/active/);
    await expect(guestsTab).not.toHaveClass(/active/);

    // Click Guests tab
    await guestsTab.click();
    await page.waitForTimeout(300);

    // Guests tab should now be active
    await expect(guestsTab).toHaveClass(/active/);
    await expect(canvasTab).not.toHaveClass(/active/);
  });
});

test.describe('Cross-View Consistency', () => {
  test('Canvas Tools section only visible on Canvas view', async ({ page }) => {
    await enterAppMobile(page);

    // On Canvas view - Canvas Tools should be visible
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Canvas Tools")')).toBeAttached();
    await closeMobileMenu(page);

    // Switch to Guests view
    await page.locator('.bottom-nav-item:has-text("Guests")').click();
    await page.waitForTimeout(300);

    // On Guests view - Canvas Tools should NOT be visible
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Canvas Tools")')).not.toBeAttached();
  });

  test('Settings section visible on all views', async ({ page }) => {
    await enterAppMobile(page);

    // Check Canvas view
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Settings")')).toBeAttached();
    await closeMobileMenu(page);

    // Check Guests view
    await page.locator('.bottom-nav-item:has-text("Guests")').click();
    await page.waitForTimeout(300);
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Settings")')).toBeAttached();
  });

  test('Actions section adapts to current view', async ({ page }) => {
    await enterAppMobile(page);

    // Canvas view should have Add Table and Optimize Seating
    await openMobileMenu(page);
    await expect(page.locator('.menu-item:has-text("Add Table")')).toBeAttached();
    await expect(page.locator('.menu-item:has-text("Optimize Seating")')).toBeAttached();
    await closeMobileMenu(page);

    // Guests view should NOT have Add Table
    await page.locator('.bottom-nav-item:has-text("Guests")').click();
    await page.waitForTimeout(300);
    await openMobileMenu(page);
    await expect(page.locator('.menu-item:has-text("Add Table")')).not.toBeAttached();
    // But should still have Add Guest
    await expect(page.locator('.menu-item:has-text("Add Guest")')).toBeAttached();
  });
});
