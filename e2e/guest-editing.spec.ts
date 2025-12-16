import { test, expect } from '@playwright/test';
import { enterApp, addTable, clickAddGuest } from './test-utils';

test.describe('Guest Editing', () => {
  test.beforeEach(async ({ page }) => {
    await enterApp(page);
    // Clear any persisted state and set up fresh, but preserve onboarding completion
    await page.evaluate(() => {
      localStorage.clear();
      // Re-set onboarding completion to skip wizard (zustand-persist v4 format)
      const data = { state: { hasCompletedOnboarding: true }, version: 10 };
      localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
    });
    await page.reload();
    // Re-enter app after reload
    await page.click('button:has-text("Start Planning")');
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

    // Add a table first using the helper (works on both mobile and desktop)
    await addTable(page, 'round');

    // Add a guest using the helper (works on both mobile and desktop)
    await clickAddGuest(page);

    // Wait for guest to appear on canvas
    await expect(page.locator('.canvas-guest')).toHaveCount(1, { timeout: 5000 });
  });

  test.describe('Double-click to edit', () => {
    test('double-clicking an unassigned guest opens the edit modal', async ({ page }) => {
      // Find the unassigned guest on canvas
      const canvasGuest = page.locator('.canvas-guest').first();
      await expect(canvasGuest).toBeVisible();

      // Double-click the guest
      await canvasGuest.dblclick();

      // Verify the edit modal opens
      await expect(page.locator('.guest-form-modal')).toBeVisible();

      // Verify it's editing the correct guest (first name field should be populated)
      const firstNameInput = page.locator('.guest-form-modal input[type="text"]').first();
      await expect(firstNameInput).toHaveValue(/.+/);
    });

    test('double-clicking a seated guest opens the edit modal', async ({ page }) => {
      // Demo data already has seated guests, use one of them
      const seatedGuest = page.locator('.seat-guest').first();
      await expect(seatedGuest).toBeVisible({ timeout: 5000 });

      // Double-click the seated guest
      await seatedGuest.dblclick({ force: true });

      // Verify the edit modal opens
      await expect(page.locator('.guest-form-modal')).toBeVisible({ timeout: 3000 });
    });

    test('edit modal can be closed with cancel button', async ({ page }) => {
      const canvasGuest = page.locator('.canvas-guest').first();
      await canvasGuest.dblclick();

      await expect(page.locator('.guest-form-modal')).toBeVisible();

      // Click cancel
      await page.click('button:has-text("Cancel")');

      // Modal should close
      await expect(page.locator('.guest-form-modal')).not.toBeVisible();
    });

    test('edit modal can be closed by clicking overlay', async ({ page }) => {
      const canvasGuest = page.locator('.canvas-guest').first();
      await canvasGuest.dblclick();

      await expect(page.locator('.guest-form-modal')).toBeVisible();

      // Click the overlay (outside the modal content)
      await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 }, force: true });

      // Modal should close
      await expect(page.locator('.guest-form-modal')).not.toBeVisible();
    });
  });

  test.describe('Context menu to edit', () => {
    test('right-clicking an unassigned guest shows context menu with Edit option', async ({ page }) => {
      const canvasGuest = page.locator('.canvas-guest').first();
      await expect(canvasGuest).toBeVisible();

      // Right-click to open context menu
      await canvasGuest.click({ button: 'right' });

      // Verify context menu appears with Edit Guest option
      await expect(page.locator('.context-menu')).toBeVisible();
      await expect(page.locator('.context-menu-item:has-text("Edit Guest")')).toBeVisible();
    });

    test('clicking Edit Guest in context menu opens the edit modal', async ({ page }) => {
      const canvasGuest = page.locator('.canvas-guest').first();
      await canvasGuest.click({ button: 'right' });

      // Click Edit Guest
      await page.click('.context-menu-item:has-text("Edit Guest")');

      // Verify the edit modal opens
      await expect(page.locator('.guest-form-modal')).toBeVisible();
    });

    test('right-clicking a seated guest shows context menu with Edit option', async ({ page }) => {
      // Demo data already has seated guests
      const seatedGuest = page.locator('.seat-guest').first();
      await expect(seatedGuest).toBeVisible({ timeout: 5000 });

      // Right-click to open context menu
      await seatedGuest.click({ button: 'right', force: true });

      // Verify context menu appears with Edit Guest option
      await expect(page.locator('.context-menu')).toBeVisible();
      await expect(page.locator('.context-menu-item:has-text("Edit Guest")')).toBeVisible();
    });
  });

  test.describe('Edit modal functionality', () => {
    test('can edit guest name and save', async ({ page }) => {
      const canvasGuest = page.locator('.canvas-guest').first();
      await canvasGuest.dblclick();

      await expect(page.locator('.guest-form-modal')).toBeVisible();

      // Clear and type new first and last name
      const textInputs = page.locator('.guest-form-modal input[type="text"]');
      const firstNameInput = textInputs.nth(0);
      const lastNameInput = textInputs.nth(1);

      await firstNameInput.clear();
      await firstNameInput.fill('Test');
      await lastNameInput.clear();
      await lastNameInput.fill('Guest');

      // Save
      await page.click('button:has-text("Save")');

      // Modal should close
      await expect(page.locator('.guest-form-modal')).not.toBeVisible();
    });
  });
});
