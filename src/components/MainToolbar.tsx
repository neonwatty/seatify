import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getFullName } from '../types';
import { useIsMobile } from '../hooks/useResponsive';
import { ViewToggle } from './ViewToggle';
import { MobileToolbarMenu } from './MobileToolbarMenu';
import { showToast } from './toastStore';
import type { TableShape } from '../types';
import './MainToolbar.css';

interface MainToolbarProps {
  children?: React.ReactNode;
  onAddGuest?: () => void;
  onImport?: () => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
}

export function MainToolbar({ children, onAddGuest, onImport, showRelationships, onToggleRelationships }: MainToolbarProps) {
  const { event, addTable, addGuest, activeView, optimizeSeating, resetSeating, hasOptimizationSnapshot } = useStore();
  const isMobile = useIsMobile();
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  // Check if optimization is possible
  const hasRelationships = event.guests.some(g => g.relationships.length > 0);
  const hasTablesWithCapacity = event.tables.some(t => t.capacity > 0);
  const canOptimize = hasRelationships && hasTablesWithCapacity && event.guests.length > 1;
  const hasSnapshot = hasOptimizationSnapshot();

  // Debug logging
  console.log('Optimization state:', {
    hasRelationships,
    hasTablesWithCapacity,
    guestCount: event.guests.length,
    canOptimize,
    hasSnapshot,
    guestsWithRelationships: event.guests.filter(g => g.relationships.length > 0).map(g => ({ name: getFullName(g), relCount: g.relationships.length }))
  });

  // Handle optimize seating
  const handleOptimize = () => {
    setIsOptimizing(true);

    // Small delay to show animation starting
    setTimeout(() => {
      const result = optimizeSeating();
      setIsOptimizing(false);

      // Show toast using the global toast system (positioned correctly outside toolbar)
      const movedText = result.movedGuests.length > 0
        ? ` · ${result.movedGuests.length} guest${result.movedGuests.length !== 1 ? 's' : ''} moved`
        : '';
      showToast(
        `Seating Optimized! Score: ${result.beforeScore} → ${result.afterScore}${movedText}`,
        'success'
      );
    }, 300);
  };

  // Handle reset seating
  const handleReset = () => {
    resetSeating();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
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

  // Render mobile hamburger menu on mobile devices
  if (isMobile) {
    return (
      <div className="main-toolbar mobile">
        <MobileToolbarMenu
          onAddGuest={handleAddGuest}
          onImport={onImport}
          showRelationships={showRelationships}
          onToggleRelationships={onToggleRelationships}
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
            <button
              onClick={handleOptimize}
              className={`toolbar-btn optimize ${isOptimizing ? 'optimizing' : ''}`}
              disabled={!canOptimize || isOptimizing}
              title={!canOptimize ? 'Add guest relationships to enable optimization' : 'Optimize seating based on relationships'}
            >
              <span className="btn-icon">✨</span>
              {!isMobile && <span className="btn-text">{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>}
            </button>
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
