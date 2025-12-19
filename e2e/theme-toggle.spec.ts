import { test, expect } from '@playwright/test';

// Helper to enter app from landing page
async function enterApp(page: import('@playwright/test').Page) {
  // First set localStorage before the app hydrates
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 10 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 9;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

test.describe('Theme toggle functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set hasCompletedOnboarding but preserve any other data that may exist
    await page.addInitScript(() => {
      const stored = localStorage.getItem('seating-arrangement-storage');
      const data = stored ? JSON.parse(stored) : { state: {}, version: 10 };
      data.state = data.state || {};
      data.state.hasCompletedOnboarding = true;
      data.version = 9;
      localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
    });
    // Clear only on first navigation to ensure fresh state per test
    await page.goto('/');
    await page.evaluate(() => {
      // Clear localStorage but keep onboarding completion
      const data = { state: { hasCompletedOnboarding: true }, version: 10 };
      localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
    });
    await page.click('button:has-text("Start Planning")');
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
  });

  test('theme toggle button is visible in header', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');
    await expect(themeBtn).toBeVisible();
  });

  test('clicking theme button cycles through themes: system -> light -> dark -> system', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');
    const html = page.locator('html');

    // Initial state should be system (no data-theme attribute)
    await expect(html).not.toHaveAttribute('data-theme');

    // First click: system -> light
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Second click: light -> dark
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Third click: dark -> system (attribute removed)
    await themeBtn.click();
    await expect(html).not.toHaveAttribute('data-theme');
  });

  test('theme button shows correct icon for each theme', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');

    // System mode shows gear icon (⚙)
    await expect(themeBtn).toContainText('⚙');

    // Click to light mode - shows sun (☀)
    await themeBtn.click();
    await expect(themeBtn).toContainText('☀');

    // Click to dark mode - shows moon (☽)
    await themeBtn.click();
    await expect(themeBtn).toContainText('☽');

    // Click back to system - shows gear again
    await themeBtn.click();
    await expect(themeBtn).toContainText('⚙');
  });

  test('theme preference persists after page reload', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');
    const html = page.locator('html');

    // Set to dark mode
    await themeBtn.click(); // light
    await themeBtn.click(); // dark
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Reload the page and re-enter the app (navigate to root to clear hash route)
    await page.goto('/');
    await page.click('button:has-text("Start Planning Free")');
    await page.waitForURL(/\/#\/events/);
    await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });

    // Theme should still be dark (persisted in localStorage)
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('light theme applies light background colors', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');

    // Set to light mode
    await themeBtn.click();

    // Check that a light background is applied
    const header = page.locator('.header');
    const bgColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Light mode header background should be light (high RGB values)
    // The rgba value for light mode is rgba(255, 252, 250, 0.85)
    expect(bgColor).toMatch(/rgba?\(\s*2[0-5][0-9]\s*,/);
  });

  test('dark theme applies dark background colors', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');

    // Set to dark mode
    await themeBtn.click(); // light
    await themeBtn.click(); // dark

    // Check that a dark background is applied
    const header = page.locator('.header');
    const bgColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Dark mode header background should be dark (low RGB values)
    // The rgba value for dark mode is rgba(26, 20, 18, 0.9)
    expect(bgColor).toMatch(/rgba?\(\s*[0-5][0-9]\s*,/);
  });

  test('theme button has appropriate title/tooltip for each state', async ({ page }) => {
    const themeBtn = page.locator('.theme-btn');

    // System mode
    await expect(themeBtn).toHaveAttribute('title', 'System theme (click for light)');

    // Light mode
    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute('title', 'Light mode (click for dark)');

    // Dark mode
    await themeBtn.click();
    await expect(themeBtn).toHaveAttribute('title', 'Dark mode (click for system)');
  });
});

test.describe('Theme toggle with emulated color scheme', () => {
  test('system theme respects prefers-color-scheme: dark', async ({ page }) => {
    // Emulate dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });

    await enterApp(page);

    const html = page.locator('html');
    // System mode - no data-theme attribute, relies on media query
    await expect(html).not.toHaveAttribute('data-theme');

    // The app should render in dark mode due to emulated preference
    // Check CSS variables are applied correctly
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });

    // Dark mode --color-bg is #1a1412
    expect(bgColor).toBe('#1a1412');
  });

  test('system theme respects prefers-color-scheme: light', async ({ page }) => {
    // Emulate light color scheme preference
    await page.emulateMedia({ colorScheme: 'light' });

    await enterApp(page);

    const html = page.locator('html');
    // System mode - no data-theme attribute
    await expect(html).not.toHaveAttribute('data-theme');

    // Check CSS variables are applied correctly for light mode
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });

    // Light mode --color-bg is #fffcfa
    expect(bgColor).toBe('#fffcfa');
  });

  test('manual dark theme overrides system light preference', async ({ page }) => {
    // Emulate light color scheme preference
    await page.emulateMedia({ colorScheme: 'light' });

    await enterApp(page);

    const themeBtn = page.locator('.theme-btn');
    const html = page.locator('html');

    // Set to dark mode manually
    await themeBtn.click(); // light
    await themeBtn.click(); // dark

    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Check that dark mode CSS is applied despite system light preference
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });

    // Dark mode --color-bg should be #1a1412
    expect(bgColor).toBe('#1a1412');
  });

  test('manual light theme overrides system dark preference', async ({ page }) => {
    // Emulate dark color scheme preference
    await page.emulateMedia({ colorScheme: 'dark' });

    await enterApp(page);

    const themeBtn = page.locator('.theme-btn');
    const html = page.locator('html');

    // Set to light mode manually
    await themeBtn.click(); // light

    await expect(html).toHaveAttribute('data-theme', 'light');

    // Check that light mode CSS is applied despite system dark preference
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });

    // Light mode --color-bg should be #fffcfa
    expect(bgColor).toBe('#fffcfa');
  });
});
