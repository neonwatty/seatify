import { test as setup, expect } from '@playwright/test';
import path from 'path';

// Test user credentials for E2E tests
// This user is created by supabase/seed.sql during `supabase db reset`
export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

// Path to save authenticated browser state
export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'user.json');

/**
 * Global setup that authenticates once and saves state.
 *
 * This runs before any authenticated tests and creates a user.json
 * file containing the authenticated browser state (cookies, localStorage).
 *
 * Other tests can then reuse this state without logging in again.
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  // Fill in credentials
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);

  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (successful login)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

  // Verify we're on the dashboard
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5000 });

  // Save the authenticated state
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});

/**
 * Setup to create the test user if they don't exist.
 *
 * This uses the Supabase Admin API (service role key) to create
 * the test user. Run this once before running E2E tests.
 */
setup.skip('create test user', async ({ request }) => {
  // This setup is skipped by default - run manually if needed
  // The test user should be seeded in the local Supabase database

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, skipping user creation');
    return;
  }

  // Create user via Supabase Admin API
  const response = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
    },
  });

  // User may already exist, which is fine
  if (response.status() === 201) {
    console.log('Test user created successfully');
  } else if (response.status() === 422) {
    console.log('Test user already exists');
  } else {
    console.warn('Failed to create test user:', await response.text());
  }
});
