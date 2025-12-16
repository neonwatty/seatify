import { test, expect } from '@playwright/test';
import { enterApp, isMobileViewport } from './test-utils';

// Grid controls are only visible on desktop (viewport >= 768px)
// These tests should skip on mobile viewports

test.describe('Grid Controls', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);

    // Skip all grid control tests on mobile - grid controls are not visible
    const isMobile = await isMobileViewport(page);
    if (isMobile) {
      test.skip();
      return;
    }

    // Wait for grid controls to be visible (desktop only)
    await expect(page.locator('.grid-controls')).toBeVisible({ timeout: 5000 });
  });

  test.describe('Grid Toggle Button', () => {
    test('grid toggle button shows correct initial active state', async ({ page }) => {
      // Default state: showGrid: true
      const gridToggle = page.locator('button[aria-label="Hide grid"]');
      await expect(gridToggle).toBeVisible();
      await expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
      await expect(gridToggle).toHaveClass(/active/);
    });

    test('canvas has show-grid class when grid is visible', async ({ page }) => {
      const canvas = page.locator('.canvas');
      await expect(canvas).toHaveClass(/show-grid/);
    });

    test('clicking grid toggle hides the grid', async ({ page }) => {
      // Click to hide grid
      await page.locator('button[aria-label="Hide grid"]').click();

      // Button state should change
      const showGridBtn = page.locator('button[aria-label="Show grid"]');
      await expect(showGridBtn).toBeVisible();
      await expect(showGridBtn).toHaveAttribute('aria-pressed', 'false');
      await expect(showGridBtn).not.toHaveClass(/active/);

      // Canvas should NOT have show-grid class
      const canvas = page.locator('.canvas');
      await expect(canvas).not.toHaveClass(/show-grid/);
    });

    test('clicking grid toggle twice restores the grid', async ({ page }) => {
      // Hide then show
      await page.locator('button[aria-label="Hide grid"]').click();
      await page.locator('button[aria-label="Show grid"]').click();

      // Grid should be visible again
      const canvas = page.locator('.canvas');
      await expect(canvas).toHaveClass(/show-grid/);

      // Button should show "Hide grid" again
      await expect(page.locator('button[aria-label="Hide grid"]')).toBeVisible();
    });

    test('grid toggle has correct tooltip', async ({ page }) => {
      // When grid is visible, tooltip should say "Hide Grid"
      const hideGridBtn = page.locator('button[aria-label="Hide grid"]');
      await expect(hideGridBtn).toHaveAttribute('data-tooltip', 'Hide Grid');

      // After clicking, tooltip should change
      await hideGridBtn.click();
      const showGridBtn = page.locator('button[aria-label="Show grid"]');
      await expect(showGridBtn).toHaveAttribute('data-tooltip', 'Show Grid');
    });
  });

  test.describe('Snap to Grid Toggle', () => {
    test('snap to grid button shows correct initial active state', async ({ page }) => {
      // Default state: snapToGrid: true
      const snapBtn = page.locator('button[aria-label="Disable snap to grid"]');
      await expect(snapBtn).toBeVisible();
      await expect(snapBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(snapBtn).toHaveClass(/active/);
    });

    test('clicking snap toggle disables snap to grid', async ({ page }) => {
      await page.locator('button[aria-label="Disable snap to grid"]').click();

      // Button state should change
      const enableBtn = page.locator('button[aria-label="Enable snap to grid"]');
      await expect(enableBtn).toBeVisible();
      await expect(enableBtn).toHaveAttribute('aria-pressed', 'false');
      await expect(enableBtn).not.toHaveClass(/active/);
    });

    test('clicking snap toggle twice re-enables snap to grid', async ({ page }) => {
      await page.locator('button[aria-label="Disable snap to grid"]').click();
      await page.locator('button[aria-label="Enable snap to grid"]').click();

      // Should be back to disabled state label
      await expect(page.locator('button[aria-label="Disable snap to grid"]')).toBeVisible();
    });

    test('snap toggle has correct tooltip', async ({ page }) => {
      // When enabled, tooltip should say "Snap: On"
      const snapBtn = page.locator('button[aria-label="Disable snap to grid"]');
      await expect(snapBtn).toHaveAttribute('data-tooltip', 'Snap: On');

      // After clicking, tooltip should change
      await snapBtn.click();
      const enableBtn = page.locator('button[aria-label="Enable snap to grid"]');
      await expect(enableBtn).toHaveAttribute('data-tooltip', 'Snap: Off');
    });

    test('snap to grid works independently of grid visibility', async ({ page }) => {
      // Hide the grid but keep snap enabled
      await page.locator('button[aria-label="Hide grid"]').click();

      // Snap should still be enabled
      const snapBtn = page.locator('button[aria-label="Disable snap to grid"]');
      await expect(snapBtn).toBeVisible();
      await expect(snapBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Alignment Guides Toggle', () => {
    test('alignment guides button shows correct initial active state', async ({ page }) => {
      // Default state: showAlignmentGuides: true
      const guidesBtn = page.locator('button[aria-label="Disable alignment guides"]');
      await expect(guidesBtn).toBeVisible();
      await expect(guidesBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(guidesBtn).toHaveClass(/active/);
    });

    test('clicking alignment guides toggle disables guides', async ({ page }) => {
      await page.locator('button[aria-label="Disable alignment guides"]').click();

      // Button state should change
      const enableBtn = page.locator('button[aria-label="Enable alignment guides"]');
      await expect(enableBtn).toBeVisible();
      await expect(enableBtn).toHaveAttribute('aria-pressed', 'false');
      await expect(enableBtn).not.toHaveClass(/active/);
    });

    test('clicking alignment guides toggle twice re-enables guides', async ({ page }) => {
      await page.locator('button[aria-label="Disable alignment guides"]').click();
      await page.locator('button[aria-label="Enable alignment guides"]').click();

      // Should be back to disabled state label
      await expect(page.locator('button[aria-label="Disable alignment guides"]')).toBeVisible();
    });

    test('alignment guides toggle has correct tooltip', async ({ page }) => {
      // When enabled, tooltip should say "Guides: On"
      const guidesBtn = page.locator('button[aria-label="Disable alignment guides"]');
      await expect(guidesBtn).toHaveAttribute('data-tooltip', 'Guides: On');

      // After clicking, tooltip should change
      await guidesBtn.click();
      const enableBtn = page.locator('button[aria-label="Enable alignment guides"]');
      await expect(enableBtn).toHaveAttribute('data-tooltip', 'Guides: Off');
    });
  });

  test.describe('Grid Size Dropdown', () => {
    test('grid size button shows default value of 40', async ({ page }) => {
      const gridSizeBtn = page.locator('.grid-size-btn');
      await expect(gridSizeBtn).toBeVisible();
      await expect(gridSizeBtn.locator('.grid-size-value')).toHaveText('40');
      await expect(gridSizeBtn).toHaveAttribute('aria-label', 'Grid size: 40px');
    });

    test('clicking grid size button opens dropdown menu', async ({ page }) => {
      const gridSizeBtn = page.locator('.grid-size-btn');
      await gridSizeBtn.click();

      // Dropdown menu should be visible
      const menu = page.locator('.grid-size-menu');
      await expect(menu).toBeVisible();
      await expect(gridSizeBtn).toHaveAttribute('aria-expanded', 'true');

      // Should have 3 options: 20, 40, 80
      await expect(menu.locator('.grid-size-option')).toHaveCount(3);
    });

    test('dropdown shows all grid size options', async ({ page }) => {
      await page.locator('.grid-size-btn').click();

      const menu = page.locator('.grid-size-menu');
      await expect(menu.locator('.grid-size-option:has-text("20px")')).toBeVisible();
      await expect(menu.locator('.grid-size-option:has-text("40px")')).toBeVisible();
      await expect(menu.locator('.grid-size-option:has-text("80px")')).toBeVisible();
    });

    test('current grid size option is marked as selected', async ({ page }) => {
      await page.locator('.grid-size-btn').click();

      const selectedOption = page.locator('.grid-size-option.selected');
      await expect(selectedOption).toHaveText('40px');
      await expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    test('selecting 20px updates the grid size', async ({ page }) => {
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("20px")').click();

      // Dropdown should close
      await expect(page.locator('.grid-size-menu')).not.toBeVisible();

      // Value should be updated
      await expect(page.locator('.grid-size-value')).toHaveText('20');
      await expect(page.locator('.grid-size-btn')).toHaveAttribute('aria-label', 'Grid size: 20px');
    });

    test('selecting 80px updates the grid size', async ({ page }) => {
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("80px")').click();

      // Value should be updated
      await expect(page.locator('.grid-size-value')).toHaveText('80');
      await expect(page.locator('.grid-size-btn')).toHaveAttribute('aria-label', 'Grid size: 80px');
    });

    test('can cycle through all grid size options', async ({ page }) => {
      // Select 20px
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("20px")').click();
      await expect(page.locator('.grid-size-value')).toHaveText('20');

      // Select 80px
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("80px")').click();
      await expect(page.locator('.grid-size-value')).toHaveText('80');

      // Select 40px (back to default)
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("40px")').click();
      await expect(page.locator('.grid-size-value')).toHaveText('40');
    });

    test('grid size dropdown closes when clicking outside', async ({ page }) => {
      await page.locator('.grid-size-btn').click();
      await expect(page.locator('.grid-size-menu')).toBeVisible();

      // Click on canvas to close
      await page.locator('.canvas').click({ position: { x: 200, y: 300 } });

      await expect(page.locator('.grid-size-menu')).not.toBeVisible();
    });

    test('grid size button has correct tooltip', async ({ page }) => {
      const gridSizeBtn = page.locator('.grid-size-btn');
      await expect(gridSizeBtn).toHaveAttribute('data-tooltip', 'Grid Size');
    });
  });

  test.describe('State Persistence', () => {
    test('grid control settings reset to defaults on page reload', async ({ page }) => {
      // Change all settings
      await page.locator('button[aria-label="Hide grid"]').click();
      await page.locator('button[aria-label="Disable snap to grid"]').click();
      await page.locator('button[aria-label="Disable alignment guides"]').click();
      await page.locator('.grid-size-btn').click();
      await page.locator('.grid-size-option:has-text("20px")').click();

      // Verify changes took effect
      await expect(page.locator('.canvas')).not.toHaveClass(/show-grid/);
      await expect(page.locator('.grid-size-value')).toHaveText('20');

      // Reload page
      await page.reload();
      await page.click('button:has-text("Start Planning")');
      await expect(page.locator('.grid-controls')).toBeVisible({ timeout: 5000 });

      // All controls should be back to defaults
      await expect(page.locator('.canvas')).toHaveClass(/show-grid/);
      await expect(page.locator('button[aria-label="Hide grid"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Disable snap to grid"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Disable alignment guides"]')).toBeVisible();
      await expect(page.locator('.grid-size-value')).toHaveText('40');
    });
  });

  test.describe('Mobile Responsive Behavior', () => {
    test('grid controls are visible at 768px viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 800 });

      // Controls should still be visible
      await expect(page.locator('.grid-controls')).toBeVisible();

      // Label should be hidden at this breakpoint
      await expect(page.locator('.grid-controls-label')).not.toBeVisible();
    });

    test('grid controls are hidden at 480px viewport', async ({ page }) => {
      await page.setViewportSize({ width: 480, height: 800 });

      // Entire grid controls should be hidden
      await expect(page.locator('.grid-controls')).not.toBeVisible();
    });
  });
});
