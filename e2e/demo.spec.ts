import { test, expect } from '@playwright/test';

const DEMO_EVENT_URL = '/dashboard/events/00000000-0000-0000-0000-000000000001/canvas';

/**
 * Demo experience E2E tests.
 *
 * These tests require the demo event to be seeded in the database.
 * In CI, Supabase is started locally and seeded before running tests.
 * Locally, ensure you've run the seed-demo.sql script against your Supabase instance.
 */

test.describe('Demo Canvas Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state for each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should load demo page without authentication', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Should NOT redirect to login
    expect(page.url()).not.toContain('/login');

    // Should show the canvas page
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
  });

  test('should show demo banner on demo page', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Demo banner should be visible
    const demoBanner = page.locator('.demo-banner');
    await expect(demoBanner).toBeVisible({ timeout: 10000 });
  });

  test('should auto-start quick-start tour for new users', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Wait for tour to auto-start (500ms delay + render time)
    const tourOverlay = page.locator('.onboarding-overlay');
    await expect(tourOverlay).toBeVisible({ timeout: 5000 });

    // Should show the tour tooltip
    const tooltip = page.locator('.onboarding-tooltip');
    await expect(tooltip).toBeVisible();
  });

  test('should show Learn button in header', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Close auto-started tour first by clicking "Later"
    const laterButton = page.locator('.onboarding-btn--later');
    if (await laterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await laterButton.click();
    }

    // Learn button should be visible
    const learnButton = page.locator('.learn-btn');
    await expect(learnButton).toBeVisible();
  });

  test('should open Learn dropdown with tours', async ({ page }) => {
    // Prevent auto-start of tour
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 }).catch(() => {});

    // Click Learn button to open dropdown
    const learnButton = page.locator('.learn-btn');
    await learnButton.click();

    // Dropdown should be visible with tour items
    const dropdown = page.locator('.learn-dropdown');
    await expect(dropdown).toBeVisible();

    // Should have at least one tour item
    const tourItems = page.locator('.learn-dropdown-item');
    await expect(tourItems.first()).toBeVisible();
  });

  test('should start tour from Learn dropdown', async ({ page }) => {
    // Set session flag to prevent auto-start of tour
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Ensure page is loaded and no overlay is showing
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Click Learn button
    const learnButton = page.locator('.learn-btn');
    await expect(learnButton).toBeVisible();
    await learnButton.click();

    // Wait for dropdown to be fully visible and stable
    const dropdown = page.locator('.learn-dropdown');
    await expect(dropdown).toBeVisible();
    await page.waitForTimeout(100); // Let dropdown animation settle

    // Click the first dropdown item using JavaScript to avoid z-index issues
    await page.evaluate(() => {
      const item = document.querySelector('.learn-dropdown-item') as HTMLButtonElement;
      if (item) item.click();
    });

    // Tour should start
    const tourOverlay = page.locator('.onboarding-overlay');
    await expect(tourOverlay).toBeVisible({ timeout: 5000 });
  });

  test('should dismiss tour with Later button', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Wait for tour to auto-start
    const tourOverlay = page.locator('.onboarding-overlay');
    await expect(tourOverlay).toBeVisible({ timeout: 5000 });

    // Click "Later" button
    const laterButton = page.locator('.onboarding-btn--later');
    await laterButton.click();

    // Tour should close
    await expect(tourOverlay).not.toBeVisible({ timeout: 2000 });
  });

  test('should advance through tour steps with Next button', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Wait for tour to auto-start
    const tourOverlay = page.locator('.onboarding-overlay');
    await expect(tourOverlay).toBeVisible({ timeout: 5000 });

    // Get initial step content
    const tooltipTitle = page.locator('.onboarding-tooltip h3');
    const initialTitle = await tooltipTitle.textContent();

    // Click Next button
    const nextButton = page.locator('.onboarding-btn--next');
    await nextButton.click();

    // Should advance to next step (title should change)
    await expect(tooltipTitle).not.toHaveText(initialTitle ?? '', { timeout: 2000 });
  });

  test('should show progress dots in tour', async ({ page }) => {
    await page.goto(DEMO_EVENT_URL);
    await page.waitForLoadState('networkidle');

    // Wait for tour to auto-start
    const tourOverlay = page.locator('.onboarding-overlay');
    await expect(tourOverlay).toBeVisible({ timeout: 5000 });

    // Should show progress dots
    const progressDots = page.locator('.onboarding-dot');
    expect(await progressDots.count()).toBeGreaterThan(0);

    // First dot should be active
    await expect(progressDots.first()).toHaveClass(/active/);
  });
});

test.describe('Demo Banner Signup Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Set session flag to prevent auto-start of tour before navigating
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });
  });

  test('should show signup modal when clicking banner CTA', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure page loaded and no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Demo banner should be visible
    const demoBanner = page.locator('.demo-banner');
    await expect(demoBanner).toBeVisible();

    // Click the banner CTA button
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    // Signup modal should appear
    const signupModal = page.locator('.demo-signup-modal');
    await expect(signupModal).toBeVisible({ timeout: 5000 });
  });

  test('should show "Save Your Work" messaging in modal', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Click the banner CTA
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    // Modal should show "Save Your Work" title
    const modalTitle = page.locator('.demo-signup-modal h2');
    await expect(modalTitle).toHaveText('Save Your Work');

    // Modal should show the description
    const modalDescription = page.locator('.demo-signup-header p');
    await expect(modalDescription).toContainText('save your seating arrangement');
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Open the modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    const signupModal = page.locator('.demo-signup-modal');
    await expect(signupModal).toBeVisible();

    // Click close button
    const closeButton = page.locator('.demo-signup-close');
    await closeButton.click();

    // Modal should close
    await expect(signupModal).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal when clicking overlay', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Open the modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    const signupModal = page.locator('.demo-signup-modal');
    await expect(signupModal).toBeVisible();

    // Click on the overlay (outside the modal content)
    const overlay = page.locator('.demo-signup-modal-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(signupModal).not.toBeVisible({ timeout: 2000 });
  });

  test('should have Google signup option', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Open the modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    // Google signup button should be visible
    const googleButton = page.locator('.demo-signup-btn.google');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText('Continue with Google');
  });

  test('should have email signup form', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Open the modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    // Form fields should be visible
    await expect(page.locator('#demo-signup-email')).toBeVisible();
    await expect(page.locator('#demo-signup-password')).toBeVisible();
    await expect(page.locator('#demo-signup-confirm')).toBeVisible();

    // Submit button should show correct CTA
    const submitButton = page.locator('.demo-signup-btn.primary');
    await expect(submitButton).toContainText('Create Free Account');
  });

  test('should show benefit items in modal', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // Open the modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await bannerCTA.click();

    // Benefits should be listed
    const benefits = page.locator('.benefit-item');
    await expect(benefits).toHaveCount(3);
    await expect(benefits.nth(0)).toContainText('Your demo work will be saved');
    await expect(benefits.nth(1)).toContainText('Access from any device');
    await expect(benefits.nth(2)).toContainText('Free forever');
  });
});

test.describe('Demo Migration Flow', () => {
  test('should migrate demo data to new account after signup', async ({ page }) => {
    // Generate unique email for this test run
    const testEmail = `test-migration-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Set session flag to prevent auto-start of tour before navigating
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('tourRemindLater', 'true');
    });

    // 1. Go to demo page
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Wait for page to load and ensure no overlay is blocking
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.onboarding-overlay')).not.toBeVisible({ timeout: 3000 });

    // 3. Click the banner CTA to open signup modal
    const bannerCTA = page.locator('.demo-banner-cta');
    await expect(bannerCTA).toBeVisible();
    await bannerCTA.click();

    // 4. Signup modal should appear
    const signupModal = page.locator('.demo-signup-modal');
    await expect(signupModal).toBeVisible({ timeout: 5000 });

    // 5. Fill in the signup form
    await page.fill('#demo-signup-email', testEmail);
    await page.fill('#demo-signup-password', testPassword);
    await page.fill('#demo-signup-confirm', testPassword);

    // 6. Submit the form
    await page.click('.demo-signup-btn.primary');

    // 7. With auto-confirm enabled, should redirect to dashboard with migration params
    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard\?migrate=demo/, { timeout: 15000 });

    // 8. Verify migration handler processes the migration
    // The overlay appears briefly during migration - it may already be gone
    // So we just wait for the redirect to complete

    // 9. Wait for migration to complete and redirect to new event
    // When feature is provided, redirects to event dashboard; otherwise canvas
    // Since we're using feature=save_work, it goes to the event dashboard
    await page.waitForURL(/\/dashboard\/events\/[^/]+\/dashboard/, { timeout: 15000 });

    // 10. Verify the migrated event page has loaded
    // The event layout should be visible
    await expect(page.locator('.event-layout')).toBeVisible({ timeout: 10000 });

    // 11. Verify the event name input shows "Demo Event" (the migrated event)
    const eventNameInput = page.locator('.event-name-input');
    await expect(eventNameInput.first()).toBeVisible({ timeout: 5000 });
    await expect(eventNameInput.first()).toHaveValue('Demo Event');

    // 12. Verify we're on the correct event page (not the public demo event)
    // The URL should contain a valid UUID (not 00000000-...)
    expect(page.url()).not.toContain('00000000-0000-0000-0000-000000000001');
  });
});

test.describe('Landing Page Choice Modal', () => {
  test('should show choice modal when clicking Start Planning Free', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Find and click the main CTA button
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Should show the choice modal
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should display two options in choice modal', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Should have two options
    const demoOption = page.locator('.landing-choice-option--demo');
    const signupOption = page.locator('.landing-choice-option--signup');

    await expect(demoOption).toBeVisible();
    await expect(signupOption).toBeVisible();
  });

  test('should navigate to signup when Create Account is clicked', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Click Create Account option
    const signupOption = page.locator('.landing-choice-option--signup');
    await signupOption.click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Modal should be visible
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).toBeVisible();

    // Click on the overlay (outside the modal)
    const overlay = page.locator('.landing-choice-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });

    // Modal should be hidden
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Open the modal
    const ctaButton = page.getByRole('button', { name: /start planning free/i });
    await ctaButton.click();

    // Click close button
    const closeButton = page.locator('.landing-choice-close');
    await closeButton.click();

    // Modal should be hidden
    const modal = page.locator('.landing-choice-modal');
    await expect(modal).not.toBeVisible();
  });
});
