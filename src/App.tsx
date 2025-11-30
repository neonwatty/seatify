import { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { GuestManagementView } from './components/GuestManagementView';
import { PrintView } from './components/PrintView';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const { activeView, undo, redo, canUndo, canRedo } = useStore();
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

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

  // Show print preview
  if (showPrintPreview) {
    return <PrintView onClose={() => setShowPrintPreview(false)} />;
  }

  return (
    <div className="app">
      <Header />
      <div className="main-content">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'canvas' && (
          <>
            <Sidebar />
            <Canvas />
          </>
        )}
        {activeView === 'guests' && <GuestManagementView />}
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
