// Google Analytics 4 tracking utilities
// All events are no-ops if gtag is not loaded (e.g., in development without GA4)

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
