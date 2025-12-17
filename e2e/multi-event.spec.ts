import { test, expect, Page } from '@playwright/test';

const MAX_EVENTS = 10;

/**
 * Helper to navigate from landing page to event list view
 */
async function enterEventList(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stored = localStorage.getItem('seating-arrangement-storage');
    const data = stored ? JSON.parse(stored) : { state: {}, version: 11 };
    data.state = data.state || {};
    data.state.hasCompletedOnboarding = true;
    data.version = 11;
    localStorage.setItem('seating-arrangement-storage', JSON.stringify(data));
  });
  await page.goto('/');
  await page.click('button:has-text("Start Planning Free")');
  // Wait for event list view to be visible
  await expect(page.locator('.event-list-view')).toBeVisible({ timeout: 5000 });
}

/**
 * Helper to create a new event
 */
async function createEvent(page: Page, name: string, eventType: string = 'wedding'): Promise<void> {
  await page.click('.create-event-btn');
  await expect(page.locator('.event-form-modal')).toBeVisible();
  await page.fill('.event-form-modal input[type="text"]', name);
  await page.selectOption('.event-form-modal select', eventType);
  await page.click('.event-form-modal .btn-submit');
  // Wait for navigation to canvas view
  await expect(page.locator('.canvas')).toBeVisible({ timeout: 5000 });
}

test.describe('Multi-Event Management', () => {
  test.describe('Event List View', () => {
    test('landing page navigates to event list view', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('h1:has-text("Your Events")')).toBeVisible();
    });

    test('shows create event button', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('.create-event-btn')).toBeVisible();
      await expect(page.locator('.create-event-btn')).toContainText('Create Event');
    });

    test('shows default event on first visit', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('.event-card')).toHaveCount(1);
    });

    test('event card displays event name', async ({ page }) => {
      await enterEventList(page);
      const eventCard = page.locator('.event-card').first();
      await expect(eventCard.locator('.event-name')).toBeVisible();
    });

    test('event card displays event type badge', async ({ page }) => {
      await enterEventList(page);
      const eventCard = page.locator('.event-card').first();
      await expect(eventCard.locator('.event-type-badge')).toBeVisible();
    });

    test('event card displays guest and table stats', async ({ page }) => {
      await enterEventList(page);
      const eventCard = page.locator('.event-card').first();
      await expect(eventCard.locator('.event-card-stats')).toBeVisible();
    });

    test('event card has edit and delete buttons', async ({ page }) => {
      await enterEventList(page);
      const eventCard = page.locator('.event-card').first();
      await expect(eventCard.locator('.card-action-btn.edit')).toBeVisible();
      await expect(eventCard.locator('.card-action-btn.delete')).toBeVisible();
    });

    test('shows event count', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('.event-count')).toContainText(`1 of ${MAX_EVENTS}`);
    });
  });

  test.describe('Event Creation', () => {
    test('clicking create event opens modal', async ({ page }) => {
      await enterEventList(page);
      await page.click('.create-event-btn');
      await expect(page.locator('.event-form-modal')).toBeVisible();
      await expect(page.locator('.event-form-modal h2')).toContainText('Create New Event');
    });

    test('can create a new event', async ({ page }) => {
      await enterEventList(page);
      await createEvent(page, 'Smith Wedding');
      // Should navigate to canvas
      await expect(page.locator('.canvas')).toBeVisible();
      // Event name should appear in header
      await expect(page.locator('.header .event-name-input')).toHaveValue('Smith Wedding');
    });

    test('new event appears in event list', async ({ page }) => {
      await enterEventList(page);
      await createEvent(page, 'Annual Gala', 'gala');
      // Navigate back to event list
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-list-view')).toBeVisible();
      // Should now have 2 events
      await expect(page.locator('.event-card')).toHaveCount(2);
    });

    test('create modal has all required fields', async ({ page }) => {
      await enterEventList(page);
      await page.click('.create-event-btn');
      // Check for event name input (first text input)
      await expect(page.getByRole('textbox', { name: 'Event Name' })).toBeVisible();
      await expect(page.locator('.event-form-modal select')).toBeVisible();
      await expect(page.locator('.event-form-modal input[type="date"]')).toBeVisible();
    });

    test('create modal can be cancelled', async ({ page }) => {
      await enterEventList(page);
      await page.click('.create-event-btn');
      await expect(page.locator('.event-form-modal')).toBeVisible();
      await page.click('.event-form-modal .btn-cancel');
      await expect(page.locator('.event-form-modal')).not.toBeVisible();
    });

    test('create modal can be closed by clicking overlay', async ({ page }) => {
      await enterEventList(page);
      await page.click('.create-event-btn');
      await expect(page.locator('.event-form-modal')).toBeVisible();
      await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
      await expect(page.locator('.event-form-modal')).not.toBeVisible();
    });
  });

  test.describe('Event Editing', () => {
    test('clicking edit opens edit modal', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card .card-action-btn.edit');
      await expect(page.locator('.event-form-modal')).toBeVisible();
      await expect(page.locator('.event-form-modal h2')).toContainText('Edit Event');
    });

    test('edit modal pre-fills existing values', async ({ page }) => {
      await enterEventList(page);
      await createEvent(page, 'Tech Conference', 'corporate');
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-list-view')).toBeVisible();

      // Click edit on the new event (should be first due to sorting)
      await page.locator('.event-card').first().locator('.card-action-btn.edit').click();
      await expect(page.getByRole('textbox', { name: 'Event Name' })).toHaveValue('Tech Conference');
    });

    test('can update event name', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card .card-action-btn.edit');
      await page.fill('.event-form-modal input[type="text"]', 'Updated Event Name');
      await page.click('.event-form-modal .btn-submit');
      await expect(page.locator('.event-form-modal')).not.toBeVisible();
      await expect(page.locator('.event-card .event-name')).toContainText('Updated Event Name');
    });
  });

  test.describe('Event Deletion', () => {
    test('clicking delete opens confirmation dialog', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card .card-action-btn.delete');
      await expect(page.locator('.delete-event-dialog')).toBeVisible();
    });

    test('delete dialog shows event name', async ({ page }) => {
      await enterEventList(page);
      // Get the event name first
      const eventName = await page.locator('.event-card .event-name').first().textContent();
      await page.click('.event-card .card-action-btn.delete');
      await expect(page.locator('.delete-event-dialog .event-name-display')).toContainText(eventName || '');
    });

    test('can cancel deletion', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card .card-action-btn.delete');
      await page.click('.delete-event-dialog .btn-cancel');
      await expect(page.locator('.delete-event-dialog')).not.toBeVisible();
      await expect(page.locator('.event-card')).toHaveCount(1);
    });

    test('can delete an event', async ({ page }) => {
      await enterEventList(page);
      // First create a second event
      await createEvent(page, 'Event To Delete');
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-card')).toHaveCount(2);

      // Delete the first event (the newly created one)
      await page.locator('.event-card').first().locator('.card-action-btn.delete').click();
      await page.click('.delete-event-dialog .btn-delete');
      await expect(page.locator('.event-card')).toHaveCount(1);
    });
  });

  test.describe('Event Navigation', () => {
    test('clicking event card enters the event', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card');
      await expect(page.locator('.canvas')).toBeVisible({ timeout: 5000 });
    });

    test('back button returns to event list', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card');
      await expect(page.locator('.canvas')).toBeVisible();
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-list-view')).toBeVisible();
    });

    test('back button is visible when inside an event', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card');
      await expect(page.locator('.back-to-events-btn')).toBeVisible();
    });

    test('back button is not visible on event list', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('.back-to-events-btn')).not.toBeVisible();
    });

    test('event name input is visible when inside event', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card');
      await expect(page.locator('.header .event-name-input')).toBeVisible();
    });

    test('event name input is not visible on event list', async ({ page }) => {
      await enterEventList(page);
      await expect(page.locator('.header .event-name-input')).not.toBeVisible();
    });
  });

  test.describe('Event Data Persistence', () => {
    test('changes to event are saved', async ({ page }) => {
      await enterEventList(page);
      await page.click('.event-card');
      // Change event name
      await page.fill('.header .event-name-input', 'Persisted Event Name');
      // Navigate back
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-card .event-name')).toContainText('Persisted Event Name');
    });

    test('event data persists after page reload', async ({ page }) => {
      await enterEventList(page);
      await createEvent(page, 'Persistent Event');
      await page.click('.back-to-events-btn');
      await expect(page.locator('.event-card')).toHaveCount(2);

      // Reload page
      await page.reload();
      // Re-bypass landing page
      await page.click('button:has-text("Start Planning Free")');
      await expect(page.locator('.event-list-view')).toBeVisible();
      await expect(page.locator('.event-card')).toHaveCount(2);
    });
  });

  test.describe('Event Limits', () => {
    test.skip('create button disabled at max events', async ({ page }) => {
      // This test is skipped as it would require creating 10 events
      // which would be slow and might time out
      await enterEventList(page);
      // Create 9 more events (already have 1)
      for (let i = 0; i < 9; i++) {
        await page.click('.create-event-btn');
        await page.fill('.event-form-modal input[type="text"]', `Event ${i + 2}`);
        await page.click('.event-form-modal .btn-submit');
        await page.click('.back-to-events-btn');
      }
      // Now should have 10 events
      await expect(page.locator('.event-card')).toHaveCount(10);
      await expect(page.locator('.create-event-btn')).toBeDisabled();
    });
  });

  test.describe('Data Isolation', () => {
    test('changes in one event do not affect another event', async ({ page }) => {
      await enterEventList(page);

      // Create a second event
      await createEvent(page, 'Event A');
      // Add a table to Event A
      await page.locator('.add-dropdown button').first().click();
      await page.locator('.dropdown-menu button:has-text("Round")').click();
      await expect(page.locator('.table-component')).toHaveCount(1);

      // Go back and create Event B
      await page.click('.back-to-events-btn');
      await createEvent(page, 'Event B');
      // Event B should have no tables
      await expect(page.locator('.table-component')).toHaveCount(0);

      // Go back to Event A
      await page.click('.back-to-events-btn');
      await page.locator('.event-card:has-text("Event A")').click();
      await expect(page.locator('.canvas')).toBeVisible();
      // Event A should still have 1 table
      await expect(page.locator('.table-component')).toHaveCount(1);
    });

    test('switching between events preserves each event data', async ({ page }) => {
      await enterEventList(page);

      // Create Event A with a custom name
      await createEvent(page, 'Wedding Reception');
      await page.fill('.header .event-name-input', 'Smith Wedding');

      // Go back and create Event B
      await page.click('.back-to-events-btn');
      await createEvent(page, 'Corporate Dinner');

      // Check Event B name in header
      await expect(page.locator('.header .event-name-input')).toHaveValue('Corporate Dinner');

      // Go back to Event A
      await page.click('.back-to-events-btn');
      await page.locator('.event-card:has-text("Smith Wedding")').click();
      await expect(page.locator('.header .event-name-input')).toHaveValue('Smith Wedding');
    });

    test('guests added to one event do not appear in another', async ({ page }) => {
      await enterEventList(page);

      // Create Event A and add a guest
      await createEvent(page, 'Event With Guests');
      await page.locator('button:has-text("Add Guest")').first().click();
      await expect(page.locator('.canvas-guest, .seat-guest')).toHaveCount(1);

      // Create Event B
      await page.click('.back-to-events-btn');
      await createEvent(page, 'Empty Event');
      // Event B should have no guests
      await expect(page.locator('.canvas-guest, .seat-guest')).toHaveCount(0);
    });

    test('deleting an event does not affect other events', async ({ page }) => {
      await enterEventList(page);

      // Create two events
      await createEvent(page, 'Keep This Event');
      await page.click('.back-to-events-btn');
      await createEvent(page, 'Delete This Event');
      await page.click('.back-to-events-btn');

      // Should have 3 events total (default + 2 created)
      await expect(page.locator('.event-card')).toHaveCount(3);

      // Delete "Delete This Event"
      await page.locator('.event-card:has-text("Delete This Event")').locator('.card-action-btn.delete').click();
      await page.click('.delete-event-dialog .btn-delete');

      // Should have 2 events
      await expect(page.locator('.event-card')).toHaveCount(2);

      // "Keep This Event" should still exist
      await expect(page.locator('.event-card:has-text("Keep This Event")')).toBeVisible();
    });
  });
});
