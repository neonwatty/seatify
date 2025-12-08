import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ViewToggle } from './ViewToggle';
import type { TableShape } from '../types';
import './MainToolbar.css';

interface MainToolbarProps {
  children?: React.ReactNode;
  onAddGuest?: () => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
}

interface OptimizeResult {
  beforeScore: number;
  afterScore: number;
  movedCount: number;
}

export function MainToolbar({ children, onAddGuest, showRelationships, onToggleRelationships }: MainToolbarProps) {
  const { event, addTable, addGuest, activeView, optimizeSeating, resetSeating, hasOptimizationSnapshot } = useStore();
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
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
    guestsWithRelationships: event.guests.filter(g => g.relationships.length > 0).map(g => ({ name: g.name, relCount: g.relationships.length }))
  });

  // Handle optimize seating
  const handleOptimize = () => {
    setIsOptimizing(true);

    // Small delay to show animation starting
    setTimeout(() => {
      const result = optimizeSeating();
      setOptimizeResult({
        beforeScore: result.beforeScore,
        afterScore: result.afterScore,
        movedCount: result.movedGuests.length,
      });
      setIsOptimizing(false);

      // Auto-hide toast after 5 seconds
      setTimeout(() => setOptimizeResult(null), 5000);
    }, 300);
  };

  // Handle reset seating
  const handleReset = () => {
    resetSeating();
    setOptimizeResult(null);
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
        name: `Guest ${guestNumber}`,
        group: undefined,
      });
    }
  };

  return (
    <div className="main-toolbar">
      {/* Left: Add actions */}
      <div className="toolbar-section toolbar-left">
        {activeView === 'canvas' && (
          <div className="add-dropdown" ref={addDropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="toolbar-btn primary"
            >
              + Add Table
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

        <button onClick={handleAddGuest} className="toolbar-btn primary">
          + Add Guest
        </button>

        {activeView === 'canvas' && (
          hasSnapshot ? (
            <button
              onClick={handleReset}
              className="toolbar-btn reset"
              title="Reset to original seating arrangement"
            >
              Reset
            </button>
          ) : (
            <button
              onClick={handleOptimize}
              className={`toolbar-btn optimize ${isOptimizing ? 'optimizing' : ''}`}
              disabled={!canOptimize || isOptimizing}
              title={!canOptimize ? 'Add guest relationships to enable optimization' : 'Optimize seating based on relationships'}
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize'}
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

      {/* Optimization Result Toast */}
      {optimizeResult && (
        <div className="optimize-toast">
          <div className="toast-content">
            <span className="toast-icon">✨</span>
            <div className="toast-message">
              <strong>Seating Optimized!</strong>
              <span className="toast-details">
                Score: {optimizeResult.beforeScore} → {optimizeResult.afterScore}
                {optimizeResult.movedCount > 0 && (
                  <> · {optimizeResult.movedCount} guest{optimizeResult.movedCount !== 1 ? 's' : ''} moved</>
                )}
              </span>
            </div>
            <button className="toast-close" onClick={() => setOptimizeResult(null)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
