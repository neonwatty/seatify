import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleCallback } from '@/actions/googleSheets';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denying access
  if (error) {
    return NextResponse.redirect(
      new URL('/dashboard?google_error=access_denied', request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?google_error=invalid_request', request.url)
    );
  }

  const result = await handleGoogleCallback(code, state);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/dashboard?google_error=${encodeURIComponent(result.error)}`, request.url)
    );
  }

  // Redirect back to the event page with success indicator
  const redirectUrl = result.eventId
    ? `/dashboard/events/${result.eventId}/guests?google_connected=true`
    : '/dashboard?google_connected=true';

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
