import { Resend } from 'resend';

// Initialize Resend client
// Only available on server-side
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey && typeof window === 'undefined') {
  console.warn(
    'RESEND_API_KEY is not set. Email functionality will not work.'
  );
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'noreply@seatify.app';

// Batch size for bulk sending (Resend limit is 100 per batch)
export const EMAIL_BATCH_SIZE = 100;

// Types for email operations
export interface EmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

export interface BatchEmailResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    guestId: string;
    email: string;
    success: boolean;
    resendId?: string;
    error?: string;
  }>;
}
