'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
  type GoogleTokens,
} from '@/lib/google/auth';
import {
  listSpreadsheets,
  getSpreadsheetSheets,
  readSheetData,
  previewSheetData,
  autoDetectColumnMappings,
  type Spreadsheet,
  type Sheet,
  type SheetData,
} from '@/lib/google/sheets';

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
}

/**
 * Get the Google OAuth authorization URL
 */
export async function getGoogleAuthorizationUrl(
  eventId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Include event ID in state for callback routing
    const state = Buffer.from(JSON.stringify({ eventId, userId: user.id })).toString('base64');
    const url = getGoogleAuthUrl(state);
    return { url };
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return { error: 'Google integration not configured. Please contact support.' };
  }
}

/**
 * Handle OAuth callback and store tokens
 */
export async function handleGoogleCallback(
  code: string,
  state: string
): Promise<{ success?: boolean; eventId?: string; error?: string }> {
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, eventId } = stateData;

    const supabase = await createClient();

    // Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { error: 'Authentication mismatch' };
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in database (encrypted column recommended)
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google_sheets',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at).toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Error storing tokens:', upsertError);
      return { error: 'Failed to save connection' };
    }

    return { success: true, eventId };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return { error: 'Failed to complete Google connection' };
  }
}

/**
 * Get valid access token (refreshing if needed)
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_sheets')
    .single();

  if (!integration) {
    return null;
  }

  const expiresAt = new Date(integration.expires_at).getTime();

  // Check if token needs refresh
  if (isTokenExpired(expiresAt)) {
    if (!integration.refresh_token) {
      return null;
    }

    try {
      const newTokens = await refreshAccessToken(integration.refresh_token);

      // Update stored tokens
      await supabase
        .from('user_integrations')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(newTokens.expires_at).toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'google_sheets');

      return newTokens.access_token;
    } catch {
      // Refresh failed, user needs to reconnect
      return null;
    }
  }

  return integration.access_token;
}

/**
 * Check Google Sheets connection status
 */
export async function checkGoogleConnection(): Promise<{ data?: GoogleConnectionStatus; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const accessToken = await getValidAccessToken(user.id);

  return {
    data: {
      connected: !!accessToken,
    },
  };
}

/**
 * Disconnect Google Sheets
 */
export async function disconnectGoogle(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google_sheets');

  if (error) {
    return { error: 'Failed to disconnect' };
  }

  return { success: true };
}

/**
 * List user's Google Spreadsheets
 */
export async function listGoogleSpreadsheets(): Promise<{ data?: Spreadsheet[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: 'NOT_CONNECTED' };
  }

  try {
    const spreadsheets = await listSpreadsheets(accessToken);
    return { data: spreadsheets };
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return { error: 'NOT_CONNECTED' };
    }
    return { error: 'Failed to list spreadsheets' };
  }
}

/**
 * Get sheets (tabs) for a spreadsheet
 */
export async function getSpreadsheetTabs(
  spreadsheetId: string
): Promise<{ data?: Sheet[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: 'NOT_CONNECTED' };
  }

  try {
    const sheets = await getSpreadsheetSheets(accessToken, spreadsheetId);
    return { data: sheets };
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return { error: 'NOT_CONNECTED' };
    }
    return { error: 'Failed to get spreadsheet tabs' };
  }
}

/**
 * Preview sheet data with auto-detected column mappings
 */
export async function previewGoogleSheet(
  spreadsheetId: string,
  sheetTitle: string
): Promise<{ data?: { sheet: SheetData; mappings: Record<string, string> }; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: 'NOT_CONNECTED' };
  }

  try {
    const sheet = await previewSheetData(accessToken, spreadsheetId, sheetTitle);
    const mappings = autoDetectColumnMappings(sheet.headers);
    return { data: { sheet, mappings } };
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return { error: 'NOT_CONNECTED' };
    }
    return { error: 'Failed to preview sheet' };
  }
}

export interface ColumnMapping {
  firstName: string;
  lastName: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  group?: string;
  notes?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Import guests from Google Sheet
 */
export async function importFromGoogleSheet(
  eventId: string,
  spreadsheetId: string,
  sheetTitle: string,
  columnMapping: ColumnMapping,
  duplicateHandling: 'skip' | 'update' | 'create'
): Promise<{ data?: ImportResult; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Verify user owns the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single();

  if (eventError || !event) {
    return { error: 'Event not found or access denied' };
  }

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return { error: 'NOT_CONNECTED' };
  }

  try {
    // Read full sheet data
    const sheetData = await readSheetData(accessToken, spreadsheetId, sheetTitle);

    // Get existing guests for duplicate detection
    const { data: existingGuests } = await supabase
      .from('guests')
      .select('id, email, first_name, last_name')
      .eq('event_id', eventId);

    const existingByEmail = new Map(
      (existingGuests || [])
        .filter((g) => g.email)
        .map((g) => [g.email.toLowerCase(), g])
    );

    const existingByName = new Map(
      (existingGuests || [])
        .map((g) => [`${g.first_name}|${g.last_name}`.toLowerCase(), g])
    );

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (const row of sheetData.rows) {
      const firstName = row[columnMapping.firstName]?.trim();
      const lastName = row[columnMapping.lastName]?.trim();

      // Skip rows without names
      if (!firstName && !lastName) {
        result.skipped++;
        continue;
      }

      const email = columnMapping.email ? row[columnMapping.email]?.trim().toLowerCase() : undefined;

      // Check for duplicates
      let existingGuest = email ? existingByEmail.get(email) : undefined;
      if (!existingGuest && firstName && lastName) {
        existingGuest = existingByName.get(`${firstName}|${lastName}`.toLowerCase());
      }

      if (existingGuest) {
        if (duplicateHandling === 'skip') {
          result.skipped++;
          continue;
        } else if (duplicateHandling === 'update') {
          // Update existing guest
          const updateData: Record<string, string | undefined> = {};
          if (columnMapping.company) updateData.company = row[columnMapping.company]?.trim();
          if (columnMapping.jobTitle) updateData.job_title = row[columnMapping.jobTitle]?.trim();
          if (columnMapping.group) updateData.group_name = row[columnMapping.group]?.trim();
          if (columnMapping.notes) updateData.notes = row[columnMapping.notes]?.trim();

          await supabase
            .from('guests')
            .update(updateData)
            .eq('id', existingGuest.id);

          result.imported++;
          continue;
        }
        // duplicateHandling === 'create' falls through to create new
      }

      // Create new guest
      const guestData = {
        event_id: eventId,
        first_name: firstName || '',
        last_name: lastName || '',
        email: email || null,
        company: columnMapping.company ? row[columnMapping.company]?.trim() || null : null,
        job_title: columnMapping.jobTitle ? row[columnMapping.jobTitle]?.trim() || null : null,
        group_name: columnMapping.group ? row[columnMapping.group]?.trim() || null : null,
        notes: columnMapping.notes ? row[columnMapping.notes]?.trim() || null : null,
        rsvp_status: 'pending',
      };

      const { error: insertError } = await supabase
        .from('guests')
        .insert(guestData);

      if (insertError) {
        result.errors.push(`Failed to import ${firstName} ${lastName}: ${insertError.message}`);
      } else {
        result.imported++;
      }
    }

    return { data: result };
  } catch (error) {
    if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
      return { error: 'NOT_CONNECTED' };
    }
    console.error('Import error:', error);
    return { error: 'Failed to import guests' };
  }
}
