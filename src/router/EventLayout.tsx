import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { Header } from '../components/Header';
import { GuestForm } from '../components/GuestForm';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { EmailCaptureModal } from '../components/EmailCaptureModal';
import { showToast } from '../components/toastStore';
import { MobileMenuProvider, useMobileMenu } from '../contexts/MobileMenuContext';
import { TOUR_REGISTRY, type TourId } from '../data/tourRegistry';
import { QUICK_START_STEPS } from '../data/onboardingSteps';
import { useIsMobile } from '../hooks/useResponsive';

/**
 * Layout wrapper for event-related routes.
 * Handles:
 * - Syncing URL params with store (eventId, activeView)
 * - Header with navigation
 * - Global modals (guest edit, onboarding, shortcuts help)
 */
export function EventLayout() {
  const { eventId } = useParams<{ eventId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    events,
    currentEventId,
    switchEvent,
    setActiveView,
    editingGuestId,
    setEditingGuest,
    hasCompletedOnboarding,
    setOnboardingComplete,
    activeTourId,
    setActiveTour,
    markTourComplete,
  } = useStore();

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Get current tour steps based on active tour
  const currentTourSteps = activeTourId ? TOUR_REGISTRY[activeTourId]?.steps : QUICK_START_STEPS;

  // Start a specific tour
  const startTour = useCallback((tourId: TourId) => {
    const tour = TOUR_REGISTRY[tourId];
    if (!tour) return;

    // Navigate to the required view if needed (both URL and state)
    if (tour.startingView && tour.startingView !== 'event-list') {
      // If we have an event, navigate to the correct view within that event
      if (currentEventId) {
        navigate(`/events/${currentEventId}/${tour.startingView}`);
        setActiveView(tour.startingView);

        // Delay showing the tour to allow navigation to complete
        setActiveTour(tourId);
        setTimeout(() => {
          setShowOnboarding(true);
        }, 100);
        return;
      }
      setActiveView(tour.startingView);
    }

    setActiveTour(tourId);
    setShowOnboarding(true);
  }, [setActiveView, setActiveTour, currentEventId, navigate]);

  // Keyboard shortcut for ? to show help modal and Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Show keyboard shortcuts (?)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsHelp(prev => !prev);
        return;
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        setShowShortcutsHelp(false);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync eventId from URL to store
  useEffect(() => {
    if (eventId && eventId !== currentEventId) {
      // Check if event exists
      const eventExists = events.some(e => e.id === eventId);
      if (eventExists) {
        switchEvent(eventId);
      } else {
        // Event not found, redirect to event list
        navigate('/events', { replace: true });
      }
    }
  }, [eventId, currentEventId, events, switchEvent, navigate]);

  // Sync view from URL path to store
  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/dashboard')) {
      setActiveView('dashboard');
    } else if (path.endsWith('/canvas')) {
      setActiveView('canvas');
    } else if (path.endsWith('/guests')) {
      setActiveView('guests');
    } else if (path === '/events') {
      setActiveView('event-list');
    }
  }, [location.pathname, setActiveView]);

  // Check for pending tour from landing page deep-links
  useEffect(() => {
    const pendingTour = sessionStorage.getItem('pendingTour') as TourId | null;
    if (pendingTour && TOUR_REGISTRY[pendingTour]) {
      sessionStorage.removeItem('pendingTour');
      const timer = setTimeout(() => startTour(pendingTour), 500);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // Listen for startTour events from ContextualHelpButton
  useEffect(() => {
    const handleStartTourEvent = (e: CustomEvent<{ tourId: TourId }>) => {
      if (e.detail.tourId && TOUR_REGISTRY[e.detail.tourId]) {
        startTour(e.detail.tourId);
      }
    };
    window.addEventListener('startTour', handleStartTourEvent as EventListener);
    return () => window.removeEventListener('startTour', handleStartTourEvent as EventListener);
  }, [startTour]);

  // Auto-show Quick Start tour for first-time users
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        setActiveTour('quick-start');
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, setActiveTour]);

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <MobileMenuProvider
      onShowHelp={() => setShowShortcutsHelp(true)}
      onStartTour={startTour}
    >
      <EventLayoutContent
        handleLogoClick={handleLogoClick}
        setShowShortcutsHelp={setShowShortcutsHelp}
        setShowOnboarding={setShowOnboarding}
        showShortcutsHelp={showShortcutsHelp}
        showOnboarding={showOnboarding}
        editingGuestId={editingGuestId}
        setEditingGuest={setEditingGuest}
        hasCompletedOnboarding={hasCompletedOnboarding}
        setOnboardingComplete={setOnboardingComplete}
        currentTourSteps={currentTourSteps}
        activeTourId={activeTourId}
        setActiveTour={setActiveTour}
        markTourComplete={markTourComplete}
        startTour={startTour}
        location={location}
      />
    </MobileMenuProvider>
  );
}

// Inner component to use the context
function EventLayoutContent({
  handleLogoClick,
  setShowShortcutsHelp,
  setShowOnboarding,
  showShortcutsHelp,
  showOnboarding,
  editingGuestId,
  setEditingGuest,
  hasCompletedOnboarding,
  setOnboardingComplete,
  currentTourSteps,
  activeTourId,
  setActiveTour,
  markTourComplete,
  startTour,
  location,
}: {
  handleLogoClick: () => void;
  setShowShortcutsHelp: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  showShortcutsHelp: boolean;
  showOnboarding: boolean;
  editingGuestId: string | null;
  setEditingGuest: (id: string | null) => void;
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;
  currentTourSteps: typeof QUICK_START_STEPS;
  activeTourId: TourId | null;
  setActiveTour: (tourId: TourId | null) => void;
  markTourComplete: (tourId: TourId) => void;
  startTour: (tourId: TourId) => void;
  location: { pathname: string };
}) {
  const { showEmailCapture, handleEmailCaptureClose } = useMobileMenu();
  const isMobile = useIsMobile();

  // Hide header on mobile canvas view (immersive mode)
  // BUT keep it visible during tours so tour targets are accessible
  const isCanvasView = location.pathname.endsWith('/canvas');
  const isTourActive = showOnboarding && activeTourId !== null;
  const shouldHideHeader = isMobile && isCanvasView && !isTourActive;

  return (
    <div className="app">
      {!shouldHideHeader && (
        <Header
          onLogoClick={handleLogoClick}
          onShowHelp={() => setShowShortcutsHelp(true)}
          onStartTour={startTour}
        />
      )}
      <div className="main-content view-visible">
        <Outlet />
      </div>

      {/* Guest Edit Modal (global - accessible from anywhere) */}
      {editingGuestId && (
        <GuestForm
          guestId={editingGuestId}
          onClose={() => setEditingGuest(null)}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="modal-overlay" onClick={() => setShowShortcutsHelp(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard Shortcuts</h2>
            <div className="shortcuts-grid">
              <div className="shortcut-category">
                <h3>General</h3>
                <div className="shortcut-row">
                  <span className="shortcut-key">?</span>
                  <span className="shortcut-desc">Show this help</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Esc</span>
                  <span className="shortcut-desc">Close modals</span>
                </div>
              </div>
              <div className="shortcut-category">
                <h3>Editing</h3>
                <div className="shortcut-row">
                  <span className="shortcut-key">Cmd+Z</span>
                  <span className="shortcut-desc">Undo</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Cmd+Shift+Z</span>
                  <span className="shortcut-desc">Redo</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Cmd+Y</span>
                  <span className="shortcut-desc">Redo (alt)</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Delete</span>
                  <span className="shortcut-desc">Delete selected</span>
                </div>
              </div>
              <div className="shortcut-category">
                <h3>Canvas</h3>
                <div className="shortcut-row">
                  <span className="shortcut-key">Scroll</span>
                  <span className="shortcut-desc">Pan canvas</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Cmd+Scroll</span>
                  <span className="shortcut-desc">Zoom in/out</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Shift+Drag</span>
                  <span className="shortcut-desc">Pan canvas</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Arrow Keys</span>
                  <span className="shortcut-desc">Nudge tables 10px</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">Shift+Arrow</span>
                  <span className="shortcut-desc">Fine nudge 1px</span>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-key">0 / C</span>
                  <span className="shortcut-desc">Re-center view</span>
                </div>
              </div>
            </div>
            <button className="close-shortcuts" onClick={() => setShowShortcutsHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          setActiveTour(null);
          if (!hasCompletedOnboarding) {
            setOnboardingComplete();
          }
        }}
        onComplete={() => {
          if (activeTourId) {
            markTourComplete(activeTourId);
          }
          setOnboardingComplete();
          setActiveTour(null);
          const tourTitle = activeTourId ? TOUR_REGISTRY[activeTourId]?.title || 'Tour' : 'Tour';
          showToast(`${tourTitle} complete! Check the Learn menu for more tours.`, 'success');
        }}
        customSteps={currentTourSteps}
        tourTitle={activeTourId ? TOUR_REGISTRY[activeTourId]?.title : undefined}
      />

      {/* Email Capture Modal (triggered from mobile menu) */}
      {showEmailCapture && createPortal(
        <EmailCaptureModal
          onClose={() => handleEmailCaptureClose(false)}
          onSuccess={() => handleEmailCaptureClose(true)}
          source="value_moment"
        />,
        document.body
      )}
    </div>
  );
}
