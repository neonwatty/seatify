import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = 'storyboards/screenshots';
const BASE_URL = 'http://localhost:5173/seating-arrangement';

// Demo data to inject into localStorage
const DEMO_EVENT = {
  id: 'demo-event',
  name: "Sarah & John's Wedding",
  type: 'wedding',
  date: '2025-06-15',
  tables: [
    { id: 't1', name: 'Head Table', shape: 'rectangle', capacity: 10, x: 400, y: 100, guests: ['g1', 'g2'] },
    { id: 't2', name: 'Table 1', shape: 'round', capacity: 8, x: 200, y: 300, guests: ['g3', 'g4', 'g5', 'g6'] },
    { id: 't3', name: 'Table 2', shape: 'round', capacity: 8, x: 500, y: 300, guests: ['g7', 'g8'] },
  ],
  guests: [
    { id: 'g1', name: 'Sarah Mitchell', group: 'Wedding Party', rsvpStatus: 'confirmed' },
    { id: 'g2', name: 'John Anderson', group: 'Wedding Party', rsvpStatus: 'confirmed' },
    { id: 'g3', name: 'Emily Mitchell', group: "Bride's Family", rsvpStatus: 'confirmed' },
    { id: 'g4', name: 'Robert Mitchell', group: "Bride's Family", rsvpStatus: 'confirmed' },
    { id: 'g5', name: 'Amanda Chen', group: 'Friends', rsvpStatus: 'pending' },
    { id: 'g6', name: 'Michael Chen', group: 'Friends', rsvpStatus: 'confirmed' },
    { id: 'g7', name: 'David Thompson', group: "Groom's Family", rsvpStatus: 'confirmed' },
    { id: 'g8', name: 'Lisa Thompson', group: "Groom's Family", rsvpStatus: 'confirmed' },
    { id: 'g9', name: 'Uncle Bob', group: "Groom's Family", rsvpStatus: 'confirmed', tableId: null },
    { id: 'g10', name: 'Uncle Frank', group: "Bride's Family", rsvpStatus: 'confirmed', tableId: null },
  ]
};

async function captureScreenshot(page: Page, filename: string, description: string) {
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`✓ Captured: ${filename} - ${description}`);
}

async function captureScreenshots() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Starting screenshot capture...\n');

  // 1. Landing page
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await captureScreenshot(page, '01-landing.png', 'Landing page');

  // 2. Click Start Planning Free to enter app
  await page.click('text=Start Planning Free');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Handle onboarding overlay if present
  const dismissOnboarding = async () => {
    try {
      // Try various ways to dismiss onboarding
      const skipButton = page.locator('text=Skip, text=Got it, text=Close, text=Dismiss, button:has-text("×")').first();
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(300);
      }
      // Also try clicking outside the overlay
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      // Try clicking the overlay background
      const overlay = page.locator('.onboarding-overlay, [class*="overlay"]').first();
      if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
        await page.click('body', { position: { x: 10, y: 10 }, force: true });
        await page.waitForTimeout(300);
      }
    } catch (e) {
      // Ignore errors, onboarding might not be present
    }
  };

  await dismissOnboarding();
  await captureScreenshot(page, '01-events-page.png', 'Events page');

  // 3. Click Create Event
  try {
    await dismissOnboarding();
    await page.click('text=Create Event', { timeout: 3000, force: true });
    await page.waitForTimeout(500);
    await captureScreenshot(page, '01-create-event-dialog.png', 'Create event dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch (e) {
    console.log('  (Create Event button not found, skipping)');
  }

  // 4. If there's an existing event, click on it
  await dismissOnboarding();
  const eventCard = page.locator('.event-card, [class*="EventCard"]').first();
  if (await eventCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await eventCard.click({ force: true });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await dismissOnboarding();
  }

  // 5. Canvas/Floor Plan view
  await captureScreenshot(page, '02-canvas-view.png', 'Canvas/Floor Plan view');

  // 6. Try to click Dashboard
  try {
    await dismissOnboarding();
    await page.click('text=Dashboard', { timeout: 2000, force: true });
    await page.waitForTimeout(500);
    await dismissOnboarding();
    await captureScreenshot(page, '01-dashboard.png', 'Dashboard view');
  } catch (e) {
    console.log('  (Dashboard not found)');
  }

  // 7. Try to click Guests
  try {
    await dismissOnboarding();
    await page.click('text=Guests', { timeout: 2000, force: true });
    await page.waitForTimeout(500);
    await dismissOnboarding();
    await captureScreenshot(page, '03-guests-view.png', 'Guests view');
  } catch (e) {
    console.log('  (Guests not found)');
  }

  // 8. Go back to Canvas
  try {
    await dismissOnboarding();
    await page.click('text=Canvas', { timeout: 2000, force: true });
    await page.waitForTimeout(500);
  } catch (e) {
    try {
      await page.click('text=Floor Plan', { timeout: 2000, force: true });
      await page.waitForTimeout(500);
    } catch (e2) {
      console.log('  (Canvas/Floor Plan not found)');
    }
  }

  await dismissOnboarding();
  await captureScreenshot(page, '02-floor-plan-tables.png', 'Floor plan with tables');

  await browser.close();

  console.log('\n✅ Screenshot capture complete!');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}/`);

  // List captured files
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`\nCaptured ${files.length} screenshots:`);
  files.forEach(f => console.log(`  - ${f}`));
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
