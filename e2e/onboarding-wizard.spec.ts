import { test, expect } from '@playwright/test';

// Helper to enter app from landing page
async function enterApp(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.click('button:has-text("Start Planning Free")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

// Helper to clear localStorage and ensure fresh state
async function clearStorageAndReload(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorageAndReload(page);
  });

  test('wizard auto-shows for first-time users after entering app', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');

    // Wizard should appear after a short delay
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // First step should be the welcome message
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Welcome to Seatify');
  });

  test('wizard does not auto-show for returning users who completed it', async ({ page }) => {
    // First, complete the wizard
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Skip through all steps
    const skipButton = page.locator('.onboarding-btn--skip');
    await skipButton.click();

    // Wizard should close
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();

    // Reload and re-enter - navigate to root first to clear hash route
    await page.goto('/');
    await page.click('button:has-text("Start Planning Free")');
    await page.waitForURL(/\/#\/events/);
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

    // Wait a moment to ensure wizard doesn't appear
    await page.waitForTimeout(1000);
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();
  });

  test('can navigate through wizard steps using Next button', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Step 1: Welcome
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Welcome');

    // Click Next
    await page.click('.onboarding-btn--next');

    // Step 2: Your Floor Plan (quick-start tour)
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Your Floor Plan');
  });

  test('can go back to previous steps', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Go to step 2
    await page.click('.onboarding-btn--next');
    await expect(page.locator('.onboarding-tooltip h3')).not.toContainText('Welcome');

    // Go back
    await page.click('.onboarding-btn--back');
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Welcome');
  });

  test('skip button closes wizard', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    await page.click('.onboarding-btn--skip');
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();
  });

  test('completing wizard shows success toast', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Click through all steps to the end (QUICK_START_STEPS has 6 steps)
    // Need to click Next 5 times to get to the last step
    for (let i = 0; i < 5; i++) {
      await page.click('.onboarding-btn--next');
      // Wait for step transition
      await page.waitForTimeout(200);
    }

    // Last step should show "Get Started" button
    await expect(page.locator('.onboarding-btn--next:has-text("Get Started")')).toBeVisible({ timeout: 3000 });

    // Click "Get Started" on the last step
    await page.click('.onboarding-btn--next:has-text("Get Started")');

    // Wizard should close
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();

    // Toast should show (Quick Start tour shows specific completion message)
    await expect(page.locator('.toast')).toContainText('Quick Start complete');
  });

  test('progress dots show current step', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // First dot should be active
    const dots = page.locator('.onboarding-dot');
    await expect(dots.first()).toHaveClass(/active/);

    // Go to next step
    await page.click('.onboarding-btn--next');

    // Second dot should be active, first should be completed
    await expect(dots.nth(1)).toHaveClass(/active/);
  });

  test('Learn menu in header can restart tours', async ({ page }, testInfo) => {
    // Skip on mobile - Learn menu is in hamburger menu, not header
    if (testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Learn menu is in hamburger menu on mobile, not in header');
    }
    // First complete the wizard
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });
    await page.click('.onboarding-btn--skip');
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();

    // Open the Learn menu dropdown
    await page.click('.learn-btn');
    await expect(page.locator('.learn-dropdown')).toBeVisible();

    // Click Quick Start tour
    await page.click('.learn-dropdown >> text=Quick Start');

    // Wizard should reopen
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Welcome');
  });

  test('Learn menu is visible in header', async ({ page }, testInfo) => {
    // Skip on mobile - Learn menu is in hamburger menu, not header
    if (testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Learn menu is in hamburger menu on mobile, not in header');
    }
    await enterApp(page);

    // Close wizard if it shows
    if (await page.locator('.onboarding-tooltip').isVisible()) {
      await page.click('.onboarding-btn--skip');
    }

    // Learn menu trigger should be visible with correct title
    await expect(page.locator('.learn-btn')).toBeVisible();
    await expect(page.locator('.learn-btn')).toHaveAttribute('title', 'Take tours to learn Seatify');
  });

  test('Escape key closes wizard', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();
  });

  test('Arrow keys navigate wizard steps', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Arrow Right goes to next step
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.onboarding-tooltip h3')).not.toContainText('Welcome');

    // Arrow Left goes back
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Welcome');
  });
});

test.describe('Onboarding Wizard - Spotlight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('spotlight highlights target elements', async ({ page }) => {
    // Skip on small mobile viewports where spotlight is hidden by design
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 480) {
      test.skip();
      return;
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Go to step with spotlight (step 3: Add Tables has placement 'bottom')
    // Step 1: Welcome (center, no spotlight)
    // Step 2: Your Floor Plan (center, no spotlight)
    // Step 3: Add Tables (bottom, HAS spotlight)
    await page.click('.onboarding-btn--next');
    await page.waitForTimeout(200);
    await page.click('.onboarding-btn--next');
    await page.waitForTimeout(200);

    // Verify we're on step 3 (Add Tables)
    await expect(page.locator('.onboarding-tooltip h3')).toContainText('Add Tables');

    // Spotlight ring should be visible (targets .add-dropdown)
    await expect(page.locator('.onboarding-spotlight-ring')).toBeVisible({ timeout: 2000 });
  });

  test('welcome step has no spotlight (center placement)', async ({ page }) => {
    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Welcome step should not have spotlight ring
    await expect(page.locator('.onboarding-spotlight-ring')).not.toBeVisible();
  });
});
