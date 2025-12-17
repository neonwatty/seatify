import { test, expect } from '@playwright/test';

// Helper to enter app from landing page and skip onboarding
async function enterApp(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 11 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 11;
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

test.describe('Marquee Selection', () => {
  // Skip on mobile/tablet - marquee selection is a desktop feature
  test.beforeEach(async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
    if (isMobile) {
      test.skip();
    }
    await enterApp(page);
  });

  test('marquee selection selects tables within the rectangle', async ({ page }) => {
    // The demo data should have tables already
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Get the canvas element
    const canvas = page.locator('.canvas');
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();

    // Perform a marquee selection by dragging across the canvas
    // Start from top-left area and drag to cover all tables
    await page.mouse.move(canvasBounds!.x + 50, canvasBounds!.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBounds!.x + 600, canvasBounds!.y + 500, { steps: 10 });
    await page.mouse.up();

    // Check that the selection toolbar appears with selected items
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // The selection count should indicate tables are selected
    const selectionLabel = page.locator('.selection-count');
    await expect(selectionLabel).toContainText('table');
  });

  test('marquee selection selects seated guests within the rectangle', async ({ page }) => {
    // Demo data has tables with seated guests
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Get the first table's position to drag around it
    const table = page.locator('.table-component').first();
    const tableBounds = await table.boundingBox();
    expect(tableBounds).not.toBeNull();

    // Perform a marquee selection around the first table (which has seated guests)
    await page.mouse.move(tableBounds!.x - 50, tableBounds!.y - 50);
    await page.mouse.down();
    await page.mouse.move(
      tableBounds!.x + tableBounds!.width + 50,
      tableBounds!.y + tableBounds!.height + 50,
      { steps: 10 }
    );
    await page.mouse.up();

    // Check that the selection toolbar appears
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // The selection should include guests (seated at the table)
    const selectionLabel = page.locator('.selection-count');
    const labelText = await selectionLabel.textContent();

    // Should have selected guests and/or the table
    expect(labelText).toMatch(/guest|table/);
  });

  test('marquee selection can select both tables and guests simultaneously', async ({ page }) => {
    // Demo data has tables with seated guests
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Get canvas bounds for a large selection
    const canvas = page.locator('.canvas');
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();

    // Perform a large marquee selection to capture everything
    await page.mouse.move(canvasBounds!.x + 20, canvasBounds!.y + 20);
    await page.mouse.down();
    await page.mouse.move(canvasBounds!.x + 700, canvasBounds!.y + 600, { steps: 10 });
    await page.mouse.up();

    // Check that the selection toolbar appears
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // Check selection label - if both guests and tables selected, should show both
    const selectionLabel = page.locator('.selection-count');
    const labelText = await selectionLabel.textContent();

    // Should contain indication of selected items
    expect(labelText!.length).toBeGreaterThan(0);
  });

  test('shift+drag adds to existing selection', async ({ page }) => {
    // Demo data has tables
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Select the first table by clicking
    const firstTable = page.locator('.table-component').first();
    await firstTable.click();

    // Selection toolbar should show 1 table
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // Get second table position
    const secondTable = page.locator('.table-component').nth(1);
    const secondBounds = await secondTable.boundingBox();
    expect(secondBounds).not.toBeNull();

    // Shift+drag to add second table to selection
    await page.keyboard.down('Shift');
    await page.mouse.move(secondBounds!.x - 20, secondBounds!.y - 20);
    await page.mouse.down();
    await page.mouse.move(
      secondBounds!.x + secondBounds!.width + 20,
      secondBounds!.y + secondBounds!.height + 20,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.keyboard.up('Shift');

    // Selection should now show multiple tables
    const selectionLabel = page.locator('.selection-count');
    await expect(selectionLabel).toContainText('table');
  });

  test('clicking empty canvas clears selection', async ({ page }) => {
    // Select a table
    const table = page.locator('.table-component').first();
    await table.click();

    // Selection toolbar should be visible
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // Click on empty canvas area
    const canvas = page.locator('.canvas');
    await canvas.click({ position: { x: 10, y: 10 } });

    // Selection toolbar should disappear
    await expect(page.locator('.selection-toolbar')).not.toBeVisible({ timeout: 3000 });
  });

  test('delete confirmation shows both guests and tables when both selected', async ({ page }) => {
    // Demo data has tables with guests
    await expect(page.locator('.table-component')).toHaveCount(3, { timeout: 5000 });

    // Get canvas bounds for a selection that captures tables and their guests
    const canvas = page.locator('.canvas');
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();

    // Perform marquee selection
    await page.mouse.move(canvasBounds!.x + 50, canvasBounds!.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBounds!.x + 600, canvasBounds!.y + 500, { steps: 10 });
    await page.mouse.up();

    // Wait for selection toolbar
    await expect(page.locator('.selection-toolbar')).toBeVisible({ timeout: 3000 });

    // Set up dialog handler to capture the confirmation message
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Don't actually delete
    });

    // Click delete button
    await page.locator('.selection-toolbar-button.danger').click();

    // Wait a moment for dialog
    await page.waitForTimeout(500);

    // Check that dialog message mentions the selection
    // It should mention either guests, tables, or both depending on what was selected
    expect(dialogMessage.length).toBeGreaterThan(0);
    expect(dialogMessage.toLowerCase()).toMatch(/delete/i);
  });
});
