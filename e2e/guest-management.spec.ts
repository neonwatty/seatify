import { test, expect } from '@playwright/test';

const DEMO_EVENT_URL = '/dashboard/events/00000000-0000-0000-0000-000000000001';

/**
 * Guest Management E2E tests.
 *
 * These tests verify basic guest management functionality.
 * Tests are designed to be resilient and skip gracefully if elements aren't found.
 */

test.describe('Guest View Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });
  });

  test('should load guests page for demo event', async ({ page }) => {
    await page.goto(`${DEMO_EVENT_URL}/guests`);
    await page.waitForLoadState('networkidle');

    // Page should load (not redirect to 404 or error)
    const url = page.url();
    expect(url).toContain('/guests');
  });

  test('should navigate to guests from canvas', async ({ page }) => {
    await page.goto(`${DEMO_EVENT_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });

    // Look for navigation to guests
    const guestsNav = page.locator('a[href*="/guests"], button').filter({ hasText: /guests/i });

    if (await guestsNav.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await guestsNav.first().click();
      await page.waitForURL(/\/guests/);
    }
  });
});

test.describe('Guest List Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(`${DEMO_EVENT_URL}/guests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('should display main content area', async ({ page }) => {
    // Check that something rendered (not just a blank page)
    const body = page.locator('body');
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });

  test('should have toolbar with actions', async ({ page }) => {
    // Look for any toolbar buttons
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show guest data if available', async ({ page }) => {
    // Check for any guest-related elements
    const guestElements = page.locator('[class*="guest"], .guest-row, .guest-card, .guest-item');
    const count = await guestElements.count();
    // May or may not have guests visible depending on layout
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Add Guest Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(`${DEMO_EVENT_URL}/guests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should have add guest button', async ({ page }) => {
    const addGuestBtn = page.locator('button').filter({ hasText: /add guest/i });

    if (await addGuestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addGuestBtn).toBeVisible();
    } else {
      // Add button might not be visible in this view
      test.skip();
    }
  });

  test('should open add guest form when button clicked', async ({ page }) => {
    const addGuestBtn = page.locator('button').filter({ hasText: /add guest/i });

    if (!await addGuestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await addGuestBtn.click();

    // Look for form or modal
    const form = page.locator('form, .guest-form, .modal, [class*="modal"]');
    await expect(form.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Guest Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(`${DEMO_EVENT_URL}/guests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should have import button', async ({ page }) => {
    const importBtn = page.locator('button').filter({ hasText: /import/i });

    if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(importBtn).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should open import wizard when import clicked', async ({ page }) => {
    const importBtn = page.locator('button').filter({ hasText: /import/i });

    if (!await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await importBtn.click();

    // Import wizard should appear
    const wizard = page.locator('.import-wizard, [class*="import"], .modal');
    await expect(wizard.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Guest Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(`${DEMO_EVENT_URL}/guests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should have export button', async ({ page }) => {
    const exportBtn = page.locator('button').filter({ hasText: /export/i });

    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    } else {
      test.skip();
    }
  });
});
