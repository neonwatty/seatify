export interface OnboardingStep {
  id: string;
  target: string | null;        // CSS selector for element to highlight (null for centered modal)
  targetFallback?: string;      // Fallback selector if primary not found
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  requiredView?: 'event-list' | 'dashboard' | 'canvas' | 'guests';
  highlightPadding?: number;    // Extra padding around highlighted element
  action?: 'click-event-card';  // Special action to perform before moving to next step
  tourId?: string;              // Optional: identifies which tour this step belongs to
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Seatify!',
    description: "Let's take a quick tour of the key features. This will only take about a minute.",
    placement: 'center',
  },
  {
    id: 'event-list-overview',
    target: '.event-cards-grid',
    targetFallback: '.event-list-view',
    title: 'Your Events Dashboard',
    description: 'This is where all your events live. Each card represents a separate event you\'re planning - weddings, corporate dinners, galas, and more.',
    placement: 'center',
    requiredView: 'event-list',
    highlightPadding: 16,
  },
  {
    id: 'create-event',
    target: '.create-event-btn',
    title: 'Create New Events',
    description: 'Click here to create a new event. You can add up to 10 events, each with its own venue details, guest list, and seating arrangement.',
    placement: 'bottom',
    requiredView: 'event-list',
    highlightPadding: 8,
  },
  {
    id: 'event-card',
    target: '.event-card',
    title: 'Enter an Event',
    description: 'Click any event card to open it and start planning. Let\'s go inside this event now!',
    placement: 'right',
    requiredView: 'event-list',
    highlightPadding: 8,
    action: 'click-event-card',
  },
  // Dashboard steps (after entering event, before canvas)
  {
    id: 'dashboard-overview',
    target: '.stats-overview',
    targetFallback: '.dashboard-grid',
    title: 'Event Overview',
    description: 'Your dashboard shows key stats at a glance - guest counts, RSVP status, and seating progress.',
    placement: 'bottom',
    requiredView: 'dashboard',
    highlightPadding: 12,
  },
  {
    id: 'quick-actions',
    target: '.quick-actions',
    title: 'Quick Actions',
    description: 'Jump to common tasks: add tables, manage guests, share your seating chart, or export event data.',
    placement: 'left',
    requiredView: 'dashboard',
    highlightPadding: 8,
  },
  // Canvas steps
  {
    id: 'canvas-overview',
    target: '.canvas-container',
    targetFallback: '.canvas',
    title: 'The Canvas',
    description: 'This is your floor plan. Drag tables to arrange them, zoom with scroll, and pan by holding Shift while dragging.',
    placement: 'center',
    requiredView: 'canvas',
    highlightPadding: 0,
  },
  {
    id: 'add-table',
    target: '.add-dropdown',
    targetFallback: '.main-toolbar',
    title: 'Add Tables',
    description: 'Click here to add tables to your floor plan. Choose from round, rectangle, square, and other shapes.',
    placement: 'bottom',
    requiredView: 'canvas',
    highlightPadding: 8,
  },
  {
    id: 'sidebar',
    target: '.sidebar',
    targetFallback: '.sidebar-toggle',
    title: 'Guest Sidebar',
    description: 'Your guest list appears here. Drag guests from this panel onto tables to assign their seats.',
    placement: 'right',
    requiredView: 'canvas',
    highlightPadding: 0,
  },
  {
    id: 'view-toggle',
    target: '.view-toggle',
    targetFallback: '.view-toggle-container',
    title: 'Switch Views',
    description: 'Use Dashboard, Canvas, and Guests views to manage different aspects of your event.',
    placement: 'bottom',
    requiredView: 'canvas',
    highlightPadding: 8,
  },
  {
    id: 'optimize',
    target: '.toolbar-btn.primary',
    targetFallback: '.main-toolbar',
    title: 'Smart Optimization',
    description: 'Set up guest relationships, then click Optimize to auto-arrange seating. Partners stay together, conflicts stay apart.',
    placement: 'bottom',
    requiredView: 'canvas',
    highlightPadding: 8,
  },
  {
    id: 'help',
    target: '.help-btn',
    title: 'Need Help?',
    description: "Press ? anytime to see keyboard shortcuts. You can restart this tour from the header.",
    placement: 'bottom',
    highlightPadding: 12,
  },
];

// QR Code mini-tour (optional, triggered separately)
export const QR_TOUR_STEPS: OnboardingStep[] = [
  {
    id: 'qr-intro',
    target: null,
    title: 'QR Codes for Your Tables',
    description: 'Generate QR codes that guests can scan to see who\'s at their table. Perfect for table cards and place settings!',
    placement: 'center',
    tourId: 'qr',
  },
  {
    id: 'qr-print-all',
    target: '.qr-print-btn',
    targetFallback: '.tables-summary',
    title: 'Print All QR Codes',
    description: 'Click here to generate printable QR codes for every table at once. Great for bulk printing.',
    placement: 'bottom',
    requiredView: 'dashboard',
    highlightPadding: 8,
    tourId: 'qr',
  },
  {
    id: 'qr-single-table',
    target: '.table-component',
    targetFallback: '.canvas',
    title: 'Individual Table QR',
    description: 'Right-click any table on the canvas to generate its QR code. You can copy the link or download the QR image.',
    placement: 'right',
    requiredView: 'canvas',
    highlightPadding: 12,
    tourId: 'qr',
  },
  {
    id: 'qr-done',
    target: null,
    title: 'Ready to Print!',
    description: 'When guests scan a QR code, they\'ll see a beautiful page with their table name and fellow guests. Try it out!',
    placement: 'center',
    tourId: 'qr',
  },
];
