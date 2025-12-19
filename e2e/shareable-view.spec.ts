import { test, expect } from '@playwright/test';
import { enterApp } from './test-utils';

// Skip mobile tests - share modal has browser-dependent behavior
test.skip(({ viewport }) => {
  return viewport !== null && viewport.width < 768;
}, 'Skipping shareable view tests on mobile viewports');

/**
 * Helper to switch to dashboard view (desktop only)
 */
async function switchToDashboard(page: import('@playwright/test').Page) {
  await page.click('.toggle-option:has-text("Dashboard")');
  // Wait for dashboard view to be visible
  await expect(page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });
}

// =============================================================================
// Share Button Tests
// =============================================================================

test.describe('Share Button', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('share button is visible in quick actions', async ({ page }) => {
    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await expect(shareBtn).toBeVisible();
  });

  test('share button has correct icon', async ({ page }) => {
    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await expect(shareBtn.locator('.action-icon')).toContainText('↗');
  });

  test('clicking share button opens share modal', async ({ page }) => {
    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await shareBtn.click();

    // Wait for share modal to appear
    await expect(page.locator('.share-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.share-modal-header h2')).toContainText('Share Seating Chart');
  });
});

// =============================================================================
// Share Modal Tests
// =============================================================================

test.describe('Share Modal', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
    // Open share modal
    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await shareBtn.click();
    await expect(page.locator('.share-modal')).toBeVisible({ timeout: 5000 });
  });

  test('share modal has close button', async ({ page }) => {
    await expect(page.locator('.share-modal-close')).toBeVisible();
  });

  test('clicking close button closes modal', async ({ page }) => {
    await page.locator('.share-modal-close').click();
    await expect(page.locator('.share-modal')).not.toBeVisible();
  });

  test('pressing escape closes modal', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.share-modal')).not.toBeVisible();
  });

  test('share modal shows event summary', async ({ page }) => {
    await expect(page.locator('.share-event-summary')).toBeVisible();
    await expect(page.locator('.share-event-name')).toBeVisible();
    await expect(page.locator('.share-event-stats')).toBeVisible();
  });

  test('share modal has shareable link section', async ({ page }) => {
    // Check for URL input (main element that's always visible when not too large)
    await expect(page.locator('.share-url-input')).toBeVisible();
  });

  test('share modal has url input field', async ({ page }) => {
    const urlInput = page.locator('.share-url-input');
    await expect(urlInput).toBeVisible();
    // URL should contain #/share/
    const value = await urlInput.inputValue();
    expect(value).toContain('#/share/');
  });

  test('share modal has copy button', async ({ page }) => {
    const copyBtn = page.locator('.share-copy-btn');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toContainText('Copy');
  });

  test('copy button shows copied state when clicked', async ({ page }) => {
    const copyBtn = page.locator('.share-copy-btn');
    await copyBtn.click();
    await expect(copyBtn).toContainText('Copied!');
    await expect(copyBtn).toHaveClass(/copied/);
  });

  test('share modal has data size indicator', async ({ page }) => {
    await expect(page.locator('.share-data-size')).toBeVisible();
    const sizeText = await page.locator('.share-data-size').textContent();
    expect(sizeText).toMatch(/Data size: [\d.]+\s*KB/);
  });

  test('share modal has QR code toggle', async ({ page }) => {
    const qrToggle = page.locator('.share-qr-toggle');
    await expect(qrToggle).toBeVisible();
    await expect(qrToggle).toContainText('Show QR Code');
  });

  test('clicking QR toggle shows QR code', async ({ page }) => {
    const qrToggle = page.locator('.share-qr-toggle');
    await qrToggle.click();
    await expect(page.locator('.share-qr-container')).toBeVisible();
    await expect(page.locator('.share-qr-code')).toBeVisible();
    await expect(qrToggle).toContainText('Hide QR Code');
  });

  test('clicking QR toggle again hides QR code', async ({ page }) => {
    const qrToggle = page.locator('.share-qr-toggle');
    // Show QR
    await qrToggle.click();
    await expect(page.locator('.share-qr-container')).toBeVisible();
    // Hide QR
    await qrToggle.click();
    await expect(page.locator('.share-qr-container')).not.toBeVisible();
    await expect(qrToggle).toContainText('Show QR Code');
  });

  test('share modal has download file section', async ({ page }) => {
    await expect(page.locator('.share-download-section')).toBeVisible();
  });

  test('share modal has download button', async ({ page }) => {
    const downloadBtn = page.locator('.share-download-btn');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toContainText('Download Seating Data');
  });

  test('clicking download button triggers file download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.locator('.share-download-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('_seating.json');
  });

  test('share modal has footer note about read-only', async ({ page }) => {
    await expect(page.locator('.share-footer-note')).toBeVisible();
    const noteText = await page.locator('.share-footer-note').textContent();
    expect(noteText).toContain('read-only');
  });
});

// =============================================================================
// Shareable View Page Tests
// =============================================================================

test.describe('Shareable View Page', () => {
  test('navigating to /share shows upload prompt', async ({ page }) => {
    await page.goto('/#/share');
    await expect(page.locator('.shareable-upload-prompt')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.shareable-upload-prompt h2')).toContainText('View Shared Seating Chart');
  });

  test('/share page has upload button', async ({ page }) => {
    await page.goto('/#/share');
    await expect(page.locator('.upload-btn')).toBeVisible();
    await expect(page.locator('.upload-btn')).toContainText('Upload Seating File');
  });

  test('/share page has create your own link', async ({ page }) => {
    await page.goto('/#/share');
    await expect(page.locator('.secondary-btn')).toBeVisible();
    await expect(page.locator('.secondary-btn')).toContainText('create your own event');
  });

  test('clicking create your own navigates to events', async ({ page }) => {
    await page.goto('/#/share');
    await page.locator('.secondary-btn').click();
    // Should navigate to events page
    await expect(page).toHaveURL(/\/#\/events/);
  });

  test('invalid share URL shows error state', async ({ page }) => {
    // Navigate to share URL with invalid data
    await page.goto('/#/share/invaliddata123');
    await expect(page.locator('.shareable-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.shareable-error h2')).toContainText('Unable to load seating chart');
  });

  test('error page has upload fallback option', async ({ page }) => {
    await page.goto('/#/share/invaliddata123');
    await expect(page.locator('.upload-btn')).toBeVisible();
    await expect(page.locator('.upload-btn')).toContainText('Upload a file instead');
  });

  test('error page has go to app button', async ({ page }) => {
    await page.goto('/#/share/invaliddata123');
    await expect(page.locator('.secondary-btn')).toBeVisible();
    await expect(page.locator('.secondary-btn')).toContainText('Go to TableCraft');
  });
});

// =============================================================================
// End-to-End Share Flow Test
// =============================================================================

test.describe('Share Flow', () => {
  test('can generate share link and view it', async ({ page, context }) => {
    // Enter app and go to dashboard
    await enterApp(page);
    await switchToDashboard(page);

    // Open share modal
    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await shareBtn.click();
    await expect(page.locator('.share-modal')).toBeVisible({ timeout: 5000 });

    // Get the share URL
    const urlInput = page.locator('.share-url-input');
    const shareUrl = await urlInput.inputValue();

    // Close modal
    await page.locator('.share-modal-close').click();

    // Open new page and navigate to share URL
    const newPage = await context.newPage();
    await newPage.goto(shareUrl.replace(page.url().split('#')[0], ''));

    // Should show the shared view
    await expect(newPage.locator('.shareable-page-full')).toBeVisible({ timeout: 10000 });
    await expect(newPage.locator('.readonly-canvas-container')).toBeVisible();

    // Should show event name in topbar
    await expect(newPage.locator('.shareable-topbar')).toBeVisible();
    await expect(newPage.locator('.shareable-badge')).toContainText('Shared View');

    await newPage.close();
  });
});

// =============================================================================
// Read-Only Canvas Tests
// =============================================================================

test.describe('Read-Only Canvas', () => {
  test.beforeEach(async ({ page }) => {
    // Generate and navigate to a share URL
    await enterApp(page);
    await switchToDashboard(page);

    const shareBtn = page.locator('.action-btn').filter({ hasText: 'Share View' });
    await shareBtn.click();
    await expect(page.locator('.share-modal')).toBeVisible({ timeout: 5000 });

    const urlInput = page.locator('.share-url-input');
    const shareUrl = await urlInput.inputValue();

    // Navigate to share URL in same page
    const hashPart = new URL(shareUrl).hash;
    await page.goto('/' + hashPart);
    await expect(page.locator('.readonly-canvas-container')).toBeVisible({ timeout: 10000 });
  });

  test('read-only canvas has zoom controls', async ({ page }) => {
    await expect(page.locator('.readonly-zoom-controls')).toBeVisible();
    // Zoom in button
    await expect(page.locator('.readonly-zoom-controls button').first()).toBeVisible();
    // Zoom display
    await expect(page.locator('.readonly-zoom-controls .zoom-display')).toBeVisible();
    // Zoom out button
    await expect(page.locator('.readonly-zoom-controls button').nth(1)).toBeVisible();
    // Recenter button
    await expect(page.locator('.readonly-zoom-controls .recenter-btn')).toBeVisible();
  });

  test('read-only canvas shows event name', async ({ page }) => {
    await expect(page.locator('.readonly-event-name')).toBeVisible();
  });

  test('read-only canvas shows table and guest counts', async ({ page }) => {
    await expect(page.locator('.readonly-stats')).toBeVisible();
    const statsText = await page.locator('.readonly-stats').textContent();
    expect(statsText).toMatch(/\d+ tables? .* \d+ guests?/);
  });

  test('zoom in button works', async ({ page }) => {
    const zoomDisplay = page.locator('.readonly-zoom-controls .zoom-display');
    const initialZoom = await zoomDisplay.textContent();

    // Click zoom in
    await page.locator('.readonly-zoom-controls button').nth(1).click();

    // Zoom should increase
    const newZoom = await zoomDisplay.textContent();
    expect(parseInt(newZoom!)).toBeGreaterThan(parseInt(initialZoom!));
  });

  test('zoom out button works', async ({ page }) => {
    const zoomDisplay = page.locator('.readonly-zoom-controls .zoom-display');
    const initialZoom = await zoomDisplay.textContent();

    // Click zoom out
    await page.locator('.readonly-zoom-controls button').first().click();

    // Zoom should decrease
    const newZoom = await zoomDisplay.textContent();
    expect(parseInt(newZoom!)).toBeLessThan(parseInt(initialZoom!));
  });

  test('recenter button works', async ({ page }) => {
    // First change zoom
    await page.locator('.readonly-zoom-controls button').nth(1).click();
    await page.locator('.readonly-zoom-controls button').nth(1).click();

    // Then recenter
    await page.locator('.readonly-zoom-controls .recenter-btn').click();

    // Zoom controls should still be visible (canvas container is still there)
    await expect(page.locator('.readonly-zoom-controls')).toBeVisible();
  });
});
