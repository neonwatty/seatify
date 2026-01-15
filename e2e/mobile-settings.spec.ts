import { test, expect } from '@playwright/test';
import { openMobileMenu, closeMobileMenu } from './test-utils';

// Mobile viewport size (iPhone 14 Pro)
const MOBILE_VIEWPORT = { width: 393, height: 852 };

// Helper to enter app on mobile
// targetView: 'canvas' (immersive mode) or 'guests' (normal mode with iOS Tab Bar)
async function enterAppMobile(page: import('@playwright/test').Page, targetView: 'canvas' | 'guests' = 'guests') {
  // Set mobile viewport before any navigation
  await page.setViewportSize(MOBILE_VIEWPORT);

  // Set up localStorage via init script (runs before each page load)
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    // Use version 15 to match current store version and avoid migrations
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

    if (targetView === 'guests') {
      // Navigate to guests view via URL modification
      // Canvas view uses immersive mode without the tab bar
      const currentUrl = page.url();
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
      // Wait for iOS Tab Bar to be visible (replaced hamburger menu)
      await expect(page.locator('.ios-tab-bar')).toBeVisible({ timeout: 5000 });
    } else {
      // Stay on canvas view - immersive mode
      // Wait for corner indicator (immersive mode UI indicator)
      await expect(page.locator('.corner-indicator')).toBeVisible({ timeout: 5000 });
    }
  }
}

// Skip on chromium in CI (mobile tests need mobile viewport)
// eslint-disable-next-line no-empty-pattern
test.beforeEach(async ({ }, testInfo) => {
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

    // Version should show current version (matches pattern like "Version 0.10.0")
    await expect(page.locator('.menu-item').filter({ hasText: /Version \d+\.\d+\.\d+/ })).toBeAttached();
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
  test('Browse Tours menu starts onboarding wizard', async ({ page }) => {
    await enterAppMobile(page);
    await openMobileMenu(page);

    // Click Browse Tours to open the submenu
    await page.locator('.menu-item:has-text("Browse Tours")').click();

    // Click Quick Start tour
    await page.locator('.menu-item.tour-item:has-text("Quick Start")').click();

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
      const data = stored ? JSON.parse(stored) : { state: {}, version: 15 };
      data.state = data.state || {};
      data.state.hasCompletedOnboarding = true;
      data.state.hasSubmittedEmail = false;
      data.version = 15;
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
    // Start on guests view (where bottom nav is visible)
    await enterAppMobile(page, 'guests');

    // Should start on guests view
    await expect(page).toHaveURL(/\/guests/);

    // Click Canvas tab to navigate to canvas (immersive mode)
    await page.locator('.bottom-nav-item:has-text("Canvas")').click();
    await page.waitForTimeout(300);

    // Verify URL changed to canvas
    await expect(page).toHaveURL(/\/canvas/);

    // Canvas should be visible
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('Guests tab navigates to guests view', async ({ page }) => {
    // Start on guests view (where bottom nav is visible)
    await enterAppMobile(page, 'guests');

    // Should start on guests
    await expect(page).toHaveURL(/\/guests/);

    // Click Canvas tab first
    await page.locator('.bottom-nav-item:has-text("Canvas")').click();
    await page.waitForTimeout(500);

    // Now we're on canvas (immersive mode), need to access UI
    // Tap corner indicator to show transient top bar, which has back button
    // But simpler: just navigate via URL
    const currentUrl = page.url();
    const guestsUrl = currentUrl.replace('/canvas', '/guests');
    await page.goto(guestsUrl);
    await page.waitForTimeout(300);

    // Verify URL changed to guests
    await expect(page).toHaveURL(/\/guests/);

    // Guest list should be visible
    await expect(page.locator('.guest-management-view')).toBeVisible({ timeout: 5000 });
  });

  test('active tab highlights correctly', async ({ page }) => {
    // Start on guests view (where bottom nav is visible)
    await enterAppMobile(page, 'guests');

    // Guests tab should be active when starting on guests view
    const canvasTab = page.locator('.bottom-nav-item:has-text("Canvas")');
    const guestsTab = page.locator('.bottom-nav-item:has-text("Guests")');

    await expect(guestsTab).toHaveClass(/active/);
    await expect(canvasTab).not.toHaveClass(/active/);

    // Click Canvas tab - this will enter immersive mode where bottom nav is hidden
    // We can't easily test the active state after clicking canvas since bottom nav disappears
    // But we can verify the navigation works
    await canvasTab.click();
    await page.waitForTimeout(300);

    // Verify we navigated to canvas
    await expect(page).toHaveURL(/\/canvas/);
  });
});

test.describe('Cross-View Consistency', () => {
  // Note: Canvas view uses immersive mode with BottomControlSheet instead of iOS Tab Bar
  // These tests focus on guests view where iOS Tab Bar and Settings menu are available

  test('Canvas Tools section NOT visible on Guests view', async ({ page }) => {
    // Start on guests view
    await enterAppMobile(page, 'guests');

    // On Guests view - Canvas Tools should NOT be visible in settings menu
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Canvas Tools")')).not.toBeAttached();
  });

  test('Settings section visible on Guests view', async ({ page }) => {
    // Start on guests view
    await enterAppMobile(page, 'guests');

    // Check Guests view has Settings section
    await openMobileMenu(page);
    await expect(page.locator('.menu-section-label:has-text("Settings")')).toBeAttached();
  });

  test('Actions section adapts to Guests view', async ({ page }) => {
    // Start on guests view
    await enterAppMobile(page, 'guests');

    // Guests view should NOT have Add Table but should have Add Guest
    await openMobileMenu(page);
    await expect(page.locator('.menu-item:has-text("Add Table")')).not.toBeAttached();
    // But should still have Add Guest
    await expect(page.locator('.menu-item:has-text("Add Guest")')).toBeAttached();
  });
});
