import crypto from 'crypto';

// Generate a unique RSVP token for a guest
export function generateRSVPToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Build the direct RSVP URL with token
export function buildRSVPUrl(eventId: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seatify.app';
  return `${baseUrl}/rsvp/${eventId}/${token}`;
}
