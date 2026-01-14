import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useGesture } from '@use-gesture/react';
import { useStore } from '../store/useStore';
import { useMobileMenu } from '../contexts/MobileMenuContext';
import {
  DETENT_THRESHOLDS,
  GESTURE_CONFIG,
  rubberBand,
  findNearestDetent,
  ratioToDetentSize,
  isScrollAtTop,
  type DetentSize,
} from '../utils/gestureUtils';

interface BottomControlSheetProps {
  isVisible: boolean;
  onClose: () => void;
  showRelationships: boolean;
  onToggleRelationships: () => void;
  onShowImport: () => void;
  initialDetent?: DetentSize;
  onDetentChange?: (detent: DetentSize | 'closed') => void;
}

/**
 * Bottom control sheet with iOS-like detents and gestures.
 * Supports three snap points (25%, 50%, 90%) and velocity-aware swipe gestures.
 */
export function BottomControlSheet({
  isVisible,
  onClose,
  showRelationships,
  onToggleRelationships,
  onShowImport,
  initialDetent = 'medium',
  onDetentChange,
}: BottomControlSheetProps) {
  const navigate = useNavigate();
  const {
    event,
    canvas,
    canvasPrefs,
    setZoom,
    recenterCanvas,
    toggleGrid,
    toggleSnapToGrid,
    toggleAlignmentGuides,
    theme,
    cycleTheme,
    activeView,
    setActiveView,
  } = useStore();

  const { onShowHelp, onStartTour } = useMobileMenu();

  // Detent and gesture state
  const [detent, setDetent] = useState<DetentSize>(initialDetent);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Refs
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevVisibleRef = useRef(isVisible);

  // Track entering animation state via ref comparison
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isVisible;

    // Only start entering animation when transitioning from hidden to visible
    if (isVisible && !wasVisible) {
      // Use setTimeout to avoid synchronous setState in effect
      const enterTimer = setTimeout(() => setIsEntering(true), 0);
      const exitTimer = setTimeout(() => setIsEntering(false), 350);
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
      };
    }

    // Reset state when closing
    if (!isVisible && wasVisible) {
      const resetTimer = setTimeout(() => {
        setDetent(initialDetent);
        setDragOffset(0);
        setIsDragging(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }
  }, [isVisible, initialDetent]);

  // Handle close with callback
  const handleClose = useCallback(() => {
    onDetentChange?.('closed');
    onClose();
  }, [onClose, onDetentChange]);

  // Gesture handler following OnboardingWizard pattern
  useGesture(
    {
      onDrag: ({ movement: [, my], velocity: [, vy], direction: [, dy], active, cancel }) => {
        if (!isVisible) {
          cancel?.();
          return;
        }

        // At large detent, only allow drag if content is scrolled to top
        if (detent === 'large' && !isScrollAtTop(contentRef.current) && my < 0) {
          // User is scrolling content, not dragging sheet
          cancel?.();
          return;
        }

        const maxHeight = window.innerHeight;

        if (active) {
          setIsDragging(true);

          // Apply rubber-banding at bounds
          // Top bound: can't drag above large detent
          // Bottom bound: allow some overshoot for dismiss gesture
          const topLimit = 0;
          const bottomLimit = maxHeight * 0.3; // Allow drag 30% past for dismiss feel

          const boundedOffset = rubberBand(my, bottomLimit, GESTURE_CONFIG.RUBBER_BAND_FACTOR);
          // Only allow downward drag (closing) or slight upward at non-large detent
          if (my > 0 || detent !== 'large') {
            setDragOffset(Math.max(topLimit, boundedOffset));
          }
        } else {
          // Gesture ended - determine new detent or dismiss
          setIsDragging(false);

          const currentSheetHeight = maxHeight * DETENT_THRESHOLDS[detent.toUpperCase() as keyof typeof DETENT_THRESHOLDS];
          const effectiveHeight = currentSheetHeight - dragOffset;
          const currentY = maxHeight - effectiveHeight;

          // Check for dismiss - fast downward flick or dragged very low
          const shouldDismiss =
            (vy > GESTURE_CONFIG.VELOCITY_THRESHOLD && dy > 0 && my > 50) ||
            effectiveHeight < maxHeight * 0.15;

          if (shouldDismiss) {
            setDragOffset(0);
            handleClose();
            return;
          }

          // Find new detent based on position and velocity
          const detents = [DETENT_THRESHOLDS.SMALL, DETENT_THRESHOLDS.MEDIUM, DETENT_THRESHOLDS.LARGE];
          const newDetentRatio = findNearestDetent(currentY, vy, maxHeight, detents);

          if (newDetentRatio === -1) {
            // Dismiss signal
            setDragOffset(0);
            handleClose();
          } else {
            const newDetent = ratioToDetentSize(newDetentRatio);
            setDetent(newDetent);
            onDetentChange?.(newDetent);
          }

          setDragOffset(0);
        }
      },
    },
    {
      target: dragHandleRef,
      drag: {
        pointer: { touch: true },
        axis: 'y',
        filterTaps: true,
        threshold: 5,
      },
    }
  );

  if (!isVisible) return null;

  const handleViewChange = (view: 'canvas' | 'guests' | 'dashboard') => {
    setActiveView(view);
    navigate(`/dashboard/events/${event.id}/${view}`);
    handleClose();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      default: return '⚙️';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  // Calculate sheet height based on detent
  const sheetHeight = `${DETENT_THRESHOLDS[detent.toUpperCase() as keyof typeof DETENT_THRESHOLDS] * 100}vh`;

  // Build class names
  const sheetClasses = [
    'bottom-control-sheet',
    isDragging && 'bottom-control-sheet--dragging',
    isEntering && 'bottom-control-sheet--entering',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className="sheet-backdrop" onClick={handleClose} />
      <div
        ref={sheetRef}
        className={sheetClasses}
        data-detent={detent}
        style={{
          '--sheet-height': sheetHeight,
          transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
        } as React.CSSProperties}
      >
        {/* Drag handle - touch target for gestures */}
        <div ref={dragHandleRef} className="sheet-handle">
          <div className="sheet-handle-bar" />
        </div>

        {/* Scrollable content area */}
        <div ref={contentRef} className="sheet-content">
          {/* Zoom Controls */}
          <div className="sheet-section">
            <h4>Zoom</h4>
            <div className="sheet-zoom-controls">
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.max(0.25, canvas.zoom - 0.25))}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="zoom-value">{Math.round(canvas.zoom * 100)}%</span>
              <button
                className="zoom-btn"
                onClick={() => setZoom(Math.min(2, canvas.zoom + 0.25))}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                className="zoom-btn reset"
                onClick={() => recenterCanvas(window.innerWidth, window.innerHeight)}
                aria-label="Reset view"
              >
                ⌖
              </button>
            </div>
          </div>

          {/* Views */}
          <div className="sheet-section">
            <h4>Views</h4>
            <div className="sheet-buttons">
              <button
                className={`sheet-btn ${activeView === 'canvas' ? 'active' : ''}`}
                onClick={() => handleViewChange('canvas')}
              >
                <span className="icon">🎨</span>
                Canvas
              </button>
              <button
                className={`sheet-btn ${activeView === 'guests' ? 'active' : ''}`}
                onClick={() => handleViewChange('guests')}
              >
                <span className="icon">👥</span>
                Guests
              </button>
              <button
                className={`sheet-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleViewChange('dashboard')}
              >
                <span className="icon">📊</span>
                Stats
              </button>
              <button
                className="sheet-btn"
                onClick={() => {
                  onShowImport();
                  handleClose();
                }}
              >
                <span className="icon">📥</span>
                Import
              </button>
            </div>
          </div>

          {/* Canvas Tools */}
          <div className="sheet-section">
            <h4>Canvas Tools</h4>
            <div className="sheet-buttons">
              <button
                className={`sheet-btn ${canvasPrefs.showGrid ? 'active' : ''}`}
                onClick={toggleGrid}
              >
                <span className="icon">🔲</span>
                Grid
              </button>
              <button
                className={`sheet-btn ${canvasPrefs.snapToGrid ? 'active' : ''}`}
                onClick={toggleSnapToGrid}
              >
                <span className="icon">🧲</span>
                Snap
              </button>
              <button
                className={`sheet-btn ${canvasPrefs.showAlignmentGuides ? 'active' : ''}`}
                onClick={toggleAlignmentGuides}
              >
                <span className="icon">📐</span>
                Guides
              </button>
              <button
                className={`sheet-btn ${showRelationships ? 'active' : ''}`}
                onClick={() => {
                  onToggleRelationships();
                  handleClose();
                }}
              >
                <span className="icon">🔗</span>
                Relations
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="sheet-section">
            <h4>Settings</h4>
            <div className="sheet-buttons">
              <button
                className="sheet-btn"
                onClick={cycleTheme}
              >
                <span className="icon">{getThemeIcon()}</span>
                {getThemeLabel()}
              </button>
              {onShowHelp && (
                <button
                  className="sheet-btn"
                  onClick={() => {
                    onShowHelp();
                    handleClose();
                  }}
                >
                  <span className="icon">⌨️</span>
                  Shortcuts
                </button>
              )}
              {onStartTour && (
                <button
                  className="sheet-btn"
                  onClick={() => {
                    onStartTour('quick-start');
                    handleClose();
                  }}
                >
                  <span className="icon">🎓</span>
                  Tour
                </button>
              )}
              <button
                className="sheet-btn"
                onClick={() => {
                  navigate('/dashboard');
                  handleClose();
                }}
              >
                <span className="icon">📋</span>
                Events
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
