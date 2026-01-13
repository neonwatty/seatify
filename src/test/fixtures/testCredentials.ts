/**
 * Test credentials for development and testing.
 *
 * These credentials are created directly in Supabase and auto-confirmed,
 * bypassing email verification. Use for:
 * - Local development testing
 * - E2E tests
 * - iOS simulator workflow testing
 *
 * DO NOT use these in production.
 */

export const TEST_USER = {
  email: 'test@seatify.local',
  password: 'TestPass123!',
} as const;

/**
 * Alternative test users can be added here as needed.
 * Each should be created in Supabase with "Auto Confirm User" enabled.
 */
export const TEST_USERS = {
  default: TEST_USER,
  // Add more test users as needed:
  // admin: { email: 'admin@seatify.local', password: 'AdminPass123!' },
} as const;
