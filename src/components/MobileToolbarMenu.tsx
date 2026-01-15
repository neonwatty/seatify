import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { version } from '../../package.json';
import { UpdatesButton } from './UpdatesPopup';
import { getToursByCategory, type TourId } from '../data/tourRegistry';
import type { TableShape } from '../types';
import './MobileToolbarMenu.css';

type ActiveView = 'event-list' | 'dashboard' | 'canvas' | 'guests';

interface MobileToolbarMenuProps {
  onAddGuest: () => void;
  onImport?: () => void;
  showRelationships?: boolean;
  onToggleRelationships?: () => void;
  showGridControls?: boolean;
  onToggleGridControls?: () => void;
  // Settings props
  onShowHelp?: () => void;
  onStartTour?: (tourId: TourId) => void;
  onSubscribe?: () => void;
  canShowEmailButton?: boolean;
  // External control of menu state (optional - uses internal state if not provided)
  isOpen?: boolean;
  onClose?: () => void;
}

export function MobileToolbarMenu({
  onAddGuest,
  onImport,
  showRelationships,
  onToggleRelationships,
  showGridControls,
  onToggleGridControls,
  onShowHelp,
  onStartTour,
  onSubscribe,
  canShowEmailButton,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: MobileToolbarMenuProps) {
  const { event, addTable, activeView, setActiveView, optimizeSeating, resetSeating, hasOptimizationSnapshot, hasUsedOptimizeButton, canvas, setZoom, recenterCanvas, theme, cycleTheme, currentEventId, isTourComplete } = useStore();
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose !== undefined
    ? (open: boolean) => { if (!open) externalOnClose(); }
    : setInternalIsOpen;
  const [showTableSubmenu, setShowTableSubmenu] = useState(false);
  const [showTourSubmenu, setShowTourSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuSheetRef = useRef<HTMLDivElement>(null);

  // Get tours by category
  const gettingStartedTours = getToursByCategory('getting-started');
  const featureTours = getToursByCategory('features');

  // Check optimization state
  const hasRelationships = event.guests.some(g => g.relationships.length > 0);
  const hasTablesWithCapacity = event.tables.some(t => t.capacity > 0);
  const canOptimize = hasRelationships && hasTablesWithCapacity && event.guests.length > 1;
  const hasSnapshot = hasOptimizationSnapshot();

  // Show attention animation if user hasn't used optimize button yet and can optimize
  const showOptimizeAttention = canOptimize && !hasUsedOptimizeButton && !hasSnapshot;

  // Close menu when clicking outside (check both bottom nav and menu sheet)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideBottomNav = menuRef.current && !menuRef.current.contains(target);
      const isOutsideMenuSheet = !menuSheetRef.current || !menuSheetRef.current.contains(target);
      if (isOutsideBottomNav && isOutsideMenuSheet) {
        setIsOpen(false);
        setShowTableSubmenu(false);
        setShowTourSubmenu(false);
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
        setShowTourSubmenu(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleViewChange = (view: ActiveView) => {
    if (currentEventId) {
      navigate(`/events/${currentEventId}/${view}`);
    }
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

  const handleShowHelp = () => {
    if (onShowHelp) {
      onShowHelp();
      setIsOpen(false);
    }
  };

  const handleStartTour = (tourId: TourId) => {
    if (onStartTour) {
      onStartTour(tourId);
      setIsOpen(false);
      setShowTourSubmenu(false);
    }
  };

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe();
      setIsOpen(false);
    }
  };

  const handleCycleTheme = () => {
    cycleTheme();
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '\u2600'; // Sun
      case 'dark': return '\u263D'; // Moon
      default: return '\u2699'; // Gear (system)
    }
  };

  const menuContent = isOpen && (
    <>
      <div className="mobile-menu-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }} />
      <div className={`mobile-menu-sheet ${activeView === 'canvas' ? 'canvas-view' : ''}`} role="menu" ref={menuSheetRef} onClick={(e) => e.stopPropagation()}>
            {/* View Selection */}
            <div className="menu-section">
              <div className="menu-section-label">View</div>
              <div className="menu-view-buttons">
                <button
                  className={`menu-view-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleViewChange('dashboard')}
                  role="menuitem"
                >
                  <span className="menu-icon">📊</span>
                  <span>Dashboard</span>
                </button>
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
                    className={`menu-item ${showOptimizeAttention ? 'attention' : ''}`}
                    onClick={handleOptimize}
                    disabled={!canOptimize}
                    role="menuitem"
                  >
                    <span className="menu-icon">✨</span>
                    <span>Optimize Seating</span>
                    {showOptimizeAttention && <span className="attention-badge">Try</span>}
                  </button>
                )
              )}
            </div>

            {/* Canvas Tools (only in canvas view) */}
            {activeView === 'canvas' && (
              <div className="menu-section">
                <div className="menu-section-label">Canvas Tools</div>

                {/* Zoom Controls */}
                <div className="menu-zoom-controls">
                  <button
                    className="menu-zoom-btn"
                    onClick={() => setZoom(Math.max(0.25, canvas.zoom - 0.25))}
                    aria-label="Zoom out"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
                    </svg>
                  </button>
                  <span className="menu-zoom-value">{Math.round(canvas.zoom * 100)}%</span>
                  <button
                    className="menu-zoom-btn"
                    onClick={() => setZoom(Math.min(2, canvas.zoom + 0.25))}
                    aria-label="Zoom in"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                  <button
                    className="menu-zoom-btn reset"
                    onClick={() => recenterCanvas(window.innerWidth, window.innerHeight)}
                    aria-label="Reset view"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>

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

            {/* Settings */}
            <div className="menu-section">
              <div className="menu-section-label">Settings</div>

              {/* Version Info */}
              <div className="menu-item static">
                <span className="menu-icon">📦</span>
                <span>Version {version}</span>
              </div>

              {/* What's New */}
              <div className="menu-item-updates">
                <UpdatesButton variant="mobile-menu" />
              </div>

              {/* Subscribe */}
              {canShowEmailButton && onSubscribe && (
                <button
                  className="menu-item"
                  onClick={handleSubscribe}
                  role="menuitem"
                >
                  <span className="menu-icon">📧</span>
                  <span>Subscribe for Updates</span>
                </button>
              )}

              {/* Keyboard Shortcuts */}
              {onShowHelp && (
                <button
                  className="menu-item"
                  onClick={handleShowHelp}
                  role="menuitem"
                >
                  <span className="menu-icon">⌨️</span>
                  <span>Keyboard Shortcuts</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                className="menu-item"
                onClick={handleCycleTheme}
                role="menuitem"
              >
                <span className="menu-icon">{getThemeIcon()}</span>
                <span>Theme: {getThemeLabel()}</span>
              </button>
            </div>

            {/* Learn Section */}
            {onStartTour && (
              <div className="menu-section">
                <div className="menu-section-label">Learn</div>

                {showTourSubmenu ? (
                  <>
                    <button
                      className="menu-item back"
                      onClick={() => setShowTourSubmenu(false)}
                      role="menuitem"
                    >
                      <span className="menu-icon">←</span>
                      <span>Back</span>
                    </button>

                    {/* Getting Started Tours */}
                    {gettingStartedTours.map(tour => (
                      <button
                        key={tour.id}
                        className={`menu-item tour-item ${isTourComplete(tour.id) ? 'completed' : ''}`}
                        onClick={() => handleStartTour(tour.id)}
                        role="menuitem"
                      >
                        <span className="menu-icon">{tour.icon}</span>
                        <span className="tour-info">
                          <span className="tour-title">{tour.title}</span>
                          <span className="tour-time">{tour.estimatedTime}</span>
                        </span>
                        {isTourComplete(tour.id) && <span className="checkmark">✓</span>}
                      </button>
                    ))}

                    {/* Feature Tours */}
                    {featureTours.length > 0 && (
                      <>
                        <div className="menu-section-sublabel">Feature Tours</div>
                        {featureTours.map(tour => (
                          <button
                            key={tour.id}
                            className={`menu-item tour-item ${isTourComplete(tour.id) ? 'completed' : ''}`}
                            onClick={() => handleStartTour(tour.id)}
                            role="menuitem"
                          >
                            <span className="menu-icon">{tour.icon}</span>
                            <span className="tour-info">
                              <span className="tour-title">{tour.title}</span>
                              <span className="tour-time">{tour.estimatedTime}</span>
                            </span>
                            {isTourComplete(tour.id) && <span className="checkmark">✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <button
                    className="menu-item"
                    onClick={() => setShowTourSubmenu(true)}
                    role="menuitem"
                  >
                    <span className="menu-icon">🎓</span>
                    <span>Browse Tours</span>
                    <span className="menu-chevron">›</span>
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
      {/* iOS Tab Bar is handled by IOSTabBar component in EventLayout/EventListView */}
      {/* This component now only provides the menu sheet functionality */}

      {/* Render menu sheet via portal */}
      {menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
