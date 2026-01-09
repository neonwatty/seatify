import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useResponsive';
import { ViewToggle } from './ViewToggle';
import { MobileToolbarMenu } from './MobileToolbarMenu';
import { MobileCanvasToolbar } from './MobileCanvasToolbar';
import { showToast } from './toastStore';
import { prefersReducedMotion } from '../utils/animationHelpers';
import type { TableShape } from '../types';
import type { TourId } from '../data/tourRegistry';
import './MainToolbar.css';

interface MainToolbarProps {
  children?: React.ReactNode;
  onAddGuest?: () => void;
  onImport?: () => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
  // Mobile settings props
  onShowHelp?: () => void;
  onStartTour?: (tourId: TourId) => void;
  onSubscribe?: () => void;
  canShowEmailButton?: boolean;
}

export function MainToolbar({ children, onAddGuest, onImport, showRelationships, onToggleRelationships, onShowHelp, onStartTour, onSubscribe, canShowEmailButton }: MainToolbarProps) {
  const {
    event,
    addTable,
    addGuest,
    activeView,
    optimizeSeating,
    resetSeating,
    hasOptimizationSnapshot,
    hasUsedOptimizeButton,
    setFadingOutGuests,
    clearFadingOutGuests,
    optimizeAnimationEnabled,
    setOptimizeAnimationEnabled,
  } = useStore();
  const isMobile = useIsMobile();
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showOptimizeDropdown, setShowOptimizeDropdown] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const optimizeDropdownRef = useRef<HTMLDivElement>(null);

  // Check if optimization is possible
  const hasRelationships = event.guests.some(g => g.relationships.length > 0);
  const hasTablesWithCapacity = event.tables.some(t => t.capacity > 0);
  const canOptimize = hasRelationships && hasTablesWithCapacity && event.guests.length > 1;
  const hasSnapshot = hasOptimizationSnapshot();

  // Show attention animation if user hasn't used optimize button yet and can optimize
  const showOptimizeAttention = canOptimize && !hasUsedOptimizeButton && !hasSnapshot;

  // Handle optimize seating with fade animation
  const handleOptimize = useCallback(() => {
    setIsOptimizing(true);

    // Check if we should use animation
    const shouldAnimate = optimizeAnimationEnabled && !isMobile && !prefersReducedMotion();

    // Capture old positions BEFORE optimization (for fade-out ghosts)
    const oldPositions = new Map<string, { tableId: string; seatIndex: number; guest: typeof event.guests[0] }>();
    event.guests.forEach(guest => {
      if (guest.tableId && guest.seatIndex !== undefined) {
        oldPositions.set(guest.id, {
          tableId: guest.tableId,
          seatIndex: guest.seatIndex,
          guest: { ...guest }
        });
      }
    });

    // Run optimization
    const result = optimizeSeating();

    // Check for no changes
    if (result.movedGuests.length === 0) {
      setIsOptimizing(false);
      showToast('Already optimized! No changes needed.', 'info');
      return;
    }

    // Create fading-out guests for animation
    if (shouldAnimate && result.movedGuests.length > 0) {
      const fadingGuests = result.movedGuests
        .filter(guestId => oldPositions.has(guestId))
        .map(guestId => {
          const old = oldPositions.get(guestId)!;
          return {
            guestId,
            guest: old.guest,
            tableId: old.tableId,
            seatIndex: old.seatIndex
          };
        });

      if (fadingGuests.length > 0) {
        setFadingOutGuests(fadingGuests);

        // Clear fading guests after animation completes
        setTimeout(() => {
          clearFadingOutGuests();
        }, 1200); // Match CSS animation duration (0.4s delay + 0.8s fade-in)
      }
    }

    // Show toast
    setTimeout(() => {
      setIsOptimizing(false);
      const parts: string[] = [];
      if (result.violationsResolved > 0) {
        parts.push(`${result.violationsResolved} conflict${result.violationsResolved !== 1 ? 's' : ''} resolved`);
      }
      // Calculate guests moved between tables (exclude newly seated from count)
      const movedBetweenTables = result.movedGuests.length - result.newlySeated;
      if (movedBetweenTables > 0) {
        parts.push(`${movedBetweenTables} guest${movedBetweenTables !== 1 ? 's' : ''} moved`);
      }
      if (result.newlySeated > 0) {
        parts.push(`${result.newlySeated} guest${result.newlySeated !== 1 ? 's' : ''} seated`);
      }
      const actionSummary = parts.length > 0 ? parts.join(' · ') + ' · ' : '';
      showToast(
        `Seating Optimized! ${actionSummary}Score: ${result.beforeScore} → ${result.afterScore}`,
        'success'
      );
    }, shouldAnimate ? 1200 : 100);
  }, [
    optimizeAnimationEnabled,
    isMobile,
    event.guests,
    optimizeSeating,
    setFadingOutGuests,
    clearFadingOutGuests
  ]);

  // Handle reset seating
  const handleReset = () => {
    resetSeating();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
      if (optimizeDropdownRef.current && !optimizeDropdownRef.current.contains(e.target as Node)) {
        setShowOptimizeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTable = (shape: TableShape) => {
    const tableNumber = event.tables.length + 1;
    const x = 400 + (tableNumber * 50) % 200;
    const y = 300 + (tableNumber * 30) % 150;
    addTable(shape, x, y);
    setShowAddDropdown(false);
  };

  const handleAddGuest = () => {
    if (onAddGuest) {
      onAddGuest();
    } else {
      const guestNumber = event.guests.length + 1;
      addGuest({
        firstName: `Guest`,
        lastName: `${guestNumber}`,
        group: undefined,
      });
    }
  };

  // Render mobile toolbar on mobile devices
  if (isMobile) {
    // Canvas view gets a minimal toolbar
    if (activeView === 'canvas') {
      return (
        <MobileCanvasToolbar
          onShowHelp={onShowHelp}
          onStartTour={onStartTour}
          showRelationships={showRelationships}
          onToggleRelationships={onToggleRelationships}
        >
          {children}
        </MobileCanvasToolbar>
      );
    }

    // Other views get the full mobile menu
    return (
      <div className="main-toolbar mobile">
        <MobileToolbarMenu
          onAddGuest={handleAddGuest}
          onImport={onImport}
          showRelationships={showRelationships}
          onToggleRelationships={onToggleRelationships}
          onShowHelp={onShowHelp}
          onStartTour={onStartTour}
          onSubscribe={onSubscribe}
          canShowEmailButton={canShowEmailButton}
        />
        {/* Middle section for view-specific controls (like GridControls) */}
        <div className="toolbar-section toolbar-middle mobile-middle">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="main-toolbar">
      {/* Left: Add actions */}
      <div className="toolbar-section toolbar-left">
        {activeView === 'canvas' && (
          <div className="add-dropdown" ref={addDropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="toolbar-btn primary"
              title="Add Table"
            >
              <span className="btn-icon">🪑</span>
              {!isMobile && <span className="btn-text">Add Table</span>}
            </button>
            {showAddDropdown && (
              <div className="dropdown-menu">
                <button onClick={() => handleAddTable('round')}>
                  <span className="table-shape-icon">⭕</span> Round Table
                </button>
                <button onClick={() => handleAddTable('rectangle')}>
                  <span className="table-shape-icon">▭</span> Rectangle Table
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={handleAddGuest} className="toolbar-btn primary" title="Add Guest">
          <span className="btn-icon">👤</span>
          {!isMobile && <span className="btn-text">Add Guest</span>}
        </button>

        {onImport && (
          <button onClick={onImport} className="toolbar-btn secondary" title="Import guests from CSV or Excel">
            <span className="btn-icon">📥</span>
            {!isMobile && <span className="btn-text">Import</span>}
          </button>
        )}

        {activeView === 'canvas' && (
          hasSnapshot ? (
            <button
              onClick={handleReset}
              className="toolbar-btn reset"
              title="Reset to original seating arrangement"
            >
              <span className="btn-icon">↩️</span>
              {!isMobile && <span className="btn-text">Reset</span>}
            </button>
          ) : (
            <div className="optimize-dropdown" ref={optimizeDropdownRef}>
              <button
                onClick={handleOptimize}
                className={`toolbar-btn optimize ${isOptimizing ? 'optimizing' : ''} ${showOptimizeAttention ? 'attention' : ''}`}
                disabled={!canOptimize || isOptimizing}
                title={!canOptimize ? 'Add guest relationships to enable optimization' : 'Optimize seating based on relationships'}
              >
                {showOptimizeAttention && <span className="optimize-badge">Try</span>}
                <span className="btn-icon">✨</span>
                {!isMobile && <span className="btn-text">{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>}
              </button>
              {!isMobile && (
                <button
                  className="optimize-settings-btn"
                  onClick={() => setShowOptimizeDropdown(!showOptimizeDropdown)}
                  title="Optimization settings"
                >
                  ⚙️
                </button>
              )}
              {showOptimizeDropdown && (
                <div className="dropdown-menu optimize-menu">
                  <label className="dropdown-toggle">
                    <input
                      type="checkbox"
                      checked={optimizeAnimationEnabled}
                      onChange={(e) => setOptimizeAnimationEnabled(e.target.checked)}
                    />
                    <span>Show fade animation</span>
                  </label>
                </div>
              )}
            </div>
          )
        )}

      </div>

      {/* Middle: View-specific controls */}
      <div className="toolbar-section toolbar-middle">
        {children}
      </div>

      {/* Right: View toggle */}
      <div className="toolbar-section toolbar-right">
        <ViewToggle
          showRelationships={showRelationships}
          onToggleRelationships={onToggleRelationships}
        />
      </div>
    </div>
  );
}
