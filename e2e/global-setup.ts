/**
 * Global setup for Playwright tests.
 * Verifies that Supabase is running before tests execute.
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function globalSetup() {
  console.log('\n[Global Setup] Checking if Supabase is running...');

  try {
    // Check if Supabase REST API is available with a 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      signal: controller.signal,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[Global Setup] Supabase is running\n');
      return;
    }

    throw new Error(`Supabase health check returned status ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('\n' + '='.repeat(70));
    console.error('ERROR: Supabase is not running!');
    console.error('='.repeat(70));
    console.error('');
    console.error('E2E tests require Supabase to be running locally.');
    console.error('');
    console.error('To start Supabase:');
    console.error('  1. Make sure Docker is running');
    console.error('  2. Run: supabase start');
    console.error('');
    console.error(`Error details: ${errorMessage}`);
    console.error('='.repeat(70) + '\n');

    // Exit with error to stop test execution
    process.exit(1);
  }
}

export default globalSetup;
