import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import type { TableShape } from '../types';
import './MobileFAB.css';

interface MobileFABProps {
  onAddGuest: () => void;
  isHidden?: boolean; // Hide during drag operations
}

/**
 * iOS-style add button with action sheet.
 * Uses iOS Human Interface Guidelines patterns:
 * - Subtle "+" button instead of Material Design FAB
 * - Action sheet slides up from bottom (iOS pattern)
 * - Cancel button at bottom of action sheet
 */
export function MobileFAB({ onAddGuest, isHidden = false }: MobileFABProps) {
  const { event, addTable } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isExpanded]);

  const handleAddTable = (shape: TableShape) => {
    const tableNumber = event.tables.length + 1;
    // Position new tables near center of viewport
    const x = Math.max(100, window.innerWidth / 2 - 50 + (tableNumber * 30) % 100);
    const y = Math.max(100, window.innerHeight / 2 - 50 + (tableNumber * 20) % 80);
    addTable(shape, x, y);
    setIsExpanded(false);
  };

  const handleAddGuest = () => {
    onAddGuest();
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setIsExpanded(false);
  };

  // iOS Action Sheet content
  const actionSheetContent = isExpanded && (
    <>
      <div className="ios-action-sheet-backdrop" onClick={handleCancel} />
      <div className="ios-action-sheet" ref={sheetRef} role="dialog" aria-modal="true">
        <div className="ios-action-sheet-group">
          <div className="ios-action-sheet-title">Add to Canvas</div>
          <button
            className="ios-action-sheet-btn"
            onClick={handleAddGuest}
          >
            <span className="ios-action-icon">👤</span>
            Add Guest
          </button>
          <button
            className="ios-action-sheet-btn"
            onClick={() => handleAddTable('round')}
          >
            <span className="ios-action-icon">⭕</span>
            Add Round Table
          </button>
          <button
            className="ios-action-sheet-btn"
            onClick={() => handleAddTable('rectangle')}
          >
            <span className="ios-action-icon">▭</span>
            Add Rectangle Table
          </button>
        </div>
        <div className="ios-action-sheet-group">
          <button
            className="ios-action-sheet-btn ios-action-sheet-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Compact add button */}
      <div className={`mobile-add-btn-container ${isHidden ? 'hidden' : ''}`}>
        <button
          className="mobile-add-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Add items"
          aria-expanded={isExpanded}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" className="add-icon">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      {/* Render action sheet via portal */}
      {actionSheetContent && createPortal(actionSheetContent, document.body)}
    </>
  );
}
