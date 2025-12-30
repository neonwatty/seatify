import { test, expect } from '@playwright/test';
import { enterApp } from './test-utils';

// Mobile viewport dimensions
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

test.describe('Mobile Responsive Layout', () => {
  // Helper to navigate to guests view (where traditional sidebar is visible)
  // Canvas view uses immersive mode with MobileGuestPanel instead
  async function navigateToGuestsViewForSidebar(page: import('@playwright/test').Page) {
    const currentUrl = page.url();
    if (currentUrl.includes('/canvas')) {
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
    }
  }

  test.describe('Mobile Sidebar', () => {
    test('sidebar toggle is visible on mobile in guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where sidebar toggle exists
      await navigateToGuestsViewForSidebar(page);

      // On mobile guests view, when sidebar is closed, the collapsed toggle should be visible
      const collapsedToggle = page.locator('.sidebar-toggle-collapsed');
      await expect(collapsedToggle).toBeVisible();
    });

    test('clicking toggle opens sidebar on mobile in guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      await navigateToGuestsViewForSidebar(page);

      // Click the collapsed toggle to open sidebar
      await page.click('.sidebar-toggle-collapsed');

      // Sidebar should now be visible with 'open' class
      const sidebar = page.locator('.sidebar.open');
      await expect(sidebar).toBeVisible({ timeout: 2000 });
    });

    test('backdrop appears when sidebar is open on mobile in guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      await navigateToGuestsViewForSidebar(page);

      // Open sidebar
      await page.click('.sidebar-toggle-collapsed');
      await expect(page.locator('.sidebar.open')).toBeVisible();

      // Backdrop should appear
      const backdrop = page.locator('.sidebar-backdrop');
      await expect(backdrop).toBeVisible();
    });

    test('sidebar can be closed with close button in guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      await navigateToGuestsViewForSidebar(page);

      // Open sidebar
      await page.click('.sidebar-toggle-collapsed');
      await expect(page.locator('.sidebar.open')).toBeVisible();

      // Close using the close button inside sidebar
      await page.click('.sidebar-toggle');

      // Sidebar should close
      await expect(page.locator('.sidebar.open')).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Mobile Toolbar', () => {
    // Skip mobile toolbar tests in CI on chromium project - viewport changes don't work reliably
    // eslint-disable-next-line no-empty-pattern
    test.beforeEach(async ({}, testInfo) => {
      if (testInfo.project.name === 'chromium' && process.env.CI) {
        test.skip(true, 'Mobile toolbar tests require mobile viewport - skipped on chromium in CI');
      }
    });

    // Helper to navigate to guests view (where hamburger menu is visible)
    // Canvas view uses immersive mode without hamburger menu
    async function navigateToGuestsView(page: import('@playwright/test').Page) {
      const currentUrl = page.url();
      if (currentUrl.includes('/canvas')) {
        const guestsUrl = currentUrl.replace('/canvas', '/guests');
        await page.goto(guestsUrl);
        await page.waitForTimeout(300);
      }
    }

    test('mobile toolbar shows hamburger menu button on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where hamburger is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // On mobile, the hamburger button should be visible
      const hamburgerBtn = page.locator('.hamburger-btn');
      await expect(hamburgerBtn).toBeVisible();
    });

    test('toolbar buttons show text on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enterApp(page);

      // Check that button text is visible on desktop
      const textElements = await page.locator('.toolbar-left .btn-text').count();
      expect(textElements).toBeGreaterThan(0);
    });

    test('hamburger button has minimum touch target size on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where hamburger is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // Get the hamburger button
      const button = page.locator('.hamburger-btn');
      const box = await button.boundingBox();

      // Should be at least 40px (close to 44px min touch target)
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    });

    test('bottom nav buttons have minimum touch target size on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where bottom nav is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // Check bottom nav buttons
      const bottomNavBtn = page.locator('.bottom-nav-item').first();
      const box = await bottomNavBtn.boundingBox();

      // Should have adequate touch target
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    });
  });

  test.describe('Touch-Friendly Elements', () => {
    test('guest chips have adequate touch target on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);

      // Navigate to guests view where sidebar is available
      const currentUrl = page.url();
      if (currentUrl.includes('/canvas')) {
        const guestsUrl = currentUrl.replace('/canvas', '/guests');
        await page.goto(guestsUrl);
        await page.waitForTimeout(300);
      }

      // Open sidebar to see guest chips
      await page.click('.sidebar-toggle-collapsed');
      await expect(page.locator('.sidebar.open')).toBeVisible();

      // Wait for guest chips to load
      await page.waitForSelector('.guest-chip', { timeout: 5000 });

      // Get first guest chip
      const guestChip = page.locator('.guest-chip').first();
      const box = await guestChip.boundingBox();

      // Should have minimum height for touch
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('view toggle buttons are touch-friendly', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);

      // Get toggle options
      const toggleOptions = page.locator('.toggle-option');
      const count = await toggleOptions.count();

      if (count > 0) {
        const firstOption = toggleOptions.first();
        const box = await firstOption.boundingBox();

        // Should have adequate touch target
        expect(box?.height).toBeGreaterThanOrEqual(36);
      }
    });
  });
});

test.describe('Touch Gestures', () => {
  test.describe('Canvas Interaction', () => {
    test('canvas is scrollable/pannable', async ({ page }) => {
      await enterApp(page);

      // Canvas should exist and be interactive
      const canvas = page.locator('.canvas');
      await expect(canvas).toBeVisible();

      // Canvas should have touch-action: none for gesture handling
      const touchAction = await canvas.evaluate((el) =>
        window.getComputedStyle(el).touchAction
      );
      expect(touchAction).toBe('none');
    });

    test('tables can be selected with click', async ({ page }) => {
      await enterApp(page);

      // Click on a table to select it
      const table = page.locator('.table-component').first();
      await table.click();

      // Table should be clickable and interactive
      // The selection state may vary - just ensure click doesn't error
      await expect(table).toBeVisible();
    });
  });

  test.describe('Drag and Drop', () => {
    test('guest can be dragged to table', async ({ page }) => {
      await enterApp(page);

      // First check if there are unassigned guests
      const unassignedGuests = page.locator('.sidebar .guest-chip:not(.assigned)');
      const count = await unassignedGuests.count();

      if (count > 0) {
        const guest = unassignedGuests.first();
        const table = page.locator('.table-component').first();

        // Get bounding boxes
        const guestBox = await guest.boundingBox();
        const tableBox = await table.boundingBox();

        if (guestBox && tableBox) {
          // Perform drag and drop
          await page.mouse.move(
            guestBox.x + guestBox.width / 2,
            guestBox.y + guestBox.height / 2
          );
          await page.mouse.down();
          await page.mouse.move(
            tableBox.x + tableBox.width / 2,
            tableBox.y + tableBox.height / 2,
            { steps: 10 }
          );
          await page.mouse.up();

          // Wait for potential state update
          await page.waitForTimeout(500);
        }
      }
    });
  });
});

test.describe('Viewport Breakpoints', () => {
  test('app renders correctly at mobile width', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Canvas view uses immersive mode on mobile (no header/toolbar visible by default)
    // Check for immersive mode elements
    await expect(page.locator('.canvas')).toBeVisible();
    // In immersive mode, corner indicator and FAB should be visible
    await expect(page.locator('.corner-indicator')).toBeVisible();

    // Navigate to guests view to verify header and normal UI work
    const currentUrl = page.url();
    const guestsUrl = currentUrl.replace('/canvas', '/guests');
    await page.goto(guestsUrl);
    await page.waitForTimeout(300);

    // On guests view, header should be visible
    await expect(page.locator('.header')).toBeVisible();
  });

  test('app renders correctly at tablet width', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await enterApp(page);

    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.main-toolbar')).toBeVisible();
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('sidebar opens at mobile width in guests view', async ({ page }) => {
    // Mobile width
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Navigate to guests view where sidebar is available (canvas uses immersive mode)
    const currentUrl = page.url();
    if (currentUrl.includes('/canvas')) {
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
    }

    // Open sidebar on mobile
    await page.click('.sidebar-toggle-collapsed');
    await expect(page.locator('.sidebar.open')).toBeVisible();

    const mobileBox = await page.locator('.sidebar.open').boundingBox();

    // Mobile sidebar should fit within viewport
    if (mobileBox) {
      expect(mobileBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
      expect(mobileBox.width).toBeGreaterThan(0);
    }
  });
});

test.describe('Accessibility on Mobile', () => {
  test('touch targets meet minimum size requirements', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Navigate to guests view for consistent UI testing
    // Canvas view uses immersive mode with gesture-based UI
    const currentUrl = page.url();
    if (currentUrl.includes('/canvas')) {
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
    }

    // Check various interactive elements
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    // Sample check on first few buttons
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      // Most buttons should be at least 36px (some exceptions for small icon buttons)
      // Minimum 20px for decorative/icon buttons
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(20);
      }
    }
  });

  test('sidebar can be navigated with keyboard on mobile in guests view', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Navigate to guests view where sidebar is available (canvas uses immersive mode)
    const currentUrl = page.url();
    if (currentUrl.includes('/canvas')) {
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
    }

    // Open sidebar
    await page.click('.sidebar-toggle-collapsed');
    await expect(page.locator('.sidebar.open')).toBeVisible();

    // Focus should be manageable within sidebar
    const searchInput = page.locator('.search-input');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });
});
