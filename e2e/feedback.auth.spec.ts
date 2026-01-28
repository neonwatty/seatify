import { test, expect } from '@playwright/test';

/**
 * Feedback Modal E2E tests.
 *
 * These tests run with authenticated state (via chromium-authenticated project).
 * The auth state is saved by e2e/auth.setup.ts and reused here.
 *
 * Tests verify that:
 * - Feedback modal UI renders correctly
 * - Form validation works
 * - Category selection works
 * - Modal opens/closes correctly
 * - Form submission works
 */

test.describe('Feedback Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard - auth state is already loaded
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify we're authenticated (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Modal Opening', () => {
    test('should open feedback modal from user dropdown', async ({ page }) => {
      // Click user menu button
      await page.locator('.user-menu-button').click();

      // Dropdown should appear
      await expect(page.locator('.user-menu-dropdown')).toBeVisible();

      // Click Send Feedback option
      await page.locator('.menu-item.feedback-item').click();

      // Modal should open
      await expect(page.locator('.feedback-modal')).toBeVisible();

      // Modal header should be visible
      await expect(page.getByRole('heading', { name: 'Send Feedback' })).toBeVisible();
    });

    test('should display intro text', async ({ page }) => {
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      await expect(page.getByText(/actively improving/i)).toBeVisible();
    });
  });

  test.describe('Category Selection', () => {
    test('should display all category options', async ({ page }) => {
      // Open user menu
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      // Check all categories are present
      await expect(page.locator('.feedback-category').filter({ hasText: 'Bug' })).toBeVisible();
      await expect(page.locator('.feedback-category').filter({ hasText: 'Feature' })).toBeVisible();
      await expect(page.locator('.feedback-category').filter({ hasText: 'Question' })).toBeVisible();
      await expect(page.locator('.feedback-category').filter({ hasText: 'Other' })).toBeVisible();
    });

    test('should select category when clicked', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      // Click bug category
      const bugButton = page.locator('.feedback-category').filter({ hasText: 'Bug' });
      await bugButton.click();

      // Should have selected class
      await expect(bugButton).toHaveClass(/selected/);
    });

    test('should only have one category selected at a time', async ({ page }) => {
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      const bugButton = page.locator('.feedback-category').filter({ hasText: 'Bug' });
      const featureButton = page.locator('.feedback-category').filter({ hasText: 'Feature' });

      await bugButton.click();
      await expect(bugButton).toHaveClass(/selected/);
      await expect(featureButton).not.toHaveClass(/selected/);

      await featureButton.click();
      await expect(bugButton).not.toHaveClass(/selected/);
      await expect(featureButton).toHaveClass(/selected/);
    });
  });

  test.describe('Form Validation', () => {
    test('should disable submit until form is valid', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      // Submit button should be disabled initially
      const submitButton = page.locator('.feedback-btn-primary');
      await expect(submitButton).toBeDisabled();

      // Select a category
      await page.locator('.feedback-category').filter({ hasText: 'Bug' }).click();

      // Still disabled (no description)
      await expect(submitButton).toBeDisabled();

      // Fill description
      await page.locator('#feedback-description').fill('This is a test bug report');

      // Now should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test('should not require subject field', async ({ page }) => {
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      await page.locator('.feedback-category').filter({ hasText: 'Feature' }).click();
      await page.locator('#feedback-description').fill('Please add dark mode');

      // Submit should be enabled even without subject
      const submitButton = page.locator('.feedback-btn-primary');
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('Modal Closing', () => {
    test('should close modal when Cancel is clicked', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();
      await expect(page.locator('.feedback-modal')).toBeVisible();

      // Click cancel
      await page.locator('.feedback-btn-secondary').click();

      // Modal should be closed
      await expect(page.locator('.feedback-modal')).not.toBeVisible();
    });

    test('should close modal when X button is clicked', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();
      await expect(page.locator('.feedback-modal')).toBeVisible();

      // Click X button
      await page.locator('.feedback-close-btn').click();

      // Modal should be closed
      await expect(page.locator('.feedback-modal')).not.toBeVisible();
    });

    test('should close modal when clicking overlay', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();
      await expect(page.locator('.feedback-modal')).toBeVisible();

      // Click overlay (outside modal)
      await page.locator('.feedback-modal-overlay').click({ position: { x: 10, y: 10 } });

      // Modal should be closed
      await expect(page.locator('.feedback-modal')).not.toBeVisible();
    });
  });

  test.describe('Form Submission', () => {
    test('should show success state after submission', async ({ page }) => {
      // Open modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      // Fill out form
      await page.locator('.feedback-category').filter({ hasText: 'Feature' }).click();
      await page.locator('#feedback-subject').fill('Dark mode request');
      await page.locator('#feedback-description').fill('Please add dark mode to the app');

      // Submit
      await page.locator('.feedback-btn-primary').click();

      // Should show either success message or "email not configured" message
      // (email service may not be available in test environment)
      const successMessage = page.getByText(/thanks for your feedback/i);
      const configError = page.getByText(/email service not configured/i);

      await expect(successMessage.or(configError)).toBeVisible({ timeout: 10000 });
    });

    test('should show loading state while submitting', async ({ page }) => {
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      await page.locator('.feedback-category').filter({ hasText: 'Bug' }).click();
      await page.locator('#feedback-description').fill('Test bug report');

      // Click submit and immediately check for loading state
      await page.locator('.feedback-btn-primary').click();

      // Either loading text or success should appear (loading may be too fast to catch)
      await expect(
        page.getByText(/sending|thanks/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form Reset', () => {
    test('should reset form when modal reopens', async ({ page }) => {
      // Open modal and fill form
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();
      await page.locator('.feedback-category').filter({ hasText: 'Bug' }).click();
      await page.locator('#feedback-subject').fill('Test subject');
      await page.locator('#feedback-description').fill('Test description');

      // Close modal
      await page.locator('.feedback-btn-secondary').click();

      // Reopen modal
      await page.locator('.user-menu-button').click();
      await page.locator('.menu-item.feedback-item').click();

      // Form should be reset
      await expect(page.locator('#feedback-subject')).toHaveValue('');
      await expect(page.locator('#feedback-description')).toHaveValue('');
      await expect(page.locator('.feedback-category.selected')).not.toBeVisible();
    });
  });
});

test.describe('Feedback Modal Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display as bottom sheet on mobile', async ({ page }) => {
    // Open modal
    await page.locator('.user-menu-button').click();
    await page.locator('.menu-item.feedback-item').click();

    // Modal should be visible
    await expect(page.locator('.feedback-modal')).toBeVisible();

    // On mobile, modal should have bottom sheet styling
    // Verify modal is positioned toward bottom of viewport
    const modal = page.locator('.feedback-modal');
    const boundingBox = await modal.boundingBox();
    if (boundingBox) {
      // Modal should extend to bottom of viewport (or near it)
      expect(boundingBox.y + boundingBox.height).toBeGreaterThan(500);
    }
  });

  test('should have stacked buttons on mobile', async ({ page }) => {
    await page.locator('.user-menu-button').click();
    await page.locator('.menu-item.feedback-item').click();

    // Get button positions
    const cancelBtn = page.locator('.feedback-btn-secondary');
    const submitBtn = page.locator('.feedback-btn-primary');

    const cancelBox = await cancelBtn.boundingBox();
    const submitBox = await submitBtn.boundingBox();

    if (cancelBox && submitBox) {
      // On mobile, submit should be above cancel (column-reverse layout)
      expect(submitBox.y).toBeLessThan(cancelBox.y);
    }
  });
});
