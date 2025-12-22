import { test, expect } from '@playwright/test';
import { enterApp, isMobileViewport, openMobileMenu } from './test-utils';

/**
 * Helper to switch to dashboard view
 */
async function switchToDashboard(page: import('@playwright/test').Page) {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    await openMobileMenu(page);
    await page.locator('.menu-view-btn:has-text("Dashboard")').click();
  } else {
    await page.click('.toggle-option:has-text("Dashboard")');
  }
  await page.waitForTimeout(300);
}

// =============================================================================
// QR Code Modal Tests
// =============================================================================

test.describe('QR Code Modal', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await page.waitForTimeout(500);
  });

  test('QR Code button is visible in table properties panel', async ({ page }) => {
    // Click on a table to select it
    const table = page.locator('.table-component').first();
    await table.click();

    // Wait for properties panel to appear
    await expect(page.locator('.table-properties-panel')).toBeVisible();

    // Check for QR Code button
    const qrButton = page.locator('.quick-action-btn', { hasText: 'QR Code' });
    await expect(qrButton).toBeVisible();
  });

  test('clicking QR Code button opens the modal', async ({ page }) => {
    // Select a table
    const table = page.locator('.table-component').first();
    await table.click();
    await expect(page.locator('.table-properties-panel')).toBeVisible();

    // Click QR Code button
    const qrButton = page.locator('.quick-action-btn', { hasText: 'QR Code' });
    await qrButton.click();

    // Modal should appear
    await expect(page.locator('.qr-modal')).toBeVisible();
    await expect(page.locator('.qr-modal-header h2')).toContainText('QR Code for');
  });

  test('QR modal displays QR code image', async ({ page }) => {
    // Select a table
    const table = page.locator('.table-component').first();
    await table.click();

    // Open QR modal
    const qrButton = page.locator('.quick-action-btn', { hasText: 'QR Code' });
    await qrButton.click();

    // Check for QR code SVG
    await expect(page.locator('.qr-code-container svg')).toBeVisible();
  });

  test('QR modal shows table info', async ({ page }) => {
    // Select a table
    const table = page.locator('.table-component').first();
    await table.click();

    // Open QR modal
    await page.locator('.quick-action-btn', { hasText: 'QR Code' }).click();

    // Check for table info
    await expect(page.locator('.qr-table-name')).toBeVisible();
    await expect(page.locator('.qr-table-meta')).toBeVisible();
  });

  test('QR modal has action buttons', async ({ page }) => {
    // Select a table
    const table = page.locator('.table-component').first();
    await table.click();

    // Open QR modal
    await page.locator('.quick-action-btn', { hasText: 'QR Code' }).click();

    // Check for action buttons
    await expect(page.locator('.qr-action-btn', { hasText: 'Download PNG' })).toBeVisible();
    await expect(page.locator('.qr-action-btn', { hasText: 'Copy URL' })).toBeVisible();
    await expect(page.locator('.qr-action-btn', { hasText: 'Print' })).toBeVisible();
  });

  test('QR modal can be closed with X button', async ({ page }) => {
    // Select a table and open modal
    const table = page.locator('.table-component').first();
    await table.click();
    await page.locator('.quick-action-btn', { hasText: 'QR Code' }).click();
    await expect(page.locator('.qr-modal')).toBeVisible();

    // Close with X button
    await page.locator('.qr-modal-header .close-btn').click();
    await expect(page.locator('.qr-modal')).not.toBeVisible();
  });

  test('QR modal can be closed by clicking overlay', async ({ page }) => {
    // Select a table and open modal
    const table = page.locator('.table-component').first();
    await table.click();
    await page.locator('.quick-action-btn', { hasText: 'QR Code' }).click();
    await expect(page.locator('.qr-modal')).toBeVisible();

    // Click on the overlay (not the modal itself)
    await page.locator('.qr-modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.qr-modal')).not.toBeVisible();
  });
});

// =============================================================================
// QR Code Context Menu Tests
// =============================================================================

test.describe('QR Code Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await page.waitForTimeout(500);
  });

  test('context menu on table shows Generate QR Code option', async ({ page }) => {
    // Right-click on a table
    const table = page.locator('.table-component').first();
    await table.click({ button: 'right' });

    // Check for QR Code option in context menu
    await expect(page.locator('.context-menu')).toBeVisible();
    await expect(page.locator('.context-menu-item', { hasText: 'Generate QR Code' })).toBeVisible();
  });

  test('clicking Generate QR Code from context menu opens modal', async ({ page }) => {
    // Right-click on a table
    const table = page.locator('.table-component').first();
    await table.click({ button: 'right' });

    // Click Generate QR Code
    await page.locator('.context-menu-item', { hasText: 'Generate QR Code' }).click();

    // Modal should appear
    await expect(page.locator('.qr-modal')).toBeVisible();
  });
});

// =============================================================================
// QR Code Print View Tests
// =============================================================================

test.describe('QR Code Print View', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
    await page.waitForTimeout(500);
  });

  test('Print QR Codes button is visible in dashboard tables section', async ({ page }) => {
    // Check for the Print QR Codes button
    const printBtn = page.locator('.qr-print-btn');
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toContainText('Print QR Codes');
  });

  test('clicking Print QR Codes opens the print view', async ({ page }) => {
    // Click Print QR Codes button
    await page.locator('.qr-print-btn').click();

    // Print view should appear
    await expect(page.locator('.qr-print-view')).toBeVisible();
    await expect(page.locator('.qr-print-header h2')).toContainText('Print All QR Codes');
  });

  test('print view shows all tables', async ({ page }) => {
    // Open print view
    await page.locator('.qr-print-btn').click();
    await expect(page.locator('.qr-print-view')).toBeVisible();

    // Check that QR cards are displayed
    const qrCards = page.locator('.qr-card');
    await expect(qrCards.first()).toBeVisible();

    // Each card should have a QR code and table name
    await expect(page.locator('.qr-card .qr-code-wrapper svg').first()).toBeVisible();
    await expect(page.locator('.qr-card .table-name').first()).toBeVisible();
  });

  test('print view can be closed with Cancel button', async ({ page }) => {
    // Open print view
    await page.locator('.qr-print-btn').click();
    await expect(page.locator('.qr-print-view')).toBeVisible();

    // Close with Cancel button
    await page.locator('.qr-print-actions .btn-secondary').click();
    await expect(page.locator('.qr-print-view')).not.toBeVisible();
  });

  test('print view has Print button', async ({ page }) => {
    // Open print view
    await page.locator('.qr-print-btn').click();
    await expect(page.locator('.qr-print-view')).toBeVisible();

    // Check for Print button
    await expect(page.locator('.qr-print-actions .btn-primary')).toContainText('Print QR Codes');
  });
});

// =============================================================================
// QR Landing Page Tests
// =============================================================================

test.describe('QR Landing Page', () => {
  test('visiting QR URL with invalid data shows error state', async ({ page }) => {
    // Navigate to a QR URL with invalid data
    await page.goto('/seating-arrangement/#/table/invalid-data');

    // Should show error state
    await expect(page.locator('.qr-info-error')).toBeVisible();
    await expect(page.locator('.qr-info-error h2')).toContainText('Unable to load table information');
  });

  test('QR landing page has navigation to main app', async ({ page }) => {
    // Navigate to a QR URL with invalid data
    await page.goto('/seating-arrangement/#/table/invalid-data');

    // Should have a button to go to main app
    await expect(page.locator('.cta-button')).toBeVisible();
    await expect(page.locator('.cta-button')).toContainText('Go to Seatify');
  });

  test('clicking Go to Seatify navigates to app', async ({ page }) => {
    // Navigate to QR URL
    await page.goto('/seating-arrangement/#/table/invalid-data');
    await expect(page.locator('.qr-info-error')).toBeVisible();

    // Click the CTA button
    await page.locator('.cta-button').click();

    // Should be on the main app (event list view)
    await expect(page.locator('.event-list-view')).toBeVisible({ timeout: 5000 });
  });
});
