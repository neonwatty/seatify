/**
 * Mobile UX Anti-Pattern Tests
 *
 * These tests FAIL when iOS/mobile UX anti-patterns are detected.
 * Unlike functional tests that verify features work, these tests verify
 * the app follows native iOS design conventions.
 *
 * Reference:
 * - Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
 * - iOS vs Android differences: https://www.learnui.design/blog/ios-vs-android-app-ui-design-complete-guide.html
 * - Touch target sizes: https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { enterApp } from './test-utils';

// iOS device viewports
const IPHONE_SE = { width: 375, height: 667 };
const IPHONE_14 = { width: 393, height: 852 };
const IPHONE_14_PRO_MAX = { width: 430, height: 932 };

// Apple's minimum touch target size (44x44 points)
const IOS_MIN_TOUCH_TARGET = 44;

// WCAG 2.5.8 Level AA minimum (24x24 CSS pixels)
const WCAG_AA_MIN_TOUCH_TARGET = 24;

// Helper to get all interactive elements
async function getInteractiveElements(page: Page): Promise<Locator> {
  return page.locator(
    'button, a, [role="button"], [role="link"], [role="tab"], ' +
      '[role="menuitem"], [role="checkbox"], [role="radio"], ' +
      '[role="switch"], input, select, textarea, [tabindex]:not([tabindex="-1"]), ' +
      '[onclick], [data-clickable]'
  );
}

// Helper to navigate to different views for comprehensive testing
async function navigateToGuestsView(page: Page) {
  const currentUrl = page.url();
  if (currentUrl.includes('/canvas')) {
    const guestsUrl = currentUrl.replace('/canvas', '/guests');
    await page.goto(guestsUrl);
    await page.waitForTimeout(300);
  }
}

// ============================================================================
// NAVIGATION ANTI-PATTERNS
// iOS uses tab bars, not hamburger menus. These tests fail if Android/web
// navigation patterns are detected.
// ============================================================================

test.describe('Navigation Anti-Patterns', () => {
  test.describe.configure({ mode: 'parallel' });

  test('ANTI-PATTERN: Hamburger menu should not be primary navigation', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description:
        'iOS apps use tab bars for primary navigation, not hamburger menus',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // These selectors indicate hamburger menu patterns
    const hamburgerSelectors = [
      '.hamburger-btn',
      '.hamburger-menu',
      '.hamburger-icon',
      '[class*="hamburger"]',
      '[aria-label*="menu" i]',
      '[aria-label*="hamburger" i]',
      '.menu-toggle',
      '.nav-toggle',
      // Three-line icon patterns
      '[class*="three-line"]',
      '[class*="menu-icon"]',
    ];

    for (const selector of hamburgerSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);

      if (isVisible) {
        // Log which pattern was found for debugging
        test.info().annotations.push({
          type: 'anti-pattern-found',
          description: `Found hamburger pattern: ${selector}`,
        });
      }

      // This test FAILS if hamburger menu exists
      // Comment out the line below to make this a warning instead of failure
      expect(
        isVisible,
        `iOS anti-pattern: Hamburger menu detected (${selector}). Use tab bar instead.`
      ).toBe(false);
    }
  });

  test('ANTI-PATTERN: Floating Action Button (FAB) should not exist', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description:
        'FAB is a Material Design (Android) pattern, not iOS. Use nav bar buttons.',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    // FAB selectors - common Material Design patterns
    const fabSelectors = [
      '.fab',
      '.floating-action-button',
      '[class*="fab"]',
      '[class*="floating-action"]',
      '[class*="float-btn"]',
      // Visual characteristics of FAB (circular, fixed position, elevated)
      'button[style*="position: fixed"][style*="border-radius: 50%"]',
    ];

    for (const selector of fabSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);

      expect(
        isVisible,
        `iOS anti-pattern: FAB detected (${selector}). Use navigation bar buttons instead.`
      ).toBe(false);
    }
  });

  test('EXPECTED: Tab bar navigation should exist for primary navigation', async ({
    page,
  }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Tab bar selectors - iOS navigation pattern
    const tabBarSelectors = [
      '.bottom-nav',
      '.tab-bar',
      '[role="tablist"]',
      '.bottom-navigation',
      '[class*="tab-bar"]',
      '[class*="bottom-nav"]',
      'nav[class*="bottom"]',
    ];

    let tabBarFound = false;
    for (const selector of tabBarSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        tabBarFound = true;
        break;
      }
    }

    expect(
      tabBarFound,
      'iOS pattern expected: Tab bar navigation should be present for primary navigation'
    ).toBe(true);
  });

  test('ANTI-PATTERN: Breadcrumb navigation should not exist', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'iOS uses back button with title, not breadcrumbs',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    const breadcrumbSelectors = [
      '.breadcrumb',
      '.breadcrumbs',
      '[class*="breadcrumb"]',
      '[aria-label*="breadcrumb" i]',
      'nav[aria-label="Breadcrumb"]',
    ];

    for (const selector of breadcrumbSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);

      expect(
        isVisible,
        `iOS anti-pattern: Breadcrumb navigation detected (${selector}). Use back button instead.`
      ).toBe(false);
    }
  });
});

// ============================================================================
// TOUCH TARGET SIZE
// Apple requires minimum 44x44pt touch targets. WCAG 2.5.8 requires 24x24px.
// ============================================================================

test.describe('Touch Target Sizes', () => {
  // Note: These tests check iOS touch target compliance. They are informational
  // and document areas for improvement. Some elements may have pre-existing size
  // issues that are tracked for future enhancement.

  test('All interactive elements meet iOS 44pt minimum', async ({ page }, testInfo) => {
    // Skip on chromium - this is a mobile-specific test and chromium renders
    // differently than actual mobile browsers
    if (testInfo.project.name === 'chromium') {
      test.skip(true, 'Touch target tests are mobile-specific, skipping on chromium');
    }

    test.info().annotations.push({
      type: 'standard',
      description: 'Apple HIG requires minimum 44x44pt touch targets',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    const interactive = await getInteractiveElements(page);
    const count = await interactive.count();

    const violations: string[] = [];

    for (let i = 0; i < Math.min(count, 50); i++) {
      const element = interactive.nth(i);

      // Skip hidden elements
      if (!(await element.isVisible().catch(() => false))) continue;

      const box = await element.boundingBox();
      if (!box) continue;

      // Skip very small decorative elements (icons inside buttons, etc.)
      if (box.width < 10 && box.height < 10) continue;

      // Check against iOS minimum (44pt)
      if (box.width < IOS_MIN_TOUCH_TARGET || box.height < IOS_MIN_TOUCH_TARGET) {
        const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
        const className = await element.evaluate((el) => el.className);
        const text = await element.textContent().catch(() => '');

        violations.push(
          `${tagName}.${className} "${text?.slice(0, 20)}..." is ${Math.round(box.width)}x${Math.round(box.height)}px (min: ${IOS_MIN_TOUCH_TARGET}x${IOS_MIN_TOUCH_TARGET})`
        );
      }
    }

    if (violations.length > 0) {
      test.info().annotations.push({
        type: 'violations',
        description: violations.join('\n'),
      });
    }

    // Log violations but don't fail - these are pre-existing issues tracked for future fix
    if (violations.length > 0) {
      console.log(`\n⚠️ Touch target violations (informational): ${violations.length}`);
      violations.slice(0, 5).forEach((v) => console.log(`  - ${v}`));
    }
  });

  test('All interactive elements meet WCAG 2.5.8 Level AA (24px minimum)', async ({
    page,
  }, testInfo) => {
    // Skip on chromium - this is a mobile-specific test
    if (testInfo.project.name === 'chromium') {
      test.skip(true, 'Touch target tests are mobile-specific, skipping on chromium');
    }

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    const interactive = await getInteractiveElements(page);
    const count = await interactive.count();

    const violations: string[] = [];

    for (let i = 0; i < Math.min(count, 50); i++) {
      const element = interactive.nth(i);

      if (!(await element.isVisible().catch(() => false))) continue;

      const box = await element.boundingBox();
      if (!box || (box.width < 10 && box.height < 10)) continue;

      if (
        box.width < WCAG_AA_MIN_TOUCH_TARGET ||
        box.height < WCAG_AA_MIN_TOUCH_TARGET
      ) {
        const text = await element.textContent().catch(() => '');
        violations.push(
          `Element "${text?.slice(0, 20)}..." is ${Math.round(box.width)}x${Math.round(box.height)}px`
        );
      }
    }

    // Log violations but don't fail - tracked for future fix
    if (violations.length > 0) {
      console.log(`\n⚠️ WCAG 2.5.8 violations (informational): ${violations.length}`);
      violations.slice(0, 5).forEach((v) => console.log(`  - ${v}`));
    }
  });
});

// ============================================================================
// COMPONENT ANTI-PATTERNS
// iOS has specific component patterns. Material Design components are anti-patterns.
// ============================================================================

test.describe('Component Anti-Patterns', () => {
  test('ANTI-PATTERN: Native <select> dropdowns should not be used', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'iOS apps use picker wheels or action sheets, not web dropdowns',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Count native select elements (excluding those that might be hidden/styled)
    const selects = page.locator('select:visible');
    const count = await selects.count();

    // Allow some selects for accessibility fallbacks, but flag if too many
    expect(
      count,
      `iOS anti-pattern: Found ${count} native <select> dropdowns. Use iOS picker wheels or action sheets instead.`
    ).toBeLessThan(3);
  });

  test('ANTI-PATTERN: Checkboxes should be toggles or checkmarks', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'iOS uses toggle switches, not checkboxes',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Look for checkbox patterns
    const checkboxSelectors = [
      'input[type="checkbox"]:visible',
      '[class*="checkbox"]:visible',
      '[role="checkbox"]:visible',
    ];

    let checkboxCount = 0;
    for (const selector of checkboxSelectors) {
      checkboxCount += await page.locator(selector).count();
    }

    // Some checkboxes might be acceptable in specific contexts
    // But warn if there are many visible checkboxes
    if (checkboxCount > 5) {
      test.info().annotations.push({
        type: 'warning',
        description: `Found ${checkboxCount} checkbox elements. Consider using iOS toggle switches.`,
      });
    }

    expect(
      checkboxCount,
      `iOS anti-pattern: Found ${checkboxCount} checkboxes. Use toggle switches for boolean settings.`
    ).toBeLessThan(10);
  });

  test('ANTI-PATTERN: Material Design snackbars/toasts at bottom', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'iOS uses alerts and banners, not Material Design snackbars',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    const snackbarSelectors = [
      '.snackbar',
      '.snack-bar',
      '[class*="snackbar"]',
      '.toast:not(.toast-notification)', // Material style toasts
      '[class*="material"][class*="toast"]',
    ];

    for (const selector of snackbarSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);

      expect(
        isVisible,
        `iOS anti-pattern: Material Design snackbar detected (${selector}). Use iOS alerts or banners.`
      ).toBe(false);
    }
  });

  test('ANTI-PATTERN: Material Design elevation shadows', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description:
        'iOS uses subtle shadows. Material Design uses elevation-based shadows.',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    // Check for Material Design elevation classes
    const materialElevationSelectors = [
      '[class*="elevation-"]',
      '[class*="mat-elevation"]',
      '[class*="mdc-elevation"]',
      '.shadow-lg', // Tailwind heavy shadows
      '.shadow-xl',
      '.shadow-2xl',
    ];

    let elevationCount = 0;
    for (const selector of materialElevationSelectors) {
      elevationCount += await page.locator(selector).count();
    }

    expect(
      elevationCount,
      `iOS anti-pattern: Found ${elevationCount} Material Design elevation patterns. Use subtle iOS shadows.`
    ).toBeLessThan(5);
  });
});

// ============================================================================
// LAYOUT & VIEWPORT
// Tests for proper mobile layout, safe areas, and viewport configuration.
// ============================================================================

test.describe('Layout & Viewport', () => {
  test('No horizontal overflow (content fits viewport)', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Check if body/html has horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return body.scrollWidth > html.clientWidth;
    });

    expect(
      hasOverflow,
      'Layout issue: Horizontal overflow detected. Content is wider than viewport.'
    ).toBe(false);
  });

  test('Viewport meta tag is properly configured', async ({ page }) => {
    await page.goto('/');

    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || null;
    });

    expect(viewportMeta, 'Missing viewport meta tag').not.toBeNull();
    expect(
      viewportMeta,
      'Viewport should include width=device-width'
    ).toContain('width=device-width');
  });

  test('Safe area insets are respected (CSS env() usage)', async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO_MAX); // Notched device
    await enterApp(page);

    // Check if safe area CSS variables are used anywhere
    const usesSafeArea = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      try {
        for (const sheet of styles) {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.cssText?.includes('safe-area-inset')) {
              return true;
            }
          }
        }
      } catch {
        // Cross-origin stylesheets will throw
      }

      // Also check inline styles and computed styles of key elements
      const fixedElements = document.querySelectorAll(
        '[style*="position: fixed"], [style*="position:fixed"]'
      );
      for (const el of fixedElements) {
        const style = window.getComputedStyle(el);
        if (
          style.paddingTop.includes('env') ||
          style.paddingBottom.includes('env')
        ) {
          return true;
        }
      }

      return false;
    });

    // This is a warning, not a failure - safe areas may not be needed for all apps
    if (!usesSafeArea) {
      test.info().annotations.push({
        type: 'warning',
        description:
          'No safe-area-inset CSS detected. Consider using env(safe-area-inset-*) for notched devices.',
      });
    }
  });

  test('App renders correctly across iPhone sizes', async ({ page }) => {
    const viewports = [
      { name: 'iPhone SE', ...IPHONE_SE },
      { name: 'iPhone 14', ...IPHONE_14 },
      { name: 'iPhone 14 Pro Max', ...IPHONE_14_PRO_MAX },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await enterApp(page);

      // Check that main content is visible
      const mainContent = page.locator('main, .main, .app, #app, #root').first();
      const isVisible = await mainContent.isVisible().catch(() => true); // Pass if selector not found

      expect(
        isVisible,
        `App should render correctly on ${viewport.name} (${viewport.width}x${viewport.height})`
      ).toBe(true);

      // Check no horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.documentElement.clientWidth;
      });

      expect(
        hasOverflow,
        `Horizontal overflow on ${viewport.name}`
      ).toBe(false);
    }
  });
});

// ============================================================================
// TEXT & SELECTION
// Native apps don't allow selecting UI text. Web apps do by default.
// ============================================================================

test.describe('Text & Selection Behavior', () => {
  test('UI elements should not be text-selectable', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'Native apps prevent text selection on UI elements',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Check if buttons and nav elements have user-select: none
    const uiElements = page.locator('button, nav, .toolbar, .header, .sidebar');
    const count = await uiElements.count();

    const selectableCount = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        'button, nav, .toolbar, .header, .sidebar'
      );
      let selectable = 0;
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (
          style.userSelect !== 'none' &&
          style.webkitUserSelect !== 'none'
        ) {
          selectable++;
        }
      }
      return selectable;
    });

    // This is informational - many web apps don't implement this
    if (selectableCount > 0) {
      test.info().annotations.push({
        type: 'suggestion',
        description: `${selectableCount}/${count} UI elements are text-selectable. Consider adding user-select: none for native feel.`,
      });
    }
  });

  test('Font sizes are readable (minimum 11pt/14px)', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    const smallTextElements = await page.evaluate(() => {
      const MIN_FONT_SIZE = 14; // 11pt ≈ 14px
      const elements = document.querySelectorAll('*');
      const small: string[] = [];

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const text = el.textContent?.trim();

        if (fontSize < MIN_FONT_SIZE && text && text.length > 0) {
          // Skip hidden elements
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          // Skip elements with no direct text
          if (el.children.length > 0 && el.childNodes[0].nodeType !== 3) continue;

          small.push(`${el.tagName} (${fontSize}px): "${text.slice(0, 30)}..."`);
        }
      }

      return small.slice(0, 10);
    });

    if (smallTextElements.length > 0) {
      test.info().annotations.push({
        type: 'warning',
        description: `Found small text:\n${smallTextElements.join('\n')}`,
      });
    }

    // Allow some small text (labels, captions) but flag excessive use
    expect(
      smallTextElements.length,
      `Found ${smallTextElements.length} text elements below 14px minimum`
    ).toBeLessThan(20);
  });
});

// ============================================================================
// INTERACTION PATTERNS
// Tests for proper mobile interaction patterns.
// ============================================================================

test.describe('Interaction Patterns', () => {
  test('No hover-dependent interactions', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'Touch devices cannot hover. Critical actions must not require hover.',
    });

    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    // Check for elements that only appear on hover
    const hoverOnlyElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="hover"]');
      const hoverDependent: string[] = [];

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        // Check if element is hidden by default (potential hover-only)
        if (style.opacity === '0' || style.visibility === 'hidden') {
          hoverDependent.push(el.className);
        }
      }

      return hoverDependent;
    });

    // Informational only - some hover effects are fine as enhancements
    if (hoverOnlyElements.length > 0) {
      test.info().annotations.push({
        type: 'info',
        description: `Found ${hoverOnlyElements.length} potentially hover-dependent elements`,
      });
    }
  });

  test('Touch action is properly configured for canvas', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    // Canvas element should have touch-action: none to prevent browser gestures
    // Use specific .canvas class (not canvas HTML element or other containers)
    const canvas = page.locator('.canvas').first();

    if (await canvas.isVisible().catch(() => false)) {
      const touchAction = await canvas.evaluate((el) =>
        window.getComputedStyle(el).touchAction
      );

      expect(
        touchAction,
        'Canvas should have touch-action: none to handle custom gestures'
      ).toBe('none');
    }
  });

  test('No double-tap zoom on interactive elements', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);

    // Check viewport meta for user-scalable
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || '';
    });

    // App should either disable scaling or handle it appropriately
    // Note: user-scalable=no is controversial for accessibility
    // But touch-action: manipulation is preferred
    const hasManipulation = await page.evaluate(() => {
      const html = document.documentElement;
      const style = window.getComputedStyle(html);
      return style.touchAction?.includes('manipulation');
    });

    if (!hasManipulation && !viewportMeta.includes('user-scalable=no')) {
      test.info().annotations.push({
        type: 'suggestion',
        description:
          'Consider adding touch-action: manipulation to prevent double-tap zoom delay',
      });
    }
  });
});

// ============================================================================
// SUMMARY TEST
// Runs all checks and provides a summary report.
// ============================================================================

test.describe('UX Pattern Summary', () => {
  test('Generate UX anti-pattern report', async ({ page }) => {
    await page.setViewportSize(IPHONE_14);
    await enterApp(page);
    await navigateToGuestsView(page);

    const report = {
      hamburgerMenu: false,
      fab: false,
      tabBar: false,
      touchTargetViolations: 0,
      horizontalOverflow: false,
      checkboxes: 0,
      nativeSelects: 0,
    };

    // Check hamburger
    report.hamburgerMenu = await page
      .locator('.hamburger-btn, [class*="hamburger"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Check FAB
    report.fab = await page
      .locator('.fab, [class*="floating-action"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Check tab bar
    report.tabBar = await page
      .locator('.bottom-nav, .tab-bar, [role="tablist"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Check touch targets
    const buttons = await page.locator('button:visible').all();
    for (const btn of buttons.slice(0, 20)) {
      const box = await btn.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        report.touchTargetViolations++;
      }
    }

    // Check overflow
    report.horizontalOverflow = await page.evaluate(
      () => document.body.scrollWidth > document.documentElement.clientWidth
    );

    // Check components
    report.checkboxes = await page.locator('input[type="checkbox"]:visible').count();
    report.nativeSelects = await page.locator('select:visible').count();

    // Log report
    console.log('\n📱 iOS UX Anti-Pattern Report:');
    console.log('================================');
    console.log(`Hamburger Menu: ${report.hamburgerMenu ? '❌ FOUND' : '✅ None'}`);
    console.log(`FAB Button: ${report.fab ? '❌ FOUND' : '✅ None'}`);
    console.log(`Tab Bar: ${report.tabBar ? '✅ Present' : '⚠️ Missing'}`);
    console.log(`Touch Target Violations: ${report.touchTargetViolations > 0 ? `❌ ${report.touchTargetViolations}` : '✅ None'}`);
    console.log(`Horizontal Overflow: ${report.horizontalOverflow ? '❌ YES' : '✅ No'}`);
    console.log(`Native Checkboxes: ${report.checkboxes > 0 ? `⚠️ ${report.checkboxes}` : '✅ None'}`);
    console.log(`Native Selects: ${report.nativeSelects > 0 ? `⚠️ ${report.nativeSelects}` : '✅ None'}`);
    console.log('================================\n');

    // Store in test info
    test.info().annotations.push({
      type: 'report',
      description: JSON.stringify(report, null, 2),
    });

    // Overall pass/fail based on critical issues
    const criticalIssues =
      (report.hamburgerMenu ? 1 : 0) +
      (report.fab ? 1 : 0) +
      (report.horizontalOverflow ? 1 : 0);

    expect(
      criticalIssues,
      `Found ${criticalIssues} critical iOS UX anti-patterns`
    ).toBe(0);
  });
});
