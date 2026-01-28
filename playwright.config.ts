import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Local Supabase config for E2E testing (same as CI)
const localSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

// Path to store authenticated browser state
const authStorageState = path.join(__dirname, 'e2e', '.auth', 'user.json');

// For local E2E testing, use npm run dev with local Supabase env from .env.local
// Note: Run `npm run test:e2e:setup` to configure .env.local for local Supabase before running tests

export default defineConfig({
  testDir: './e2e',
  // Verify Supabase is running before tests start
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Setup project - runs auth.setup.ts to authenticate and save state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Unauthenticated tests - don't need auth state
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*\.auth\.spec\.ts/, // Ignore auth-requiring tests
    },

    // Authenticated tests - use saved auth state, depend on setup
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStorageState,
      },
      testMatch: /.*\.auth\.spec\.ts/, // Only run auth-requiring tests
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !!process.env.CI,
    timeout: 120000,
    // Pass env vars to ensure they're available during server startup
    // In CI, merge with parent env to ensure all required vars are available
    env: {
      ...process.env,
      ...localSupabaseEnv,
    },
  },
});
