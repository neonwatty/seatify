import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Hero Section', () => {
    test('displays Seatify logo with correct branding', async ({ page }) => {
      const logo = page.locator('.landing-logo');
      await expect(logo).toBeVisible();
      await expect(logo.locator('.logo-seat')).toHaveText('Seat');
      await expect(logo.locator('.logo-ify')).toHaveText('ify');
    });

    test('displays tagline and description', async ({ page }) => {
      await expect(page.locator('.landing-tagline')).toHaveText('Free Seating Chart Maker for Weddings & Events');
      await expect(page.locator('.landing-description')).toContainText('drag-and-drop');
      await expect(page.locator('.landing-description')).toContainText('seating plan generator');
    });

    test('CTA button is visible and clickable', async ({ page }) => {
      const ctaButton = page.locator('.cta-button');
      await expect(ctaButton).toBeVisible();
      await expect(ctaButton).toHaveText('Start Planning Free');
    });

    test('CTA button navigates to app', async ({ page }) => {
      await page.click('.cta-button');
      // Should navigate away from landing page
      await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Feature Cards Section', () => {
    test('displays three feature cards', async ({ page }) => {
      const featureCards = page.locator('.feature-card');
      await expect(featureCards).toHaveCount(3);
    });

    test('Smart Seating feature card has correct content', async ({ page }) => {
      const smartSeating = page.locator('.feature-card').filter({ hasText: 'Smart Seating' });
      await expect(smartSeating).toBeVisible();
      await expect(smartSeating).toContainText('partners together');
      await expect(smartSeating).toContainText('optimizer');
    });

    test('Visual Floor Plans feature card has correct content', async ({ page }) => {
      const floorPlans = page.locator('.feature-card').filter({ hasText: 'Visual Floor Plans' });
      await expect(floorPlans).toBeVisible();
      await expect(floorPlans).toContainText('Drag-and-drop');
      await expect(floorPlans).toContainText('stages, bars');
    });

    test('Works Everywhere feature card has correct content', async ({ page }) => {
      const worksEverywhere = page.locator('.feature-card').filter({ hasText: 'Works Everywhere' });
      await expect(worksEverywhere).toBeVisible();
      await expect(worksEverywhere).toContainText('Phone, tablet, or desktop');
      await expect(worksEverywhere).toContainText('private');
    });
  });

  test.describe('Use Cases Section', () => {
    test('displays all five use case tags', async ({ page }) => {
      const useCaseTags = page.locator('.use-case-tag');
      await expect(useCaseTags).toHaveCount(5);
    });

    test('shows correct use case categories', async ({ page }) => {
      await expect(page.locator('.use-case-tag').filter({ hasText: 'Weddings' })).toBeVisible();
      await expect(page.locator('.use-case-tag').filter({ hasText: 'Corporate Dinners' })).toBeVisible();
      await expect(page.locator('.use-case-tag').filter({ hasText: 'Galas' })).toBeVisible();
      await expect(page.locator('.use-case-tag').filter({ hasText: 'Team Offsites' })).toBeVisible();
      await expect(page.locator('.use-case-tag').filter({ hasText: 'Private Parties' })).toBeVisible();
    });
  });

  test.describe('Coming Soon Section', () => {
    test('displays coming soon header', async ({ page }) => {
      await expect(page.locator('.coming-soon-header h2')).toHaveText('Coming Soon...');
    });

    test('displays two coming soon feature cards', async ({ page }) => {
      const comingSoonCards = page.locator('.coming-soon-card');
      await expect(comingSoonCards).toHaveCount(2);
    });

    test('AI-Powered Seating card has correct content', async ({ page }) => {
      const aiCard = page.locator('.coming-soon-card').filter({ hasText: 'AI-Powered Seating' });
      await expect(aiCard).toBeVisible();
      await expect(aiCard).toContainText('algorithms');
      await expect(aiCard).toContainText('optimal arrangements');
    });

    test('Guest Import & RSVP card has correct content', async ({ page }) => {
      const importCard = page.locator('.coming-soon-card').filter({ hasText: 'Guest Import' });
      await expect(importCard).toBeVisible();
      await expect(importCard).toContainText('favorite planning tools');
      await expect(importCard).toContainText('track responses');
    });
  });

  test.describe('Email Capture Section', () => {
    test('displays email capture heading', async ({ page }) => {
      await expect(page.locator('.email-capture h2')).toHaveText('Get Updates');
    });

    test('displays email description', async ({ page }) => {
      await expect(page.locator('.email-description')).toContainText('ship something new');
    });

    test('subscribe button is visible with correct text', async ({ page }) => {
      const subscribeBtn = page.locator('.subscribe-button');
      await expect(subscribeBtn).toBeVisible();
      await expect(subscribeBtn).toHaveText('Subscribe for Updates');
    });

    test('subscribe button opens email capture modal', async ({ page }) => {
      const subscribeBtn = page.locator('.subscribe-button');
      await subscribeBtn.click();

      // Modal should appear
      const modal = page.locator('.email-capture-modal');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h2')).toHaveText('Get Updates');
    });
  });

  test.describe('Email Capture Modal', () => {
    test.beforeEach(async ({ page }) => {
      // Open the modal before each test
      await page.locator('.subscribe-button').click();
      await expect(page.locator('.email-capture-modal')).toBeVisible();
    });

    test('modal displays email input field', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });

    test('modal displays description text', async ({ page }) => {
      const description = page.locator('.email-capture-modal .modal-description');
      await expect(description).toContainText('ship something new');
    });

    test('modal has cancel and subscribe buttons', async ({ page }) => {
      await expect(page.locator('.email-capture-modal .btn-cancel')).toHaveText('Maybe Later');
      await expect(page.locator('.email-capture-modal .btn-submit')).toHaveText('Subscribe');
    });

    test('close button closes modal', async ({ page }) => {
      const closeBtn = page.locator('.email-capture-modal .close-btn');
      await closeBtn.click();
      await expect(page.locator('.email-capture-modal')).not.toBeVisible();
    });

    test('cancel button closes modal', async ({ page }) => {
      const cancelBtn = page.locator('.email-capture-modal .btn-cancel');
      await cancelBtn.click();
      await expect(page.locator('.email-capture-modal')).not.toBeVisible();
    });

    test('clicking overlay closes modal', async ({ page }) => {
      // Click on the overlay (outside the modal)
      await page.locator('.email-capture-modal-overlay').click({ position: { x: 10, y: 10 } });
      await expect(page.locator('.email-capture-modal')).not.toBeVisible();
    });

    test('email input is required', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('email input auto-focuses on modal open', async ({ page }) => {
      // Wait a moment for auto-focus
      await page.waitForTimeout(200);
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await expect(emailInput).toBeFocused();
    });

    test('shows loading state on submit', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await emailInput.fill('test@example.com');

      // Use a promise to control when the route completes
      let resolveRoute: () => void;
      const routePromise = new Promise<void>(resolve => { resolveRoute = resolve; });

      // Intercept the Formspree request - hold it until we verify loading state
      await page.route('**/formspree.io/**', async (route) => {
        await routePromise;
        await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      });

      const submitBtn = page.locator('.email-capture-modal .btn-submit');
      await submitBtn.click();

      // Should show loading state
      await expect(submitBtn).toContainText('Subscribing...');
      await expect(page.locator('.email-capture-modal .spinner')).toBeVisible();

      // Release the route and cleanup
      resolveRoute!();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test('shows success state after submission', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await emailInput.fill('test@example.com');

      // Mock successful Formspree response
      await page.route('**/formspree.io/**', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      });

      await page.locator('.email-capture-modal .btn-submit').click();

      // Should show success state
      const successState = page.locator('.email-capture-modal .success-state');
      await expect(successState).toBeVisible();
      await expect(successState.locator('h2')).toHaveText("You're subscribed!");
      await expect(page.locator('.email-capture-modal .success-icon')).toBeVisible();
    });

    test('modal auto-closes after success', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await emailInput.fill('test@example.com');

      // Mock successful Formspree response
      await page.route('**/formspree.io/**', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      });

      await page.locator('.email-capture-modal .btn-submit').click();

      // Wait for success state
      await expect(page.locator('.email-capture-modal .success-state')).toBeVisible();

      // Modal should auto-close after ~2 seconds
      await expect(page.locator('.email-capture-modal')).not.toBeVisible({ timeout: 3000 });
    });

    test('shows error toast on submission failure', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await emailInput.fill('test@example.com');

      // Mock failed Formspree response
      await page.route('**/formspree.io/**', async (route) => {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      });

      await page.locator('.email-capture-modal .btn-submit').click();

      // Should show error toast
      await expect(page.locator('.toast-error')).toBeVisible();
      await expect(page.locator('.toast-error')).toContainText('Failed to subscribe');

      // Modal should remain open
      await expect(page.locator('.email-capture-modal')).toBeVisible();
    });

    test('prevents submission with invalid email', async ({ page }) => {
      const emailInput = page.locator('.email-capture-modal input[type="email"]');
      await emailInput.fill('invalid-email');

      const submitBtn = page.locator('.email-capture-modal .btn-submit');
      await submitBtn.click();

      // Modal should still be visible (HTML5 validation prevents submission)
      await expect(page.locator('.email-capture-modal')).toBeVisible();
    });
  });

  test.describe('Footer Section', () => {
    test('displays trust line about data privacy', async ({ page }) => {
      const trustLine = page.locator('.trust-line');
      await expect(trustLine).toBeVisible();
      await expect(trustLine).toContainText('data stays private');
      await expect(trustLine).toContainText('locally in your browser');
    });

    test('displays version tag', async ({ page }) => {
      const versionTag = page.locator('.version-tag');
      await expect(versionTag).toBeVisible();
      await expect(versionTag).toContainText('v');
    });

    test('displays updates button', async ({ page }) => {
      await expect(page.locator('.footer-meta .updates-btn')).toBeVisible();
    });
  });

  test.describe('Updates Popup', () => {
    test.beforeEach(async ({ page }) => {
      // Click the updates button to open the popup
      await page.locator('.footer-meta .updates-btn').click();
      await expect(page.locator('.updates-popup')).toBeVisible();
    });

    test('displays What\'s New header', async ({ page }) => {
      await expect(page.locator('.updates-header h2')).toHaveText("What's New");
    });

    test('displays subscribe link in footer for non-subscribed users', async ({ page }) => {
      const subscribeLink = page.locator('.updates-subscribe-link');
      await expect(subscribeLink).toBeVisible();
      await expect(subscribeLink).toHaveText('Get notified of new updates');
    });

    test('subscribe link opens email capture modal', async ({ page }) => {
      const subscribeLink = page.locator('.updates-subscribe-link');
      await subscribeLink.click();

      // Modal should appear (use first() in case of duplicate modals)
      const modal = page.locator('.email-capture-modal').first();
      await expect(modal).toBeVisible();
      await expect(modal.locator('h2')).toHaveText('Get Updates');
    });

    test('close button closes popup', async ({ page }) => {
      await page.locator('.updates-close').click();
      await expect(page.locator('.updates-popup')).not.toBeVisible();
    });

    test('hides subscribe link for subscribed users', async ({ page }) => {
      // Close the popup first
      await page.locator('.updates-close').click();

      // Set user as subscribed
      await page.evaluate(() => {
        localStorage.setItem('seatify_email_capture', JSON.stringify({
          hasSubscribed: true,
          dismissCount: 0,
          lastDismissed: null,
          triggersShown: { guestMilestone: false, optimizerSuccess: false, exportAttempt: false }
        }));
      });

      // Reload page to pick up new localStorage state
      await page.reload();
      await page.locator('.footer-meta .updates-btn').click();
      await expect(page.locator('.updates-popup')).toBeVisible();

      // Subscribe link should not be visible
      await expect(page.locator('.updates-subscribe-link')).not.toBeVisible();
    });
  });

  test.describe('Preview Demo Animation', () => {
    test('demo container is visible', async ({ page }) => {
      await expect(page.locator('.demo-container')).toBeVisible();
    });

    test('demo table is displayed', async ({ page }) => {
      await expect(page.locator('.demo-table')).toBeVisible();
    });
  });
});

test.describe('Landing Page - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('landing page is scrollable on mobile', async ({ page }) => {
    await page.goto('/');

    // Page should be visible
    await expect(page.locator('.landing-page')).toBeVisible();

    // CTA should be visible
    await expect(page.locator('.cta-button')).toBeVisible();
  });

  test('feature cards stack vertically on mobile', async ({ page }) => {
    await page.goto('/');

    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);

    // All cards should be visible (stacked)
    for (let i = 0; i < 3; i++) {
      await expect(featureCards.nth(i)).toBeVisible();
    }
  });

  test('use case tags are visible on mobile', async ({ page }) => {
    await page.goto('/');

    // At least some use case tags should be visible
    const useCaseTags = page.locator('.use-case-tag');
    await expect(useCaseTags.first()).toBeVisible();
  });

  test('subscribe button is visible on mobile', async ({ page }) => {
    await page.goto('/');

    // Scroll to email capture section
    await page.locator('.email-capture').scrollIntoViewIfNeeded();
    await expect(page.locator('.subscribe-button')).toBeVisible();
  });

  test('email capture modal opens and works on mobile', async ({ page }) => {
    await page.goto('/');

    // Scroll to and click subscribe button
    await page.locator('.email-capture').scrollIntoViewIfNeeded();
    await page.locator('.subscribe-button').click();

    // Modal should appear
    const modal = page.locator('.email-capture-modal');
    await expect(modal).toBeVisible();

    // Close button should work
    await modal.locator('.close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('CTA button navigates to app on mobile', async ({ page }) => {
    await page.goto('/');

    await page.click('.cta-button');
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Landing Page - Tablet Responsive', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('landing page displays correctly on tablet', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.landing-logo')).toBeVisible();
    await expect(page.locator('.cta-button')).toBeVisible();
    await expect(page.locator('.feature-card')).toHaveCount(3);
  });
});
