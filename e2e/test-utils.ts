import { Page, expect } from '@playwright/test';

// Mobile breakpoint matches useIsMobile hook: window.innerWidth < 768
const MOBILE_BREAKPOINT = 768;

/**
 * Check if the current page viewport is in mobile mode
 */
export async function isMobileViewport(page: Page): Promise<boolean> {
  const viewportSize = page.viewportSize();
  return viewportSize ? viewportSize.width < MOBILE_BREAKPOINT : false;
}

/**
 * Enter the app from landing page, bypassing onboarding
 */
export async function enterApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 10 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 10;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning")');
  await expect(page.locator('.header')).toBeVisible({ timeout: 5000 });
}

/**
 * Open the mobile hamburger menu (only needed on mobile)
 */
export async function openMobileMenu(page: Page): Promise<void> {
  const hamburger = page.locator('.hamburger-btn');
  await hamburger.click();
  await expect(page.locator('.mobile-menu-sheet')).toBeVisible();
  // Wait for animation to complete
  await page.waitForTimeout(200);
}

/**
 * Close the mobile menu if open
 */
export async function closeMobileMenu(page: Page): Promise<void> {
  const menuSheet = page.locator('.mobile-menu-sheet');
  if (await menuSheet.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(menuSheet).not.toBeVisible();
  }
}

/**
 * Click "Add Table" and select a table shape.
 * On desktop: clicks dropdown button, then menu item
 * On mobile: opens hamburger menu, clicks Add Table, then selects shape
 */
export async function addTable(page: Page, shape: 'round' | 'rectangle' = 'round'): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    // Open mobile menu
    await openMobileMenu(page);

    // Click "Add Table" to show submenu
    await page.locator('.menu-item:has-text("Add Table")').click();

    // Select the shape
    const shapeText = shape === 'round' ? 'Round Table' : 'Rectangle Table';
    await page.locator(`.menu-item:has-text("${shapeText}")`).click();
  } else {
    // Desktop: use dropdown
    const addTableBtn = page.locator('button:has-text("Add Table")').first();
    await addTableBtn.click();
    await expect(page.locator('.dropdown-menu')).toBeVisible({ timeout: 3000 });

    const menuText = shape === 'round' ? 'Round' : 'Rectangle';
    await page.locator(`.dropdown-menu button:has-text("${menuText}")`).click();
  }
}

/**
 * Click the "Add Guest" button.
 * On mobile: opens hamburger menu first
 */
export async function clickAddGuest(page: Page): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    await openMobileMenu(page);
    await page.locator('.menu-item:has-text("Add Guest")').click();
  } else {
    await page.locator('button:has-text("Add Guest")').first().click();
  }
}

/**
 * Switch to a different view (Canvas or Guest List).
 * On mobile: uses bottom nav or menu
 * On desktop: uses toolbar buttons
 */
export async function switchView(page: Page, view: 'canvas' | 'guests'): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    // Use bottom nav buttons for quick view switching
    if (view === 'canvas') {
      await page.locator('.bottom-nav-item:has-text("Canvas")').click();
    } else {
      await page.locator('.bottom-nav-item:has-text("Guests")').click();
    }
  } else {
    // Desktop: use toolbar buttons
    if (view === 'canvas') {
      await page.click('button:has-text("Canvas")');
    } else {
      await page.click('button:has-text("Guest List")');
    }
  }
  await page.waitForTimeout(300);
}

/**
 * Click the "Import" button.
 * On mobile: opens hamburger menu first
 */
export async function clickImport(page: Page): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    await openMobileMenu(page);
    await page.locator('.menu-item:has-text("Import")').click();
  } else {
    await page.locator('button:has-text("Import")').click();
  }
}

/**
 * Toggle the relationships panel.
 * On mobile: opens hamburger menu first, uses toggle
 * On desktop: clicks toolbar button
 */
export async function toggleRelationships(page: Page): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    await openMobileMenu(page);
    await page.locator('.menu-item:has-text("Show Relationships")').click();
    // Menu stays open for toggles - close it
    await closeMobileMenu(page);
  } else {
    await page.click('button:has-text("Relationships")');
  }
}

/**
 * Open the import wizard modal.
 * Handles navigation and button clicking for both mobile and desktop.
 */
export async function openImportWizard(page: Page): Promise<void> {
  await enterApp(page);

  // Navigate to Guest List view first
  await switchView(page, 'guests');

  // Click Import button
  await clickImport(page);

  // Wait for wizard modal to appear
  await expect(page.locator('.import-wizard-modal')).toBeVisible({ timeout: 3000 });
}

/**
 * Add a guest and verify it was created
 */
export async function addGuestAndWait(page: Page): Promise<void> {
  const initialCount = await page.locator('.canvas-guest').count() + await page.locator('.seat-guest').count();

  await clickAddGuest(page);
  await page.waitForTimeout(500);

  // Verify a guest was added
  const finalCount = await page.locator('.canvas-guest').count() + await page.locator('.seat-guest').count();
  expect(finalCount).toBeGreaterThan(initialCount);
}

/**
 * Helper to determine if grid controls are visible.
 * On mobile, grid controls may be hidden or in the menu.
 */
export async function isGridControlsVisible(page: Page): Promise<boolean> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    // Grid controls are not shown directly on mobile
    return false;
  }

  return await page.locator('.grid-controls').isVisible();
}

/**
 * Toggle grid controls visibility on mobile via menu
 */
export async function toggleGridControlsMobile(page: Page): Promise<void> {
  const isMobile = await isMobileViewport(page);

  if (isMobile) {
    await openMobileMenu(page);
    await page.locator('.menu-item:has-text("Grid Controls")').click();
  }
}
