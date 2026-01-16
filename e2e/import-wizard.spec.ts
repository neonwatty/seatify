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

    // Uncheck first row (IOSCheckmark is checked by default, so click to uncheck)
    const firstRowCheckmark = page.locator('.preview-table tbody tr').first().locator('button.ios-checkmark');
    await firstRowCheckmark.click();

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

    // Wait for guest table to be visible and stable
    await expect(page.locator('.guest-table tbody')).toBeVisible();
    await page.waitForTimeout(300); // Wait for data to fully render

    // Count existing guests
    const initialGuestRows = await page.locator('.guest-table tbody tr').count();

    // Open import wizard
    await clickImport(page);
    await expect(page.locator('.import-wizard-modal')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Navigate through wizard (including new table assignment step)
    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview
    await page.locator('.wizard-footer .btn-primary').click(); // to table assignment

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

    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview
    await page.locator('.wizard-footer .btn-primary').click(); // to table assignment
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

    await page.locator('.wizard-footer .btn-primary').click(); // to table assignment
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

test.describe('Import Wizard - Table Assignment Step', () => {
  // Navigate to the table assignment step
  async function navigateToTableAssignmentStep(page: import('@playwright/test').Page) {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Navigate through steps: Upload -> Mapping -> Preview -> Tables
    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview
    await page.locator('.wizard-footer .btn-primary').click(); // to tables

    // Wait for table assignment step to be visible
    await expect(page.locator('.table-assignment-step')).toBeVisible();
  }

  test('shows table assignment step after preview step', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Should be on step 4 (Table Assignment)
    await expect(page.locator('.progress-step.active')).toContainText('4');
    await expect(page.locator('.progress-step.active')).toContainText('Table Assignment');
  });

  test('step indicator shows "Table Assignment" as step 4', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Verify the step number and title
    const activeStep = page.locator('.progress-step.active');
    await expect(activeStep.locator('.step-number')).toContainText('4');
    await expect(activeStep.locator('.step-title')).toContainText('Table Assignment');
  });

  test('can navigate back to preview step', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Click back
    await page.locator('.wizard-footer .btn-secondary:has-text("Back")').click();

    // Should be back on preview step
    await expect(page.locator('.progress-step.active')).toContainText('3');
    await expect(page.locator('.preview-table')).toBeVisible();
  });

  test('can navigate forward from table assignment step', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Click next
    await page.locator('.wizard-footer .btn-primary').click();

    // Should leave table assignment step - either go to duplicates or show import
    await expect(page.locator('.table-assignment-step')).not.toBeVisible({ timeout: 3000 });
  });

  test('table assignment is disabled by default (skip mode)', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // The skip option should be selected
    const skipRadio = page.locator('.assignment-toggle input[type="radio"]').first();
    await expect(skipRadio).toBeChecked();

    // Configuration sections should be hidden
    await expect(page.locator('.config-section')).not.toBeVisible();
  });

  test('can enable table assignment via toggle', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Click the "Create tables" radio option
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Configuration sections should now be visible
    await expect(page.locator('.config-section').first()).toBeVisible();
  });

  test('enabling shows configuration sections', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Should show table configuration section
    await expect(page.locator('h4:has-text("Table Configuration")')).toBeVisible();

    // Should show distribution strategy section
    await expect(page.locator('h4:has-text("Distribution Strategy")')).toBeVisible();
  });

  test('disabling hides configuration sections', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable first
    await page.locator('.toggle-option:has-text("Create tables")').click();
    await expect(page.locator('.config-section').first()).toBeVisible();

    // Then disable
    await page.locator('.toggle-option:has-text("Skip table assignment")').click();
    await expect(page.locator('.config-section')).not.toBeVisible();
  });

  test('can proceed with assignment disabled (skip)', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Should be able to proceed without enabling table assignment
    await expect(page.locator('.wizard-footer .btn-primary')).toBeEnabled();

    // Click next
    await page.locator('.wizard-footer .btn-primary').click();

    // Should proceed to next step
    await expect(page.locator('.table-assignment-step')).not.toBeVisible();
  });

  test('auto-calculates table count from guest count and capacity', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // 10 guests with default capacity 8 = 2 tables recommended
    const tableCountInput = page.locator('#table-count');
    const value = await tableCountInput.inputValue();
    expect(parseInt(value)).toBeGreaterThan(0);
  });

  test('shows recommended table count hint', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Should show recommended hint
    await expect(page.locator('.field-hint')).toContainText('Recommended:');
  });

  test('shape dropdown shows all 6 table shapes', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    const shapeSelect = page.locator('#table-shape');
    const options = await shapeSelect.locator('option').allTextContents();

    // Should have all 6 table shapes
    expect(options).toHaveLength(6);
    expect(options.join(' ')).toContain('Round');
    expect(options.join(' ')).toContain('Rectangle');
    expect(options.join(' ')).toContain('Square');
    expect(options.join(' ')).toContain('Oval');
    expect(options.join(' ')).toContain('Half-Round');
    expect(options.join(' ')).toContain('Serpentine');
  });

  test('changing shape updates default capacity', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Get initial capacity (round table default is 8)
    const capacityInput = page.locator('#table-capacity');
    const initialCapacity = await capacityInput.inputValue();
    expect(initialCapacity).toBe('8');

    // Change to rectangle (capacity 10)
    const shapeSelect = page.locator('#table-shape');
    await shapeSelect.selectOption('rectangle');

    // Capacity should update to 10
    const newCapacity = await capacityInput.inputValue();
    expect(newCapacity).toBe('10');
  });

  test('can manually adjust table capacity', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    const capacityInput = page.locator('#table-capacity');
    await capacityInput.fill('12');

    const newValue = await capacityInput.inputValue();
    expect(newValue).toBe('12');
  });

  test('can manually adjust table count', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    const tableCountInput = page.locator('#table-count');
    await tableCountInput.fill('5');

    const newValue = await tableCountInput.inputValue();
    expect(newValue).toBe('5');
  });

  test('shows all 4 distribution strategies', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Should have 4 strategy options
    const strategies = page.locator('.strategy-option');
    await expect(strategies).toHaveCount(4);

    // Check strategy labels
    await expect(page.locator('.strategy-option')).toContainText(['Distribute Evenly', 'Keep Groups Together', 'Smart Optimization', "Don't Assign"]);
  });

  test('"Distribute Evenly" is default strategy', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // "Distribute Evenly" should be selected
    const evenStrategy = page.locator('.strategy-option:has-text("Distribute Evenly") input[type="radio"]');
    await expect(evenStrategy).toBeChecked();
  });

  test('can select "Keep Groups Together" strategy', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Select groups strategy
    await page.locator('.strategy-option:has-text("Keep Groups Together")').click();

    const groupsStrategy = page.locator('.strategy-option:has-text("Keep Groups Together") input[type="radio"]');
    await expect(groupsStrategy).toBeChecked();
  });

  test('can select "Smart Optimization" strategy', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Select optimized strategy
    await page.locator('.strategy-option:has-text("Smart Optimization")').click();

    const optimizedStrategy = page.locator('.strategy-option:has-text("Smart Optimization") input[type="radio"]');
    await expect(optimizedStrategy).toBeChecked();
  });

  test('can select "Don\'t Assign" strategy', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Select skip strategy
    await page.locator('.strategy-option:has-text("Don\'t Assign")').click();

    const skipStrategy = page.locator('.strategy-option:has-text("Don\'t Assign") input[type="radio"]');
    await expect(skipStrategy).toBeChecked();
  });

  test('no warning when groups strategy selected and group data exists', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Select groups strategy
    await page.locator('.strategy-option:has-text("Keep Groups Together")').click();

    // basic-guests.csv has group data, so warning should NOT appear
    await expect(page.locator('.warning-message')).not.toBeVisible();
  });

  test('shows assignment preview when strategy is not skip', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Preview should be visible (since default strategy is "even", not "skip")
    await expect(page.locator('.assignment-preview')).toBeVisible();
  });

  test('preview shows table names and guest counts', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Wait for preview to appear (computed async via useEffect)
    await expect(page.locator('.assignment-preview')).toBeVisible({ timeout: 3000 });

    // Preview should show table headers with counts
    const previewTables = page.locator('.preview-table');
    await expect(previewTables.first()).toBeVisible();

    // Each table should show count
    const firstTable = previewTables.first();
    await expect(firstTable.locator('.preview-table-name')).toContainText('Table');
    await expect(firstTable.locator('.preview-table-count')).toBeVisible();
  });

  test('preview hides when "Don\'t Assign" selected', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Preview should be visible initially
    await expect(page.locator('.assignment-preview')).toBeVisible();

    // Select "Don't Assign" strategy
    await page.locator('.strategy-option:has-text("Don\'t Assign")').click();

    // Preview should be hidden
    await expect(page.locator('.assignment-preview')).not.toBeVisible();
  });

  test('shows guest count in summary stats', async ({ page }) => {
    await navigateToTableAssignmentStep(page);

    // Should show guest count stat (10 guests in basic-guests.csv)
    await expect(page.locator('.assignment-stats .stat-value').first()).toContainText('10');
    await expect(page.locator('.assignment-stats .stat-label').first()).toContainText('guests');
  });
});

test.describe('Import Wizard - Table Assignment Integration', () => {
  // Helper to complete import - handles both direct Import button and Next->Import flows
  async function completeImport(page: import('@playwright/test').Page) {
    // The button text depends on whether we're on the last step
    // Try clicking the primary button (could be Next or Import)
    const primaryBtn = page.locator('.wizard-footer .btn-primary');
    const btnText = await primaryBtn.textContent();

    if (btnText?.includes('Import')) {
      // Already on last step, click Import
      await primaryBtn.click();
    } else {
      // Need to click Next first, then Import
      await primaryBtn.click();
      await page.locator('.wizard-footer .btn-primary:has-text("Import")').click();
    }
  }

  test('creates tables on import when enabled', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    // Count initial tables (tables on canvas have class .table-component)
    const initialTables = await page.locator('.table-component').count();

    // Navigate to import and go to table assignment step
    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click(); // to mapping
    await page.locator('.wizard-footer .btn-primary').click(); // to preview
    await page.locator('.wizard-footer .btn-primary').click(); // to tables

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Set to 2 tables
    const tableCountInput = page.locator('#table-count');
    await tableCountInput.fill('2');

    // Complete import
    await completeImport(page);

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify tables were created
    await page.waitForTimeout(500);
    const finalTables = await page.locator('.table-component').count();
    expect(finalTables).toBe(initialTables + 2);
  });

  test('shows correct success toast with table count', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'guests');

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();

    // Set to 2 tables
    await page.locator('#table-count').fill('2');

    // Complete import
    await completeImport(page);

    // Should show toast mentioning tables
    await expect(page.locator('.toast.success, .toast-success')).toContainText('table', { timeout: 3000 });
  });

  test('assigns guests to created tables with even distribution', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Enable table assignment with even distribution
    await page.locator('.toggle-option:has-text("Create tables")').click();
    await page.locator('#table-count').fill('2');
    await page.locator('.strategy-option:has-text("Distribute Evenly")').click();

    // Complete import
    await completeImport(page);

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify guests are seated (not floating on canvas as unassigned)
    // With 10 guests and 2 tables, we should have guests seated
    const seatedGuests = await page.locator('.seat-guest').count();
    expect(seatedGuests).toBeGreaterThan(0);
  });

  test('creates tables but leaves guests unassigned with skip strategy', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    // Count initial state
    const initialTables = await page.locator('.table-component').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Enable table assignment with "Don't Assign" strategy
    await page.locator('.toggle-option:has-text("Create tables")').click();
    await page.locator('#table-count').fill('2');
    await page.locator('.strategy-option:has-text("Don\'t Assign")').click();

    // Complete import
    await completeImport(page);

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify tables were created
    const finalTables = await page.locator('.table-component').count();
    expect(finalTables).toBe(initialTables + 2);

    // Guests should be unassigned - verify via the sidebar that shows unassigned count
    // Demo has 14 unassigned guests + 10 imported = 24 unassigned
    await expect(page.locator('text=24 unassigned')).toBeVisible();
  });

  test('imports without creating tables when assignment is disabled', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    // Count initial tables
    const initialTables = await page.locator('.table-component').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Keep table assignment disabled (skip mode is default)
    // Complete import - button may say Import if this is last step
    await completeImport(page);

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify no new tables were created
    const finalTables = await page.locator('.table-component').count();
    expect(finalTables).toBe(initialTables);
  });

  test('tables appear on canvas after import', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Enable table assignment with specific count
    await page.locator('.toggle-option:has-text("Create tables")').click();
    await page.locator('#table-count').fill('3');

    // Complete import
    await completeImport(page);

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // New tables should be visible on canvas
    const newTables = page.locator('.table-component');
    const count = await newTables.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('works correctly after going back and changing settings', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    const initialTables = await page.locator('.table-component').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();
    await page.locator('.wizard-footer .btn-primary').click();

    // Enable table assignment
    await page.locator('.toggle-option:has-text("Create tables")').click();
    await page.locator('#table-count').fill('5');

    // Go back to preview
    await page.locator('.wizard-footer .btn-secondary:has-text("Back")').click();

    // Come back to table assignment
    await page.locator('.wizard-footer .btn-primary').click();

    // Change the table count
    await page.locator('#table-count').fill('2');

    // Complete import
    await completeImport(page);

    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Should have created 2 tables (the final setting)
    const finalTables = await page.locator('.table-component').count();
    expect(finalTables).toBe(initialTables + 2);
  });
});

// =============================================================================
// Platform Detection Tests
// =============================================================================

test.describe('Import Wizard - Platform Detection', () => {
  // Import wizard has issues on mobile viewports - skip these tests on mobile
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('Tablet');
    if (isMobile) {
      test.skip();
    }
  });

  test('detects RSVPify format and shows platform hint', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('rsvpify-export.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();

    // Should detect RSVPify platform
    await expect(page.locator('.platform-hint')).toBeVisible();
    await expect(page.locator('.platform-hint')).toContainText('RSVPify');
  });

  test('detects Zola format and shows platform hint', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('zola-export.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();

    // Should detect Zola platform
    await expect(page.locator('.platform-hint')).toBeVisible();
    await expect(page.locator('.platform-hint')).toContainText('Zola');
  });

  test('does not show platform hint for generic CSV', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();

    // Should NOT show platform hint for generic CSV
    await expect(page.locator('.platform-hint')).not.toBeVisible();
  });

  test('RSVPify import auto-maps Group ID to group field', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('rsvpify-export.csv'));

    // Go to mapping step
    await page.locator('.wizard-footer .btn-primary').click();

    // Check that Group ID is mapped to Group
    const groupIdRow = page.locator('.mapping-row').filter({ hasText: 'Group ID' });
    await expect(groupIdRow.locator('select')).toHaveValue('group');
  });

  test('Zola import auto-maps Name to fullName field', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('zola-export.csv'));

    // Go to mapping step
    await page.locator('.wizard-footer .btn-primary').click();

    // Check that Name is mapped to Full Name (look for column-name element with exact text)
    const nameRow = page.locator('.mapping-row').filter({ has: page.locator('.column-name', { hasText: 'Name' }) }).first();
    await expect(nameRow.locator('select')).toHaveValue('fullName');
  });

  test('can complete full import flow with RSVPify format', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    const initialGuests = await page.locator('.guest-list-item, .sidebar-list li').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('rsvpify-export.csv'));

    // Verify platform detected
    await expect(page.locator('.platform-hint')).toContainText('RSVPify');

    // Navigate through wizard
    await page.locator('.wizard-footer .btn-primary').click(); // To mapping
    await page.locator('.wizard-footer .btn-primary').click(); // To preview
    await page.locator('.wizard-footer .btn-primary').click(); // To tables
    await page.locator('.wizard-footer .btn-primary').click(); // Complete import

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify guests were imported (10 guests in RSVPify fixture)
    await switchView(page, 'guests');
    await page.waitForTimeout(300);
    const finalGuests = await page.locator('.guest-card, [class*="guest"]').count();
    expect(finalGuests).toBeGreaterThan(initialGuests);
  });

  test('can complete full import flow with Zola format', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    const initialGuests = await page.locator('.guest-list-item, .sidebar-list li').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('zola-export.csv'));

    // Verify platform detected
    await expect(page.locator('.platform-hint')).toContainText('Zola');

    // Navigate through wizard
    await page.locator('.wizard-footer .btn-primary').click(); // To mapping
    await page.locator('.wizard-footer .btn-primary').click(); // To preview
    await page.locator('.wizard-footer .btn-primary').click(); // To tables
    await page.locator('.wizard-footer .btn-primary').click(); // Complete import

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify guests were imported (10 guests in Zola fixture)
    await switchView(page, 'guests');
    await page.waitForTimeout(300);
    const finalGuests = await page.locator('.guest-card, [class*="guest"]').count();
    expect(finalGuests).toBeGreaterThan(initialGuests);
  });

  test('Zola full name is split correctly into first and last name', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('zola-export.csv'));

    // Go to mapping step
    await page.locator('.wizard-footer .btn-primary').click();

    // Go to preview step
    await page.locator('.wizard-footer .btn-primary').click();

    // Check that names are split correctly in preview
    // "John Smith" should become First: John, Last: Smith
    const previewTable = page.locator('.preview-table, .data-preview');
    await expect(previewTable).toContainText('John');
    await expect(previewTable).toContainText('Smith');
  });

  test('detects Joy format and shows platform hint', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('joy-export.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();

    // Should detect Joy platform
    await expect(page.locator('.platform-hint')).toBeVisible();
    await expect(page.locator('.platform-hint')).toContainText('Joy');
  });

  test('Joy import auto-maps Party to group field', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('joy-export.csv'));

    // Go to mapping step
    await page.locator('.wizard-footer .btn-primary').click();

    // Check that Party is mapped to Group
    const partyRow = page.locator('.mapping-row').filter({ hasText: 'Party' });
    await expect(partyRow.locator('select')).toHaveValue('group');
  });

  test('can complete full import flow with Joy format', async ({ page }) => {
    await enterApp(page);
    await switchView(page, 'canvas');

    const initialGuests = await page.locator('.guest-list-item, .sidebar-list li').count();

    await clickImport(page);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('joy-export.csv'));

    // Verify platform detected
    await expect(page.locator('.platform-hint')).toContainText('Joy');

    // Navigate through wizard
    await page.locator('.wizard-footer .btn-primary').click(); // To mapping
    await page.locator('.wizard-footer .btn-primary').click(); // To preview
    await page.locator('.wizard-footer .btn-primary').click(); // To tables
    await page.locator('.wizard-footer .btn-primary').click(); // Complete import

    // Wait for import to complete
    await expect(page.locator('.import-wizard-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify guests were imported (10 guests in Joy fixture)
    await switchView(page, 'guests');
    await page.waitForTimeout(300);
    const finalGuests = await page.locator('.guest-card, [class*="guest"]').count();
    expect(finalGuests).toBeGreaterThan(initialGuests);
  });

  test('shows Help Us Improve prompt for generic CSV', async ({ page }) => {
    await openImportWizard(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(getFixturePath('basic-guests.csv'));

    // Should show file info
    await expect(page.locator('.file-info')).toBeVisible();

    // Should show Help Us Improve prompt for generic CSV
    await expect(page.locator('.help-improve-hint')).toBeVisible();
    await expect(page.locator('.help-improve-hint')).toContainText('Help us improve detection');
  });
});

// =============================================================================
// Landing Page Platform Messaging Tests
// =============================================================================

test.describe('Landing Page - Platform Messaging', () => {
  test('shows supported platforms on landing page', async ({ page }) => {
    await page.goto('/seating-arrangement/');

    // Should show the platforms section
    await expect(page.locator('.supported-platforms')).toBeVisible();

    // Should list active platforms (Zola, RSVPify, Joy, CSV/Excel)
    await expect(page.locator('.platform-name').filter({ hasText: 'Zola' })).toBeVisible();
    await expect(page.locator('.platform-name').filter({ hasText: 'RSVPify' })).toBeVisible();
    await expect(page.locator('.platform-name').filter({ hasText: /^Joy$/ })).toBeVisible();
    await expect(page.locator('.platform-name').filter({ hasText: 'CSV/Excel' })).toBeVisible();

    // Should show coming soon platforms (The Knot, Eventbrite)
    await expect(page.locator('.platform-name.coming-soon').filter({ hasText: 'The Knot' })).toBeVisible();
    await expect(page.locator('.platform-name.coming-soon').filter({ hasText: 'Eventbrite' })).toBeVisible();
  });

  test('Joy is an active platform (not coming soon)', async ({ page }) => {
    await page.goto('/seating-arrangement/');

    // Joy should be in the platforms list without the coming-soon class
    const joyPlatform = page.locator('.platform-name').filter({ hasText: /^Joy$/ });
    await expect(joyPlatform).toBeVisible();
    await expect(joyPlatform).not.toHaveClass(/coming-soon/);
  });

  test('coming soon platforms are visually distinct', async ({ page }) => {
    await page.goto('/seating-arrangement/');

    // Coming soon platforms should have the coming-soon class (The Knot, Eventbrite)
    const comingSoonPlatforms = page.locator('.platform-name.coming-soon');
    await expect(comingSoonPlatforms).toHaveCount(2);

    // They should contain "(coming soon)" text
    await expect(comingSoonPlatforms.first()).toContainText('coming soon');
  });
});
