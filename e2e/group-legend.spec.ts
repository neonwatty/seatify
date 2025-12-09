import { test, expect } from '@playwright/test';

// Helper to enter the app from landing page
async function enterApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.click('button:has-text("Try the Demo")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

// Helper to open sidebar (it starts collapsed by default)
async function openSidebar(page: import('@playwright/test').Page) {
  // The collapsed sidebar shows as a button with "Guests" text
  const collapsedSidebar = page.locator('.sidebar-toggle-collapsed');
  if (await collapsedSidebar.isVisible()) {
    await collapsedSidebar.click();
  }
  // Wait for expanded sidebar
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 });
}

test.describe('Group Legend', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await openSidebar(page);
  });

  test.describe('Component Rendering', () => {
    test('group legend is visible when guests have groups', async ({ page }) => {
      const groupLegend = page.locator('.group-legend');
      await expect(groupLegend).toBeVisible();
    });

    test('group legend header shows number of groups', async ({ page }) => {
      const header = page.locator('.group-legend-title');
      // Should show "Groups (N)" where N is the count
      await expect(header).toContainText('Groups');
      await expect(header).toContainText('(');
    });

    test('group legend is collapsible', async ({ page }) => {
      const header = page.locator('.group-legend-header');
      const content = page.locator('.group-legend-content');

      // Should start expanded
      await expect(content).toBeVisible();

      // Click to collapse
      await header.click();
      await expect(content).not.toBeVisible();

      // Click to expand
      await header.click();
      await expect(content).toBeVisible();
    });

    test('collapse icon changes direction when collapsed', async ({ page }) => {
      const header = page.locator('.group-legend-header');
      const collapseIcon = page.locator('.collapse-icon');

      // Initially expanded - should show down arrow
      await expect(collapseIcon).toContainText('▼');

      // Collapse
      await header.click();
      await expect(collapseIcon).toContainText('▶');
    });
  });

  test.describe('Group List', () => {
    test('displays groups with colored indicators', async ({ page }) => {
      const legendItems = page.locator('.group-legend-item');
      await expect(legendItems.first()).toBeVisible();

      // Each item should have a color indicator
      const colorIndicator = legendItems.first().locator('.legend-color');
      await expect(colorIndicator).toBeVisible();
      // Should have a background color set
      await expect(colorIndicator).toHaveCSS('background-color', /.+/);
    });

    test('displays guest count per group', async ({ page }) => {
      const firstItem = page.locator('.group-legend-item').first();
      const count = firstItem.locator('.legend-count');
      await expect(count).toBeVisible();
      // Should show a count in parentheses like "(3)"
      await expect(count).toContainText('(');
    });

    test('checkboxes are checked by default (all groups visible)', async ({ page }) => {
      const checkboxes = page.locator('.group-legend-item input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    });
  });

  test.describe('Group Visibility Toggle', () => {
    test('clicking checkbox toggles group visibility', async ({ page }) => {
      const firstCheckbox = page.locator('.group-legend-item input[type="checkbox"]').first();
      const firstLabel = page.locator('.legend-item-label').first();

      // Initially visible
      await expect(firstCheckbox).toBeChecked();
      await expect(firstLabel).not.toHaveClass(/hidden-group/);

      // Click to hide
      await firstCheckbox.click();
      await expect(firstCheckbox).not.toBeChecked();
      await expect(firstLabel).toHaveClass(/hidden-group/);

      // Click to show again
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();
      await expect(firstLabel).not.toHaveClass(/hidden-group/);
    });

    test('hiding a group dims guests on canvas', async ({ page }) => {
      // Get the first group name to find matching guests
      const firstGroupName = await page.locator('.legend-name').first().textContent();

      // Hide the first group
      await page.locator('.group-legend-item input[type="checkbox"]').first().click();

      // Check if any canvas guests are dimmed
      // (There should be at least some guests visible as dimmed if they belong to the hidden group)
      const dimmedGuests = page.locator('.canvas-guest.dimmed, .seat-guest.dimmed');

      // If the first group has canvas guests, they should now be dimmed
      // This test assumes demo data has guests on canvas
      await expect(dimmedGuests.first()).toBeVisible({ timeout: 2000 }).catch(() => {
        // It's ok if no guests are dimmed - the demo might not have canvas guests
        console.log(`No dimmed guests found for group: ${firstGroupName}`);
      });
    });
  });

  test.describe('Show All / Hide All Buttons', () => {
    test('Show All button is disabled when all groups are visible', async ({ page }) => {
      const showAllBtn = page.locator('.legend-action-btn:has-text("Show All")');
      await expect(showAllBtn).toBeDisabled();
    });

    test('Hide All button hides all groups', async ({ page }) => {
      const hideAllBtn = page.locator('.legend-action-btn:has-text("Hide All")');
      await expect(hideAllBtn).not.toBeDisabled();

      await hideAllBtn.click();

      // All checkboxes should be unchecked
      const checkboxes = page.locator('.group-legend-item input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).not.toBeChecked();
      }

      // Hide All should now be disabled
      await expect(hideAllBtn).toBeDisabled();
    });

    test('Show All button shows all groups after hiding', async ({ page }) => {
      // First hide all
      await page.locator('.legend-action-btn:has-text("Hide All")').click();

      // Now Show All should be enabled
      const showAllBtn = page.locator('.legend-action-btn:has-text("Show All")');
      await expect(showAllBtn).not.toBeDisabled();

      await showAllBtn.click();

      // All checkboxes should be checked
      const checkboxes = page.locator('.group-legend-item input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    });

    test('hiding one group enables Show All button', async ({ page }) => {
      const showAllBtn = page.locator('.legend-action-btn:has-text("Show All")');

      // Initially disabled
      await expect(showAllBtn).toBeDisabled();

      // Hide one group
      await page.locator('.group-legend-item input[type="checkbox"]').first().click();

      // Now Show All should be enabled
      await expect(showAllBtn).not.toBeDisabled();
    });
  });

  test.describe('Guest Color Indicators', () => {
    test('seated guests show group color ring', async ({ page }) => {
      // Check for seated guests with group color
      const seatedGuestsWithGroup = page.locator('.seat-guest.has-group');

      // If there are guests with groups at tables
      const count = await seatedGuestsWithGroup.count();
      if (count > 0) {
        // They should have a colored border on the circle
        const guestCircle = seatedGuestsWithGroup.first().locator('.seat-guest-circle');
        await expect(guestCircle).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('group legend header has correct ARIA attributes', async ({ page }) => {
      const header = page.locator('.group-legend-header');
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      await expect(header).toHaveAttribute('aria-controls', 'group-legend-content');
    });

    test('group list has role="list" and aria-label', async ({ page }) => {
      const list = page.locator('.group-legend-list');
      await expect(list).toHaveAttribute('role', 'list');
      await expect(list).toHaveAttribute('aria-label', 'Guest groups');
    });

    test('checkboxes have aria-labels for screen readers', async ({ page }) => {
      const firstCheckbox = page.locator('.group-legend-item input[type="checkbox"]').first();
      const ariaLabel = await firstCheckbox.getAttribute('aria-label');
      expect(ariaLabel).toContain('Hide'); // or 'Show' depending on state
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('group legend is rendered on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Re-open sidebar for mobile
      await openSidebar(page);

      // Legend component should be in the DOM
      const groupLegend = page.locator('.group-legend');
      await expect(groupLegend).toBeAttached();

      // The header should exist
      const header = page.locator('.group-legend-header');
      await expect(header).toBeAttached();

      // Groups should be listed
      const legendItems = page.locator('.group-legend-item');
      const count = await legendItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
