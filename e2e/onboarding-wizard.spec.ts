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
    await page.waitForURL(/\/events$/);
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

test.describe('Onboarding Wizard - Mobile Minimize/Expand', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('drag handle is visible on mobile', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Drag handle is only visible on mobile');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Drag handle should be visible on mobile
    await expect(page.locator('.onboarding-drag-handle')).toBeVisible();
    await expect(page.locator('.onboarding-drag-handle-bar')).toBeVisible();
  });

  test('drag handle is hidden on desktop', async ({ page }, testInfo) => {
    // Only run on desktop projects
    if (testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Test is for desktop behavior');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Drag handle should be hidden on desktop
    await expect(page.locator('.onboarding-drag-handle')).not.toBeVisible();
  });

  test('swipe down minimizes wizard to pill on mobile', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Swipe-to-minimize is only available on mobile');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Get the drag handle position for swipe simulation
    const dragHandle = page.locator('.onboarding-drag-handle');
    await expect(dragHandle).toBeVisible();
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('Drag handle not found');

    // Simulate swipe down gesture on the drag handle
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 }); // Swipe down 100px
    await page.mouse.up();

    // Wait for animation
    await page.waitForTimeout(400);

    // Tooltip should be hidden, pill should be visible
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();
    await expect(page.locator('.onboarding-pill')).toBeVisible();
    await expect(page.locator('.onboarding-pill-text')).toContainText('Step 1/');
    await expect(page.locator('.onboarding-pill-expand')).toContainText('Tap to continue');
  });

  test('tap pill expands wizard back', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Pill is only available on mobile');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Minimize via swipe on drag handle
    const dragHandle = page.locator('.onboarding-drag-handle');
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('Drag handle not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Verify minimized
    await expect(page.locator('.onboarding-pill')).toBeVisible();

    // Tap pill to expand
    await page.click('.onboarding-pill');
    await page.waitForTimeout(200);

    // Tooltip should be visible again, pill should be hidden
    await expect(page.locator('.onboarding-tooltip')).toBeVisible();
    await expect(page.locator('.onboarding-pill')).not.toBeVisible();
  });

  test('escape key closes wizard even when minimized', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'This test is for mobile minimize behavior');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Minimize via swipe on drag handle
    const dragHandle = page.locator('.onboarding-drag-handle');
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('Drag handle not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Verify minimized
    await expect(page.locator('.onboarding-pill')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Both should be hidden (wizard closed)
    await expect(page.locator('.onboarding-pill')).not.toBeVisible();
    await expect(page.locator('.onboarding-tooltip')).not.toBeVisible();
  });

  test('pill shows correct step number', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'Pill is only available on mobile');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Navigate to step 2
    await page.click('.onboarding-btn--next');
    await page.waitForTimeout(200);

    // Minimize via swipe on drag handle
    const dragHandle = page.locator('.onboarding-drag-handle');
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('Drag handle not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Pill should show step 2
    await expect(page.locator('.onboarding-pill-text')).toContainText('Step 2/');
  });

  test('content is visible when wizard is minimized', async ({ page }, testInfo) => {
    // Only run on mobile projects
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip(true, 'This test is for mobile minimize behavior');
    }

    await page.click('button:has-text("Start Planning Free")');
    await expect(page.locator('.onboarding-tooltip')).toBeVisible({ timeout: 3000 });

    // Minimize via swipe on drag handle
    const dragHandle = page.locator('.onboarding-drag-handle');
    const box = await dragHandle.boundingBox();
    if (!box) throw new Error('Drag handle not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    // Verify minimized
    await expect(page.locator('.onboarding-pill')).toBeVisible();

    // The overlay should have pointer-events: none so content is accessible
    // Verify the overlay has the minimized class
    await expect(page.locator('.onboarding-overlay--minimized')).toBeVisible();
  });
});
