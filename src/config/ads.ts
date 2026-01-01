// Google Ads Configuration
// Replace these placeholder IDs with your actual Google Ads conversion IDs

/**
 * Google Ads Conversion Tag ID
 * Format: AW-XXXXXXXXX
 * Find this in Google Ads > Tools & Settings > Conversions
 */
export const GOOGLE_ADS_ID = 'AW-PLACEHOLDER';

/**
 * Conversion Labels for different actions
 * Format: XXXXXXXXXXX (the part after the slash in AW-XXXXXXXXX/XXXXXXXXXXX)
 * Create these in Google Ads > Tools & Settings > Conversions > New Conversion
 */
export const CONVERSION_LABELS = {
  // Primary conversion: User clicks CTA and enters app
  appEntry: 'PLACEHOLDER_APP_ENTRY',

  // Secondary conversion: User signs up for email updates
  emailSignup: 'PLACEHOLDER_EMAIL_SIGNUP',

  // High-value conversion: User creates their first event
  eventCreated: 'PLACEHOLDER_EVENT_CREATED',
} as const;

/**
 * Check if Google Ads is configured (not using placeholder values)
 */
export function isGoogleAdsConfigured(): boolean {
  return !GOOGLE_ADS_ID.includes('PLACEHOLDER');
}
