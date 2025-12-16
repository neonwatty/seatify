import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { enterApp, switchView, clickImport, openImportWizard } from './test-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get fixture path
function getFixturePath(filename: string): string {
  return path.join(__dirname, 'fixtures', filename);
}

test.describe('Import Wizard - File Upload Step', () => {
  test('import button opens the wizard modal', async ({ page }) => {
    await openImportWizard(page);

    // Verify wizard header
    await expect(page.locator('.wizard-header h2')).toContainText('Import Guests');

    // Verify step indicator shows "Upload File" as active
    await expect(page.locator('.progress-step.active')).toContainText('1');
  });

  test('can close wizard with X button', async ({ page }) => {
    await openImportWizard(page);

    // Click close button
    await page.locator('.wizard-header .close-btn').click();

    // Wizard should be closed
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible();
  });

  test('can close wizard with Escape key', async ({ page }) => {
    await openImportWizard(page);

    // Press Escape
    await page.keyboard.press('Escape');

    // Wizard should be closed
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible();
  });

  test('can upload a CSV file via file input', async ({ page }) => {
    await openImportWizard(page);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();
    await expect(page.locator('.file-name')).toContainText('basic-guests.csv');

    // Next button should be enabled
    await expect(page.locator('.wizard-footer .btn-primary')).toBeEnabled();
  });

  test('shows row count after file upload', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Should show row count (10 rows in basic-guests.csv)
    await expect(page.locator('.file-meta')).toContainText('10 rows');
  });

  test('can clear uploaded file', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // File info should be visible
    await expect(page.locator('.file-info')).toBeVisible();

    // Click clear button
    await page.locator('.clear-file').click();

    // Should show drop zone again
    await expect(page.locator('.drop-zone')).toBeVisible();
    await expect(page.locator('.file-info')).not.toBeVisible();
  });
});

test.describe('Import Wizard - Column Mapping Step', () => {
  test('auto-detects column mappings from CSV headers', async ({ page }) => {
    await openImportWizard(page);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Click Next to go to mapping step
    await page.locator('.wizard-footer .btn-primary').click();

    // Should be on mapping step
    await expect(page.locator('.progress-step.active')).toContainText('2');

    // Should show mapping rows (5 columns in basic-guests.csv)
    await expect(page.locator('.mapping-row')).toHaveCount(5);

    // Should have column names visible
    await expect(page.locator('.column-name').first()).toBeVisible();

    // Should have select dropdowns
    const selects = page.locator('.mapping-row select');
    await expect(selects).toHaveCount(5);
  });

  test('shows sample values for each column', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();

    // Should show sample values (first row: John)
    await expect(page.locator('.sample-value').first()).toContainText('John');
  });

  test('can manually change column mapping', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();

    // Find the first mapping row and change its mapping
    const firstRow = page.locator('.mapping-row').first();
    const select = firstRow.locator('select');

    // Get initial value
    const initialValue = await select.inputValue();

    // Change to a different value (notes)
    await select.selectOption('notes');
    const newValue = await select.inputValue();

    // Value should have changed
    expect(newValue).toBe('notes');
    expect(newValue).not.toBe(initialValue);
  });

  test('handles Full Name column splitting', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('full-name-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();

    // Should show mapping rows (4 columns in full-name-guests.csv)
    await expect(page.locator('.mapping-row')).toHaveCount(4);

    // First row should be Full Name - select fullName mapping
    const firstSelect = page.locator('.mapping-row').first().locator('select');
    await firstSelect.selectOption('fullName');
    await expect(firstSelect).toHaveValue('fullName');
  });
});

test.describe('Import Wizard - Data Preview Step', () => {
  test('shows preview table with parsed data', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Navigate through steps
    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview

    // Should be on preview step
    await expect(page.locator('.progress-step.active')).toContainText('3');

    // Should show preview table
    await expect(page.locator('.preview-table')).toBeVisible();

    // Should show guest count stat
    await expect(page.locator('.stat-value').first()).toContainText('10');
  });

  test('can exclude rows from import', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Uncheck first row
    const firstRowCheckbox = page.locator('.preview-table tbody tr').first().locator('input[type="checkbox"]');
    await firstRowCheckbox.uncheck();

    // Stats should update to show 9 guests
    await expect(page.locator('.stat-value').first()).toContainText('9');
  });

  test('shows validation warnings for edge cases', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('edge-cases.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Should show some warnings/errors for missing names
    const issueCount = await page.locator('.issue-badge').count();
    expect(issueCount).toBeGreaterThan(0);
  });
});

test.describe('Import Wizard - Full Import Flow', () => {
  test('can import basic guests successfully', async ({ page }) => {
    await enterApp(page);

    // Navigate to Guest List view
    await switchView(page, 'guests');

    // Count existing guests
    const initialGuestRows = await page.locator('.guest-table tbody tr').count();

    // Open import wizard
    await clickImport(page);
    await expect(page.locator('.import-wizard-modal')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Navigate through wizard
    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview

    // Click Import button (should say "Import 10 Guests" or similar)
    await page.locator('.wizard-footer .btn-primary:has-text("Import")').click();

    // Wait for import to complete and wizard to close
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify guests were added
    await page.waitForTimeout(500);
    const finalGuestRows = await page.locator('.guest-table tbody tr').count();
    expect(finalGuestRows).toBe(initialGuestRows + 10);
  });

  test('shows success toast after import', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary:has-text("Import")').click();

    // Should show success toast
    await expect(page.locator('.toast.success, .toast-success')).toBeVisible({ timeout: 3000 });
  });

  test('can import from Canvas view toolbar', async ({ page }) => {
    await enterApp(page);

    // Should be in Canvas view by default
    await expect(page.locator('.canvas')).toBeVisible();

    // Click Import button in toolbar (works on both mobile and desktop)
    await clickImport(page);

    // Wizard should open
    await expect(page.locator('.import-wizard-modal')).toBeVisible();
  });

  test('handles Full Name splitting correctly', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'guests');

    await clickImport(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('full-name-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview

    // Preview should show split names (John Smith -> first: John, last: Smith)
    await expect(page.locator('.preview-table')).toContainText('John');

    await page.locator('.wizard-footer .btn-primary:has-text("Import")').click();
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify the guest appears with proper name
    await page.waitForTimeout(500);
    await expect(page.locator('.guest-table')).toContainText('John Smith');
  });
});

test.describe('Import Wizard - Navigation', () => {
  test('back button navigates to previous step', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Go to step 2
    await page.locator('.wizard-footer .btn-primary').click();
    await expect(page.locator('.progress-step.active')).toContainText('2');

    // Click back
    await page.locator('.wizard-footer .btn-secondary:has-text("Back")').click();

    // Should be back on step 1
    await expect(page.locator('.progress-step.active')).toContainText('1');
  });

  test('back button is disabled on first step', async ({ page }) => {
    await openImportWizard(page);

    // Back button should be disabled
    await expect(page.locator('.wizard-footer .btn-secondary:has-text("Back")')).toBeDisabled();
  });

  test('next button is disabled without file', async ({ page }) => {
    await openImportWizard(page);

    // Next button should be disabled
    await expect(page.locator('.wizard-footer .btn-primary')).toBeDisabled();
  });
});

test.describe('Import Wizard - Corporate Event Data', () => {
  test('shows corporate columns in mapping', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('corporate-event.csv'));

    await page.locator('.wizard-footer .btn-primary').click();

    // Should show 8 mapping rows for corporate-event.csv
    // (First Name, Last Name, Email, Company, Job Title, Department, Dietary Restrictions, Notes)
    await expect(page.locator('.mapping-row')).toHaveCount(8);

    // Should have select dropdowns for all columns
    const selects = page.locator('.mapping-row select');
    await expect(selects).toHaveCount(8);

    // Column names should be visible
    const columnNames = await page.locator('.column-name').allTextContents();
    expect(columnNames).toContain('Company');
    expect(columnNames).toContain('Job Title');
    expect(columnNames).toContain('Department');
  });
});

test.describe('Import Wizard - Wedding Data', () => {
  test('shows wedding-specific columns', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('wedding-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();

    // Should show 8 mapping rows for wedding-guests.csv
    await expect(page.locator('.mapping-row')).toHaveCount(8);

    // Column names should include wedding-specific columns
    const columnNames = await page.locator('.column-name').allTextContents();
    expect(columnNames).toContain('Guest Of');
    expect(columnNames).toContain('Party');
  });
});
