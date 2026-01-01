// Google Ads Configuration
// Conversions are tracked via GA4-linked events (not manual conversion labels)

/**
 * Google Ads Conversion Tracking
 *
 * Seatify uses GA4-linked conversions, which means:
 * - GA4 events (app_entry, cta_click, etc.) are automatically imported as conversions
 * - No manual conversion labels are needed
 * - Conversions track automatically when GA4 events fire
 *
 * Setup:
 * - GA4 Property: Seatify (517628576)
 * - Google Ads Account: YTgify (658-278-5390)
 * - Linked conversions: app_entry, cta_click
 *
 * To add more conversions:
 * 1. Fire GA4 events in the app (they appear in GA4 after ~24h)
 * 2. Import them as conversions in Google Ads > Goals > Conversions
 */

/**
 * GA4 events that are linked as Google Ads conversions
 */
export const GA4_CONVERSION_EVENTS = {
  // User enters the app from landing page CTA
  appEntry: 'app_entry',

  // User clicks a CTA button
  ctaClick: 'cta_click',

  // User signs up for email updates (import when available in GA4)
  emailSignup: 'email_signup',

  // User creates their first event (import when available in GA4)
  eventCreated: 'event_created',
} as const;

/**
 * Check if conversion tracking is active
 * GA4-linked conversions are always active when GA4 is configured
 */
export function isConversionTrackingActive(): boolean {
  // Check if gtag is available (GA4 is configured in index.html)
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

// Legacy export for backward compatibility
export const isGoogleAdsConfigured = isConversionTrackingActive;
