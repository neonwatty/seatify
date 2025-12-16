import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import type { TableShape } from '../types';
import './MobileToolbarMenu.css';

type ActiveView = 'dashboard' | 'canvas' | 'guests';

interface MobileToolbarMenuProps {
  onAddGuest: () => void;
  onImport?: () => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
  showGridControls?: boolean;
  onToggleGridControls?: () => void;
}

export function MobileToolbarMenu({
  onAddGuest,
  onImport,
  showRelationships,
  onToggleRelationships,
  showGridControls,
  onToggleGridControls,
}: MobileToolbarMenuProps) {
  const { event, addTable, activeView, setActiveView, optimizeSeating, resetSeating, hasOptimizationSnapshot } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showTableSubmenu, setShowTableSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check optimization state
  const hasRelationships = event.guests.some(g => g.relationships.length > 0);
  const hasTablesWithCapacity = event.tables.some(t => t.capacity > 0);
  const canOptimize = hasRelationships && hasTablesWithCapacity && event.guests.length > 1;
  const hasSnapshot = hasOptimizationSnapshot();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowTableSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowTableSubmenu(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleViewChange = (view: ActiveView) => {
    setActiveView(view);
    setIsOpen(false);
  };

  const handleAddTable = (shape: TableShape) => {
    const tableNumber = event.tables.length + 1;
    const x = 400 + (tableNumber * 50) % 200;
    const y = 300 + (tableNumber * 30) % 150;
    addTable(shape, x, y);
    setShowTableSubmenu(false);
    setIsOpen(false);
  };

  const handleAddGuest = () => {
    onAddGuest();
    setIsOpen(false);
  };

  const handleImport = () => {
    if (onImport) {
      onImport();
      setIsOpen(false);
    }
  };

  const handleOptimize = () => {
    optimizeSeating();
    setIsOpen(false);
  };

  const handleReset = () => {
    resetSeating();
    setIsOpen(false);
  };

  const handleToggleRelationships = () => {
    if (onToggleRelationships) {
      onToggleRelationships();
    }
  };

  const handleToggleGridControls = () => {
    if (onToggleGridControls) {
      onToggleGridControls();
      setIsOpen(false);
    }
  };

  // Render fixed-position elements via portal to avoid transform containment issues
  const bottomNavContent = (
    <nav className="mobile-bottom-nav" ref={menuRef}>
      <button
        className={`bottom-nav-item ${activeView === 'canvas' ? 'active' : ''}`}
        onClick={() => setActiveView('canvas')}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
        </svg>
        <span>Canvas</span>
      </button>
      <button
        className={`bottom-nav-item ${activeView === 'guests' ? 'active' : ''}`}
        onClick={() => setActiveView('guests')}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        <span>Guests</span>
      </button>
      <button
        className="bottom-nav-item add-btn"
        onClick={() => setIsOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        <span>Add</span>
      </button>
      <button
        className={`bottom-nav-item ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <span>More</span>
      </button>
    </nav>
  );

  const menuContent = isOpen && (
    <>
      <div className="mobile-menu-backdrop" onClick={() => setIsOpen(false)} />
      <div className="mobile-menu-sheet" role="menu">
            {/* View Selection */}
            <div className="menu-section">
              <div className="menu-section-label">View</div>
              <div className="menu-view-buttons">
                <button
                  className={`menu-view-btn ${activeView === 'canvas' ? 'active' : ''}`}
                  onClick={() => handleViewChange('canvas')}
                  role="menuitem"
                >
                  <span className="menu-icon">🎨</span>
                  <span>Canvas</span>
                </button>
                <button
                  className={`menu-view-btn ${activeView === 'guests' ? 'active' : ''}`}
                  onClick={() => handleViewChange('guests')}
                  role="menuitem"
                >
                  <span className="menu-icon">📋</span>
                  <span>Guest List</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="menu-section">
              <div className="menu-section-label">Actions</div>

              {activeView === 'canvas' && (
                <div className="menu-item-group">
                  {showTableSubmenu ? (
                    <>
                      <button
                        className="menu-item back"
                        onClick={() => setShowTableSubmenu(false)}
                        role="menuitem"
                      >
                        <span className="menu-icon">←</span>
                        <span>Back</span>
                      </button>
                      <button
                        className="menu-item"
                        onClick={() => handleAddTable('round')}
                        role="menuitem"
                      >
                        <span className="menu-icon">⭕</span>
                        <span>Round Table</span>
                      </button>
                      <button
                        className="menu-item"
                        onClick={() => handleAddTable('rectangle')}
                        role="menuitem"
                      >
                        <span className="menu-icon">▭</span>
                        <span>Rectangle Table</span>
                      </button>
                    </>
                  ) : (
                    <button
                      className="menu-item"
                      onClick={() => setShowTableSubmenu(true)}
                      role="menuitem"
                    >
                      <span className="menu-icon">🪑</span>
                      <span>Add Table</span>
                      <span className="menu-chevron">›</span>
                    </button>
                  )}
                </div>
              )}

              <button
                className="menu-item"
                onClick={handleAddGuest}
                role="menuitem"
              >
                <span className="menu-icon">👤</span>
                <span>Add Guest</span>
              </button>

              {onImport && (
                <button
                  className="menu-item"
                  onClick={handleImport}
                  role="menuitem"
                >
                  <span className="menu-icon">📥</span>
                  <span>Import Guests</span>
                </button>
              )}

              {activeView === 'canvas' && (
                hasSnapshot ? (
                  <button
                    className="menu-item"
                    onClick={handleReset}
                    role="menuitem"
                  >
                    <span className="menu-icon">↩️</span>
                    <span>Reset Seating</span>
                  </button>
                ) : (
                  <button
                    className="menu-item"
                    onClick={handleOptimize}
                    disabled={!canOptimize}
                    role="menuitem"
                  >
                    <span className="menu-icon">✨</span>
                    <span>Optimize Seating</span>
                  </button>
                )
              )}
            </div>

            {/* Canvas Tools (only in canvas view) */}
            {activeView === 'canvas' && (
              <div className="menu-section">
                <div className="menu-section-label">Canvas Tools</div>

                {onToggleGridControls && (
                  <button
                    className={`menu-item toggle ${showGridControls ? 'active' : ''}`}
                    onClick={handleToggleGridControls}
                    role="menuitem"
                  >
                    <span className="menu-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path
                          fill="currentColor"
                          d="M20 3H4c-.55 0-1 .45-1 1v16c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM9 19H5v-4h4v4zm0-6H5V9h4v4zm0-6H5V5h4v2zm6 12h-4v-4h4v4zm0-6h-4V9h4v4zm0-6h-4V5h4v2zm4 12h-4v-4h4v4zm0-6h-4V9h4v4zm0-6h-4V5h4v2z"
                        />
                      </svg>
                    </span>
                    <span>Grid Controls</span>
                    {showGridControls && <span className="checkmark">✓</span>}
                  </button>
                )}

                {onToggleRelationships && (
                  <button
                    className={`menu-item toggle ${showRelationships ? 'active' : ''}`}
                    onClick={handleToggleRelationships}
                    role="menuitem"
                  >
                    <span className="menu-icon">🔗</span>
                    <span>Show Relationships</span>
                    {showRelationships && <span className="checkmark">✓</span>}
                  </button>
                )}
              </div>
            )}

            {/* Event Info */}
            <div className="menu-footer">
              <span className="event-name">{event.name || 'Untitled Event'}</span>
              <span className="guest-count">{event.guests.length} guests</span>
            </div>
          </div>
        </>
  );

  return (
    <div className="mobile-toolbar-menu">
      {/* Top hamburger button in toolbar */}
      <button
        className={`hamburger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger-icon">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </span>
      </button>

      {/* Render bottom nav via portal to escape transform containment */}
      {createPortal(bottomNavContent, document.body)}

      {/* Render menu sheet via portal */}
      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
