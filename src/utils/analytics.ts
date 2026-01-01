// Google Analytics 4 & Google Ads tracking utilities
// All events are no-ops if gtag is not loaded (e.g., in development without GA4)

import { GOOGLE_ADS_ID, CONVERSION_LABELS, isGoogleAdsConfigured } from '../config/ads';

/**
 * Check if gtag is available
 */
function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (!isGtagAvailable()) return;
  window.gtag('event', eventName, params);
}

/**
 * Track a page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isGtagAvailable()) return;
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

// ============================================
// Domain-specific tracking functions
// ============================================

/**
 * Track when a user creates a new event
 */
export function trackEventCreated(eventType: string): void {
  trackEvent('event_created', {
    event_category: 'engagement',
    event_type: eventType,
  });
}

/**
 * Track when a guest is added
 */
export function trackGuestAdded(guestCount: number): void {
  trackEvent('guest_added', {
    event_category: 'engagement',
    guest_count: guestCount,
  });
}

/**
 * Track when a table is added
 */
export function trackTableAdded(tableShape: string): void {
  trackEvent('table_added', {
    event_category: 'engagement',
    table_shape: tableShape,
  });
}

/**
 * Track when the optimizer is run
 */
export function trackOptimizerRun(guestCount: number, tableCount: number): void {
  trackEvent('optimizer_run', {
    event_category: 'engagement',
    guest_count: guestCount,
    table_count: tableCount,
  });
}

/**
 * Track when a QR code is generated
 */
export function trackQRGenerated(type: 'share' | 'table'): void {
  trackEvent('qr_generated', {
    event_category: 'engagement',
    qr_type: type,
  });
}

/**
 * Track when a PDF is exported
 */
export function trackPDFExported(exportType: string): void {
  trackEvent('pdf_exported', {
    event_category: 'engagement',
    export_type: exportType,
  });
}

/**
 * Track email signup (conversion event)
 */
export function trackEmailSignup(source: string): void {
  trackEvent('email_signup', {
    event_category: 'conversion',
    signup_source: source,
  });
}

/**
 * Track CTA button click on landing page
 */
export function trackCTAClick(ctaLocation: string): void {
  trackEvent('cta_click', {
    event_category: 'engagement',
    cta_location: ctaLocation,
  });
}

/**
 * Track when user enters the app from landing page
 */
export function trackAppEntry(): void {
  trackEvent('app_entry', {
    event_category: 'engagement',
  });
}

/**
 * Track when user imports guests
 */
export function trackGuestsImported(count: number): void {
  trackEvent('guests_imported', {
    event_category: 'engagement',
    guest_count: count,
  });
}

/**
 * Track share action
 */
export function trackShareAction(shareType: 'link' | 'qr' | 'clipboard'): void {
  trackEvent('share_action', {
    event_category: 'engagement',
    share_type: shareType,
  });
}

// ============================================
// Google Ads Conversion Tracking
// ============================================

/**
 * Track a Google Ads conversion
 * Only fires if Google Ads is configured with real IDs
 */
function trackGoogleAdsConversion(conversionLabel: string): void {
  if (!isGtagAvailable() || !isGoogleAdsConfigured()) return;

  window.gtag('event', 'conversion', {
    send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
  });
}

/**
 * Track app entry as a Google Ads conversion
 * This is the primary conversion for AdWords campaigns
 */
export function trackAppEntryConversion(): void {
  // Track in GA4
  trackAppEntry();

  // Track in Google Ads
  trackGoogleAdsConversion(CONVERSION_LABELS.appEntry);
}

/**
 * Track email signup as a Google Ads conversion
 */
export function trackEmailSignupConversion(source: string): void {
  // Track in GA4
  trackEmailSignup(source);

  // Track in Google Ads
  trackGoogleAdsConversion(CONVERSION_LABELS.emailSignup);
}

/**
 * Track event creation as a Google Ads conversion
 * High-value conversion indicating deep engagement
 */
export function trackEventCreatedConversion(eventType: string): void {
  // Track in GA4
  trackEventCreated(eventType);

  // Track in Google Ads
  trackGoogleAdsConversion(CONVERSION_LABELS.eventCreated);
}

// ============================================
// Funnel & Journey Tracking
// ============================================

/**
 * Funnel stages for tracking user journey
 */
export type FunnelStage =
  | 'landing_view'      // User views landing page
  | 'cta_click'         // User clicks CTA
  | 'app_entry'         // User enters app
  | 'event_created'     // User creates first event
  | 'first_guest'       // User adds first guest
  | 'first_table'       // User adds first table
  | 'optimizer_used'    // User runs optimizer
  | 'export_completed'; // User exports (PDF/QR/Share)

/**
 * Track funnel progression
 * Use this for key conversion funnel steps
 */
export function trackFunnelStep(stage: FunnelStage, metadata?: Record<string, unknown>): void {
  trackEvent('funnel_step', {
    event_category: 'funnel',
    funnel_stage: stage,
    ...metadata,
  });
}

/**
 * Track milestone achievements (first-time actions)
 */
export function trackMilestone(
  milestone: 'first_event' | 'first_guest' | 'first_table' | 'first_optimization' | 'first_export',
  metadata?: Record<string, unknown>
): void {
  trackEvent('milestone_achieved', {
    event_category: 'milestone',
    milestone_name: milestone,
    ...metadata,
  });
}

/**
 * Track feature discovery/usage
 */
export function trackFeatureUsed(
  feature: 'relationships' | 'constraints' | 'venue_elements' | 'import_wizard' | 'qr_codes' | 'theme_toggle' | 'keyboard_shortcuts',
  firstTime: boolean = false
): void {
  trackEvent('feature_used', {
    event_category: 'feature_discovery',
    feature_name: feature,
    is_first_use: firstTime,
  });
}

/**
 * Track view/tab switches within the app
 */
export function trackViewSwitch(
  fromView: 'canvas' | 'dashboard' | 'guests',
  toView: 'canvas' | 'dashboard' | 'guests'
): void {
  trackEvent('view_switch', {
    event_category: 'navigation',
    from_view: fromView,
    to_view: toView,
  });
}

/**
 * Track onboarding progress
 */
export function trackOnboardingStep(
  step: number,
  totalSteps: number,
  completed: boolean = false
): void {
  trackEvent('onboarding_progress', {
    event_category: 'onboarding',
    step_number: step,
    total_steps: totalSteps,
    is_completed: completed,
  });
}

/**
 * Track user engagement depth
 * Call periodically to measure session engagement
 */
export function trackEngagementDepth(metrics: {
  guestCount: number;
  tableCount: number;
  constraintCount: number;
  timeOnPage: number; // seconds
}): void {
  trackEvent('engagement_depth', {
    event_category: 'engagement',
    guest_count: metrics.guestCount,
    table_count: metrics.tableCount,
    constraint_count: metrics.constraintCount,
    time_on_page_seconds: metrics.timeOnPage,
  });
}

/**
 * Set user properties for segmentation
 * Call when user state changes significantly
 */
export function setUserProperties(properties: {
  hasCreatedEvent?: boolean;
  hasAddedGuests?: boolean;
  hasUsedOptimizer?: boolean;
  hasExported?: boolean;
  hasSubscribed?: boolean;
}): void {
  if (!isGtagAvailable()) return;

  // GA4 user properties
  window.gtag('set', 'user_properties', {
    has_created_event: properties.hasCreatedEvent,
    has_added_guests: properties.hasAddedGuests,
    has_used_optimizer: properties.hasUsedOptimizer,
    has_exported: properties.hasExported,
    has_subscribed: properties.hasSubscribed,
  });
}

// ============================================
// Core Web Vitals tracking
// ============================================

/**
 * Track Core Web Vitals metrics (CLS, FID, FCP, LCP, TTFB, INP)
 * These are sent as GA4 events with the metric name and value
 */
export function trackWebVital(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor',
  id: string
): void {
  trackEvent('web_vitals', {
    event_category: 'performance',
    metric_name: name,
    metric_value: Math.round(name === 'CLS' ? value * 1000 : value), // CLS is unitless, others are ms
    metric_rating: rating,
    metric_id: id,
  });
}

/**
 * Initialize Web Vitals tracking
 * Call this once when the app loads
 */
export async function initWebVitals(): Promise<void> {
  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Track all Core Web Vitals
    onCLS((metric) => trackWebVital('CLS', metric.value, metric.rating, metric.id));
    onFCP((metric) => trackWebVital('FCP', metric.value, metric.rating, metric.id));
    onLCP((metric) => trackWebVital('LCP', metric.value, metric.rating, metric.id));
    onTTFB((metric) => trackWebVital('TTFB', metric.value, metric.rating, metric.id));
    onINP((metric) => trackWebVital('INP', metric.value, metric.rating, metric.id));
  } catch {
    // Web vitals import failed - likely in a test environment
    console.debug('Web Vitals tracking not available');
  }
}
