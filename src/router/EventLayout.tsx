import { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Header } from '../components/Header';
import { GuestForm } from '../components/GuestForm';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { showToast } from '../components/toastStore';

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
  } = useStore();

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Auto-show onboarding for first-time users
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="app">
      <Header
        onLogoClick={handleLogoClick}
        onShowHelp={() => setShowShortcutsHelp(true)}
        onStartTour={() => setShowOnboarding(true)}
      />
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
          if (!hasCompletedOnboarding) {
            setOnboardingComplete();
          }
        }}
        onComplete={() => {
          setOnboardingComplete();
          showToast('Tour complete! Press ? anytime for help.', 'success');
        }}
      />
    </div>
  );
}
