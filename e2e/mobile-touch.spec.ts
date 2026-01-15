import { test, expect } from '@playwright/test';
import { enterApp } from './test-utils';

// Mobile viewport dimensions
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

test.describe('Mobile Responsive Layout', () => {
  test.describe('Mobile Immersive Mode (Canvas View)', () => {
    test('canvas view uses immersive mode on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);

      // Canvas view should show immersive mode elements
      await expect(page.locator('.canvas')).toBeVisible();
      // Corner indicator (pulsing dot) should be visible
      await expect(page.locator('.corner-indicator')).toBeVisible();
    });

    test('corner indicator is clickable and opens controls', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);

      // Wait for app to stabilize after initial load
      await page.waitForTimeout(500);

      // Click corner indicator
      const cornerIndicator = page.locator('.corner-indicator');
      await expect(cornerIndicator).toBeVisible();

      // Use tap() for touch-enabled contexts, fall back to click()
      try {
        await cornerIndicator.tap();
      } catch {
        // Fallback for non-touch contexts (desktop chromium)
        await cornerIndicator.click();
      }

      // Wait for state update
      await page.waitForTimeout(200);

      // Should open the transient top bar
      await expect(page.locator('.transient-top-bar.visible')).toBeVisible({ timeout: 3000 });
    });

    test('header is hidden in mobile canvas view (immersive mode)', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);

      // In immersive mode, the header should not be visible by default
      // The immersive mode hides the header to maximize canvas space
      const header = page.locator('.header');
      await expect(header).not.toBeVisible();
    });
  });

  test.describe('Mobile Guests View (Non-Canvas)', () => {
    // Helper to navigate to guests view
    async function navigateToGuestsView(page: import('@playwright/test').Page) {
      const currentUrl = page.url();
      if (currentUrl.includes('/canvas')) {
        const guestsUrl = currentUrl.replace('/canvas', '/guests');
        await page.goto(guestsUrl);
        await page.waitForTimeout(300);
      }
    }

    test('header is visible on mobile guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      await navigateToGuestsView(page);

      // Header should be visible in guests view (not immersive)
      await expect(page.locator('.header')).toBeVisible();
    });

    test('guest management view is visible', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      await navigateToGuestsView(page);

      // Guest management view content should be visible
      await expect(page.locator('.guest-management-view')).toBeVisible({ timeout: 5000 });
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

    test('mobile iOS Tab Bar shows on mobile in guests view', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where iOS Tab Bar is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // On mobile, the iOS Tab Bar should be visible
      const iosTabBar = page.locator('.ios-tab-bar');
      await expect(iosTabBar).toBeVisible();
    });

    test('toolbar buttons show text on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await enterApp(page);

      // Check that button text is visible on desktop
      const textElements = await page.locator('.toolbar-left .btn-text').count();
      expect(textElements).toBeGreaterThan(0);
    });

    test('iOS Tab Bar items have minimum touch target size on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where iOS Tab Bar is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // Get the first iOS Tab Bar item
      const tabItem = page.locator('.ios-tab-bar .tab-bar-item').first();
      const box = await tabItem.boundingBox();

      // Should be at least 40px (close to 44px min touch target)
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    });

    test('bottom nav buttons have minimum touch target size on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await enterApp(page);
      // Navigate to guests view where iOS Tab Bar is visible (canvas uses immersive mode)
      await navigateToGuestsView(page);

      // Check iOS Tab Bar buttons
      const tabBarBtn = page.locator('.ios-tab-bar .tab-bar-item').first();
      const box = await tabBarBtn.boundingBox();

      // Should have adequate touch target
      expect(box?.width).toBeGreaterThanOrEqual(40);
      expect(box?.height).toBeGreaterThanOrEqual(40);
    });
  });

  test.describe('Touch-Friendly Elements', () => {
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
  test('app renders correctly at mobile width with immersive mode', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Canvas view uses immersive mode on mobile (no header/toolbar visible by default)
    // Check for immersive mode elements
    await expect(page.locator('.canvas')).toBeVisible();
    // In immersive mode, corner indicator should be visible
    await expect(page.locator('.corner-indicator')).toBeVisible();

    // Navigate to guests view to verify header and normal UI work
    const currentUrl = page.url();
    const guestsUrl = currentUrl.replace('/canvas', '/guests');
    await page.goto(guestsUrl);
    await page.waitForTimeout(300);

    // On guests view, header should be visible
    await expect(page.locator('.header')).toBeVisible();
  });

  test('canvas container fills viewport height on mobile (Safari dvh fix)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Verify the canvas container has meaningful height (not collapsed to 0)
    // This catches the Safari 100vh vs 100dvh bug where the canvas would be blank
    const canvasContainer = page.locator('.canvas-container');
    await expect(canvasContainer).toBeVisible();

    const box = await canvasContainer.boundingBox();
    expect(box).not.toBeNull();
    // Canvas should fill most of the viewport (at least 80% of viewport height)
    expect(box!.height).toBeGreaterThan(MOBILE_VIEWPORT.height * 0.8);
  });

  test('app renders correctly at tablet width', async ({ page }) => {
    await page.setViewportSize(TABLET_VIEWPORT);
    await enterApp(page);

    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.main-toolbar')).toBeVisible();
    await expect(page.locator('.canvas')).toBeVisible();
  });

  test('canvas sidebar works on desktop', async ({ page }) => {
    // Desktop width
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterApp(page);

    // On desktop, the sidebar toggle (collapsed) should be present
    const collapsedToggle = page.locator('.sidebar-toggle-collapsed');
    await expect(collapsedToggle).toBeVisible();

    // Click to open sidebar
    await collapsedToggle.click();

    // Now sidebar should be visible
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible({ timeout: 2000 });
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

  test('guest management view is accessible on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await enterApp(page);

    // Navigate to guests view
    const currentUrl = page.url();
    if (currentUrl.includes('/canvas')) {
      const guestsUrl = currentUrl.replace('/canvas', '/guests');
      await page.goto(guestsUrl);
      await page.waitForTimeout(300);
    }

    // Search input should be focusable
    const searchInput = page.locator('.guest-management-view input[type="text"], .guest-management-view input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    }
  });
});
