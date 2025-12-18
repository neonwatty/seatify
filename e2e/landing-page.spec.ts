import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Hero Section', () => {
    test('displays TableCraft logo with correct branding', async ({ page }) => {
      const logo = page.locator('.landing-logo');
      await expect(logo).toBeVisible();
      await expect(logo.locator('.logo-table')).toHaveText('Table');
      await expect(logo.locator('.logo-craft')).toHaveText('Craft');
    });

    test('displays tagline and description', async ({ page }) => {
      await expect(page.locator('.landing-tagline')).toHaveText('Event Seating Made Simple');
      await expect(page.locator('.landing-description')).toContainText('Design floor plans');
      await expect(page.locator('.landing-description')).toContainText('smart optimization');
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
      await expect(page.locator('.email-capture h2')).toHaveText('Stay in the loop');
    });

    test('displays email description', async ({ page }) => {
      await expect(page.locator('.email-description')).toContainText('notified about new features');
    });

    test('subscribe button is visible with correct text', async ({ page }) => {
      const subscribeBtn = page.locator('.subscribe-button');
      await expect(subscribeBtn).toBeVisible();
      await expect(subscribeBtn).toHaveText('Subscribe for Updates');
    });

    test('subscribe button links to Google Form', async ({ page }) => {
      const subscribeBtn = page.locator('.subscribe-button');
      const href = await subscribeBtn.getAttribute('href');
      expect(href).toContain('docs.google.com/forms');
    });

    test('subscribe button opens in new tab', async ({ page }) => {
      const subscribeBtn = page.locator('.subscribe-button');
      await expect(subscribeBtn).toHaveAttribute('target', '_blank');
      await expect(subscribeBtn).toHaveAttribute('rel', 'noopener noreferrer');
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
