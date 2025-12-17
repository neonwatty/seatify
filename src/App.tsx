import { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { GuestManagementView } from './components/GuestManagementView';
import { EventListView } from './components/EventListView';
import { PrintView } from './components/PrintView';
import { GuestForm } from './components/GuestForm';
import { ToastContainer } from './components/Toast';
import { showToast } from './components/toastStore';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const {
    activeView,
    setActiveView,
    currentEventId,
    undo,
    redo,
    canUndo,
    canRedo,
    canvas,
    batchRemoveTables,
    batchRemoveGuests,
    nudgeSelectedTables,
    pushHistory,
    editingGuestId,
    setEditingGuest,
    recenterCanvas,
    hasCompletedOnboarding,
    setOnboardingComplete,
  } = useStore();
  const [showLanding, setShowLanding] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-show onboarding for first-time users after landing page
  useEffect(() => {
    if (!showLanding && !hasCompletedOnboarding) {
      // Small delay to let the app render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [showLanding, hasCompletedOnboarding]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Undo (Cmd/Ctrl+Z)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
          showToast('Undo', 'info', { label: 'Redo', onClick: redo });
        }
        return;
      }

      // Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
          (e.key === 'y' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (canRedo()) {
          redo();
          showToast('Redo', 'info', { label: 'Undo', onClick: undo });
        }
        return;
      }

      // Delete/Backspace to remove selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelectedTables = canvas.selectedTableIds.length > 0;
        const hasSelectedGuests = canvas.selectedGuestIds.length > 0;

        if (hasSelectedTables || hasSelectedGuests) {
          e.preventDefault();
          const itemCount = canvas.selectedTableIds.length + canvas.selectedGuestIds.length;
          const confirmMessage = itemCount === 1
            ? 'Delete selected item?'
            : `Delete ${itemCount} selected items?`;

          if (confirm(confirmMessage)) {
            pushHistory('Delete selected items');
            if (hasSelectedTables) {
              batchRemoveTables(canvas.selectedTableIds);
            }
            if (hasSelectedGuests) {
              batchRemoveGuests(canvas.selectedGuestIds);
            }
            showToast(`Deleted ${itemCount} item${itemCount > 1 ? 's' : ''}`, 'success');
          }
        }
        return;
      }

      // Arrow keys to nudge selected tables
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (canvas.selectedTableIds.length > 0) {
          e.preventDefault();
          const amount = e.shiftKey ? 1 : 10; // Fine nudge with Shift
          let dx = 0, dy = 0;

          switch (e.key) {
            case 'ArrowUp': dy = -amount; break;
            case 'ArrowDown': dy = amount; break;
            case 'ArrowLeft': dx = -amount; break;
            case 'ArrowRight': dx = amount; break;
          }

          nudgeSelectedTables(dx, dy);
        }
        return;
      }

      // Show keyboard shortcuts (?)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsHelp(prev => !prev);
        return;
      }

      // Re-center canvas (0 or c)
      if (e.key === '0' || e.key === 'c') {
        e.preventDefault();
        recenterCanvas(window.innerWidth - 300, window.innerHeight - 150); // Approximate canvas size
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
  }, [undo, redo, canUndo, canRedo, canvas.selectedTableIds, canvas.selectedGuestIds, batchRemoveTables, batchRemoveGuests, nudgeSelectedTables, pushHistory, recenterCanvas]);

  // Show landing page
  if (showLanding) {
    return <LandingPage onEnterApp={() => {
      setShowLanding(false);
      setActiveView('event-list');
    }} />;
  }

  // Show print preview
  if (showPrintPreview) {
    return <PrintView onClose={() => setShowPrintPreview(false)} />;
  }

  return (
    <div className="app">
      <Header
        onLogoClick={() => setShowLanding(true)}
        onShowHelp={() => setShowShortcutsHelp(true)}
        onStartTour={() => setShowOnboarding(true)}
      />
      <div className="main-content view-visible">
        {activeView === 'event-list' && <EventListView />}
        {activeView === 'dashboard' && currentEventId && <DashboardView />}
        {activeView === 'canvas' && currentEventId && (
          <>
            <Sidebar />
            <Canvas />
          </>
        )}
        {activeView === 'guests' && currentEventId && <GuestManagementView />}
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
          // Mark as complete even on skip/close to not annoy users
          if (!hasCompletedOnboarding) {
            setOnboardingComplete();
          }
        }}
        onComplete={() => {
          setOnboardingComplete();
          showToast('Tour complete! Press ? anytime for help.', 'success');
        }}
      />

      <ToastContainer />
    </div>
  );
}

export default App;
