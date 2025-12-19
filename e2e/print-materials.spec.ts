import { test, expect } from '@playwright/test';
import { enterApp } from './test-utils';

// Skip mobile tests - PDF downloads have browser-dependent behavior
// and mobile dashboard navigation has timing issues
test.skip(({ viewport }) => {
  return viewport !== null && viewport.width < 768;
}, 'Skipping PDF tests on mobile viewports');

/**
 * Helper to switch to dashboard view (desktop only)
 */
async function switchToDashboard(page: import('@playwright/test').Page) {
  await page.click('.toggle-option:has-text("Dashboard")');
  // Wait for dashboard view to be visible
  await expect(page.locator('.dashboard-view')).toBeVisible({ timeout: 5000 });
}

// =============================================================================
// Print Materials Section Tests
// =============================================================================

test.describe('Print Materials', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('print materials section is visible in dashboard', async ({ page }) => {
    // Check for the Print Materials section
    await expect(page.locator('.print-materials')).toBeVisible();
    await expect(page.locator('.print-materials h3')).toContainText('Print Materials');
  });

  test('print materials section has description', async ({ page }) => {
    await expect(page.locator('.print-materials-description')).toBeVisible();
    await expect(page.locator('.print-materials-description')).toContainText('Generate printable PDFs');
  });

  test('table cards button is visible', async ({ page }) => {
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await expect(tableCardsBtn).toBeVisible();
    await expect(tableCardsBtn.locator('.print-material-desc')).toContainText('Tent cards');
  });

  test('place cards button is visible', async ({ page }) => {
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await expect(placeCardsBtn).toBeVisible();
    await expect(placeCardsBtn.locator('.print-material-desc')).toContainText('Name cards');
  });

  test('table cards shows count badge', async ({ page }) => {
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    const countBadge = tableCardsBtn.locator('.print-material-count');
    await expect(countBadge).toBeVisible();
    // Should show number of tables (e.g., "3 cards")
    await expect(countBadge).toContainText('cards');
  });

  test('place cards shows count badge', async ({ page }) => {
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    const countBadge = placeCardsBtn.locator('.print-material-count');
    await expect(countBadge).toBeVisible();
    // Should show number of seated confirmed guests
    await expect(countBadge).toContainText('cards');
  });
});

// =============================================================================
// Table Cards Button Tests
// =============================================================================

test.describe('Table Cards Button', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('table cards button has icon', async ({ page }) => {
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    const icon = tableCardsBtn.locator('.print-material-icon svg');
    await expect(icon).toBeVisible();
  });

  test('clicking table cards button opens preview modal', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for preview modal to appear (increased timeout for lazy-loaded jsPDF)
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.pdf-preview-header h2')).toContainText('Table Cards Preview');
  });
});

// =============================================================================
// Place Cards Button Tests
// =============================================================================

test.describe('Place Cards Button', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('place cards button has icon', async ({ page }) => {
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    const icon = placeCardsBtn.locator('.print-material-icon svg');
    await expect(icon).toBeVisible();
  });

  test('place cards button shows appropriate count', async ({ page }) => {
    // The place cards count should show seated confirmed guests
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    const countBadge = placeCardsBtn.locator('.print-material-count');

    // Should contain a number followed by "cards"
    await expect(countBadge).toBeVisible();
    const countText = await countBadge.textContent();
    expect(countText).toMatch(/\d+\s*cards/);
  });
});

// =============================================================================
// PDF Preview Tests
// =============================================================================

test.describe('PDF Preview', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('clicking table cards button opens preview modal', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for preview modal to appear (increased timeout for lazy-loaded jsPDF)
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.pdf-preview-header h2')).toContainText('Table Cards Preview');
  });

  test('preview modal shows loading state initially', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Check for loading spinner (may be brief)
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 5000 });
  });

  test('preview modal has download button', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal and check download button
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.pdf-preview-btn.download')).toBeVisible();
  });

  test('preview modal has close button', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal and check close button
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.pdf-preview-btn.close')).toBeVisible();
  });

  test('closing preview modal works', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Click close button
    await page.locator('.pdf-preview-btn.close').click();

    // Modal should be hidden
    await expect(page.locator('.pdf-preview-modal')).not.toBeVisible();
  });

  test('preview modal displays PDF in iframe after loading', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for PDF to load in iframe
    await expect(page.locator('.pdf-preview-iframe')).toBeVisible({ timeout: 15000 });
  });

  test.skip('clicking overlay closes preview modal', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Click on overlay (not the modal itself)
    await page.locator('.pdf-preview-overlay').click({ position: { x: 10, y: 10 } });

    // Modal should be hidden
    await expect(page.locator('.pdf-preview-modal')).not.toBeVisible();
  });

  test('download from preview triggers download', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal and PDF to load
    await expect(page.locator('.pdf-preview-iframe')).toBeVisible({ timeout: 15000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click download button
    await page.locator('.pdf-preview-btn.download').click();

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('downloads have correct filenames based on event name', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal and PDF to load
    await expect(page.locator('.pdf-preview-iframe')).toBeVisible({ timeout: 15000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click download button
    await page.locator('.pdf-preview-btn.download').click();

    // Verify download filename contains event name
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/.*-table-cards\.pdf$/);
  });
});

// =============================================================================
// PDF Customization Options Tests
// =============================================================================

test.describe('PDF Customization Options', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    await switchToDashboard(page);
  });

  test('place cards preview shows options button', async ({ page }) => {
    // Click the place cards button
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();

    // Wait for modal
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Check for options button (settings cog icon)
    await expect(page.locator('.pdf-preview-btn.options')).toBeVisible();
  });

  test('table cards preview shows options button', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();

    // Wait for modal
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options button should be visible for table cards
    await expect(page.locator('.pdf-preview-btn.options')).toBeVisible();
  });

  test('table cards options panel has guest count checkbox', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for guest count checkbox
    const guestCountCheckbox = page.locator('.pdf-option-label').filter({ hasText: 'Show guest count' });
    await expect(guestCountCheckbox).toBeVisible();
    await expect(guestCountCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('table cards options panel has event name checkbox', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for event name checkbox
    const eventNameCheckbox = page.locator('.pdf-option-label').filter({ hasText: 'Show event name' });
    await expect(eventNameCheckbox).toBeVisible();
    await expect(eventNameCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('table cards options panel has font size options', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for font size options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Font Size' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Small' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Medium' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Large' })).toBeVisible();
  });

  test('table card options can be toggled', async ({ page }) => {
    // Click the table cards button
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Uncheck guest count
    const guestCountCheckbox = page.locator('.pdf-option-label').filter({ hasText: 'Show guest count' });
    await guestCountCheckbox.click();
    await expect(guestCountCheckbox.locator('input[type="checkbox"]')).not.toBeChecked();

    // Re-check guest count
    await guestCountCheckbox.click();
    await expect(guestCountCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('options panel is visible by default', async ({ page }) => {
    // Click the place cards button
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();

    // Wait for modal
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel should be visible by default (no click needed)
    await expect(page.locator('.pdf-options-panel')).toBeVisible();
  });

  test('options panel has table name checkbox', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for table name checkbox
    const tableNameCheckbox = page.locator('.pdf-option-label').filter({ hasText: 'Show table name' });
    await expect(tableNameCheckbox).toBeVisible();
    await expect(tableNameCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('options panel has dietary icons checkbox', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for dietary icons checkbox
    const dietaryCheckbox = page.locator('.pdf-option-label').filter({ hasText: 'Show dietary icons' });
    await expect(dietaryCheckbox).toBeVisible();
    await expect(dietaryCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('options panel has font size options', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for font size options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Font Size' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Small' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Medium' })).toBeVisible();
    await expect(page.locator('.pdf-font-label').filter({ hasText: 'Large' })).toBeVisible();
  });

  test('medium font size is selected by default', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check that medium is selected
    const mediumOption = page.locator('.pdf-font-option').filter({ hasText: 'Medium' });
    await expect(mediumOption.locator('input[type="radio"]')).toBeChecked();
  });

  test('can toggle options button to hide/show panel', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Close options panel by clicking
    await page.locator('.pdf-preview-btn.options').click();
    await expect(page.locator('.pdf-options-panel')).not.toBeVisible();

    // Re-open options panel by clicking again
    await page.locator('.pdf-preview-btn.options').click();
    await expect(page.locator('.pdf-options-panel')).toBeVisible();
  });

  test('options button shows active state when panel is open', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Button should be active initially (panel is open by default)
    await expect(page.locator('.pdf-preview-btn.options.active')).toBeVisible();

    // Close options panel
    await page.locator('.pdf-preview-btn.options').click();

    // Button should no longer be active
    await expect(page.locator('.pdf-preview-btn.options.active')).not.toBeVisible();
  });

  test('options panel has font style options', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for font style options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Font Style' })).toBeVisible();
    await expect(page.getByText('Sans-serif', { exact: true })).toBeVisible();
    await expect(page.getByText('Serif', { exact: true })).toBeVisible();
    await expect(page.getByText('Monospace', { exact: true })).toBeVisible();
  });

  test('sans-serif font style is selected by default', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check that sans-serif is selected (helvetica is default)
    const sansSerifOption = page.locator('.pdf-font-option').filter({ hasText: 'Sans-serif' });
    await expect(sansSerifOption.locator('input[type="radio"]')).toBeChecked();
  });

  test('can select different font styles', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Select Serif (use exact text match to avoid matching 'Sans-serif')
    const serifLabel = page.getByText('Serif', { exact: true });
    await serifLabel.click();
    const serifRadio = page.locator('input[name="fontFamily"][value="times"]');
    await expect(serifRadio).toBeChecked();

    // Select Monospace
    const monospaceLabel = page.getByText('Monospace', { exact: true });
    await monospaceLabel.click();
    const monospaceRadio = page.locator('input[name="fontFamily"][value="courier"]');
    await expect(monospaceRadio).toBeChecked();

    // Sans-serif should no longer be checked
    const sansSerifRadio = page.locator('input[name="fontFamily"][value="helvetica"]');
    await expect(sansSerifRadio).not.toBeChecked();
  });

  test('table cards preview has font style options', async ({ page }) => {
    // Open table cards preview
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for font style options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Font Style' })).toBeVisible();
    await expect(page.getByText('Sans-serif', { exact: true })).toBeVisible();
    await expect(page.getByText('Serif', { exact: true })).toBeVisible();
    await expect(page.getByText('Monospace', { exact: true })).toBeVisible();
  });

  test('options panel has color theme options', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for color theme options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Color Theme' })).toBeVisible();
    await expect(page.getByText('Classic', { exact: true })).toBeVisible();
    await expect(page.getByText('Elegant', { exact: true })).toBeVisible();
    await expect(page.getByText('Modern', { exact: true })).toBeVisible();
    await expect(page.getByText('Nature', { exact: true })).toBeVisible();
    await expect(page.getByText('Romantic', { exact: true })).toBeVisible();
  });

  test('classic color theme is selected by default', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check that classic is selected by default
    const classicRadio = page.locator('input[name="colorTheme"][value="classic"]');
    await expect(classicRadio).toBeChecked();
  });

  test('can select different color themes', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Select Elegant theme
    const elegantLabel = page.getByText('Elegant', { exact: true });
    await elegantLabel.click();
    const elegantRadio = page.locator('input[name="colorTheme"][value="elegant"]');
    await expect(elegantRadio).toBeChecked();

    // Select Nature theme
    const natureLabel = page.getByText('Nature', { exact: true });
    await natureLabel.click();
    const natureRadio = page.locator('input[name="colorTheme"][value="nature"]');
    await expect(natureRadio).toBeChecked();

    // Classic should no longer be checked
    const classicRadio = page.locator('input[name="colorTheme"][value="classic"]');
    await expect(classicRadio).not.toBeChecked();
  });

  test('table cards preview has color theme options', async ({ page }) => {
    // Open table cards preview
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for color theme options
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Color Theme' })).toBeVisible();
    await expect(page.getByText('Classic', { exact: true })).toBeVisible();
    await expect(page.getByText('Elegant', { exact: true })).toBeVisible();
  });

  test('options panel has card size options', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for card size options (use .pdf-size-label class to distinguish from font size)
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Card Size' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Compact' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Standard' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Large' })).toBeVisible();
  });

  test('standard card size is selected by default', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check that standard is selected by default
    const standardRadio = page.locator('input[name="cardSize"][value="standard"]');
    await expect(standardRadio).toBeChecked();
  });

  test('can select different card sizes', async ({ page }) => {
    // Open place cards preview
    const placeCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Place Cards' });
    await placeCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Select Compact size (use .pdf-size-label to distinguish from other labels)
    const compactLabel = page.locator('.pdf-size-label').filter({ hasText: 'Compact' });
    await compactLabel.click();
    const compactRadio = page.locator('input[name="cardSize"][value="compact"]');
    await expect(compactRadio).toBeChecked();

    // Select Large size (use .pdf-size-label to distinguish from font size Large)
    const largeLabel = page.locator('.pdf-size-label').filter({ hasText: 'Large' });
    await largeLabel.click();
    const largeRadio = page.locator('input[name="cardSize"][value="large"]');
    await expect(largeRadio).toBeChecked();

    // Standard should no longer be checked
    const standardRadio = page.locator('input[name="cardSize"][value="standard"]');
    await expect(standardRadio).not.toBeChecked();
  });

  test('table cards preview has card size options', async ({ page }) => {
    // Open table cards preview
    const tableCardsBtn = page.locator('.print-material-btn').filter({ hasText: 'Table Cards' });
    await tableCardsBtn.click();
    await expect(page.locator('.pdf-preview-modal')).toBeVisible({ timeout: 15000 });

    // Options panel is visible by default
    await expect(page.locator('.pdf-options-panel')).toBeVisible();

    // Check for card size options (use .pdf-size-label class to distinguish from font size)
    await expect(page.locator('.pdf-option-title').filter({ hasText: 'Card Size' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Compact' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Standard' })).toBeVisible();
    await expect(page.locator('.pdf-size-label').filter({ hasText: 'Large' })).toBeVisible();
  });
});
