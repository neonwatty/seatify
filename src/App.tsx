import { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { GuestManagementView } from './components/GuestManagementView';
import { SurveyBuilderView } from './components/SurveyBuilderView';
import { OptimizeView } from './components/OptimizeView';
import { GuestSurveyPage } from './components/GuestSurveyPage';
import { PrintView } from './components/PrintView';
import { useStore } from './store/useStore';
import { MockupViewer } from '../mockups/MockupViewer';
import './App.css';

function App() {
  const { activeView, undo, redo, canUndo, canRedo } = useStore();
  const [showMockups, setShowMockups] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [route, setRoute] = useState(window.location.hash);

  // Hash-based routing for guest survey page
  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Mockup viewer toggle (Ctrl+M)
      if (e.key === 'm' && e.ctrlKey) {
        e.preventDefault();
        setShowMockups(prev => !prev);
        return;
      }

      // Undo (Cmd/Ctrl+Z)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Redo (Cmd/Ctrl+Shift+Z)
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) redo();
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
  }, [undo, redo, canUndo, canRedo]);

  // Show guest survey page at #/survey
  if (route.startsWith('#/survey')) {
    return <GuestSurveyPage />;
  }

  // Show print preview
  if (showPrintPreview) {
    return <PrintView onClose={() => setShowPrintPreview(false)} />;
  }

  if (showMockups) {
    return (
      <div className="app">
        <button
          className="exit-mockups-btn"
          onClick={() => setShowMockups(false)}
        >
          Exit Mockups (Ctrl+M)
        </button>
        <MockupViewer />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <button
        className="view-mockups-btn"
        onClick={() => setShowMockups(true)}
        title="View Mockups (Ctrl+M)"
      >
        View Mockups
      </button>
      <div className="main-content">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'canvas' && (
          <>
            <Sidebar />
            <Canvas />
          </>
        )}
        {activeView === 'guests' && <GuestManagementView />}
        {activeView === 'survey' && <SurveyBuilderView />}
        {activeView === 'optimize' && <OptimizeView />}
      </div>

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
                <div className="shortcut-row">
                  <span className="shortcut-key">Ctrl+M</span>
                  <span className="shortcut-desc">Toggle mockups</span>
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
              </div>
            </div>
            <button className="close-shortcuts" onClick={() => setShowShortcutsHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
