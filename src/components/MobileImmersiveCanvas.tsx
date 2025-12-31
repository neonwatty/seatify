import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useGesture } from '@use-gesture/react';
import { useNavigate } from 'react-router-dom';
import { TransientTopBar } from './TransientTopBar';
import { BottomControlSheet } from './BottomControlSheet';
import { useStore } from '../store/useStore';
import { GESTURE_CONFIG } from '../utils/gestureUtils';
import { useMobileLandscape } from '../hooks/useResponsive';
import './MobileImmersiveCanvas.css';

interface MobileImmersiveCanvasProps {
  children: ReactNode;
  showRelationships: boolean;
  onToggleRelationships: () => void;
  onShowImport: () => void;
  isGuestPanelOpen?: boolean;
  onOpenGuestPanel?: () => void;
  onCloseGuestPanel?: () => void;
}

/**
 * Wraps the canvas in immersive mode for mobile devices.
 * Provides gesture-based UI access:
 * - Swipe DOWN: Show top navigation bar
 * - Swipe UP: Show bottom control sheet
 * - Swipe LEFT (from right): Open guest panel (handled by MobileGuestPanel)
 */
export function MobileImmersiveCanvas({
  children,
  showRelationships,
  onToggleRelationships,
  onShowImport,
  isGuestPanelOpen = false,
  onOpenGuestPanel,
  onCloseGuestPanel,
}: MobileImmersiveCanvasProps) {
  const navigate = useNavigate();
  const { event, hasSeenImmersiveHint, setHasSeenImmersiveHint, hasSeenLandscapeHint, setHasSeenLandscapeHint } = useStore();
  const isLandscape = useMobileLandscape();

  const [topBarVisible, setTopBarVisible] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showLandscapeHint, setShowLandscapeHint] = useState(false);

  // Single drawer logic: close other drawers when one opens
  const openTopBar = useCallback(() => {
    setTopBarVisible(true);
    setBottomSheetVisible(false);
    onCloseGuestPanel?.();
    setShowHint(false);
  }, [onCloseGuestPanel]);

  const openBottomSheet = useCallback(() => {
    setBottomSheetVisible(true);
    setTopBarVisible(false);
    onCloseGuestPanel?.();
    setShowHint(false);
  }, [onCloseGuestPanel]);

  const openGuestPanel = useCallback(() => {
    onOpenGuestPanel?.();
    setTopBarVisible(false);
    setBottomSheetVisible(false);
    setShowHint(false);
  }, [onOpenGuestPanel]);

  // Show hint for first-time users
  useEffect(() => {
    if (!hasSeenImmersiveHint) {
      const timer = setTimeout(() => {
        setShowHint(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenImmersiveHint]);

  // Auto-hide hint after a few seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => {
        setShowHint(false);
        setHasSeenImmersiveHint();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showHint, setHasSeenImmersiveHint]);

  // Show landscape hint for users who haven't seen it (only in portrait)
  useEffect(() => {
    // Don't show if already in landscape, already seen, or immersive hint is active
    if (isLandscape || hasSeenLandscapeHint || !hasSeenImmersiveHint || showHint) {
      return;
    }

    const timer = setTimeout(() => {
      setShowLandscapeHint(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLandscape, hasSeenLandscapeHint, hasSeenImmersiveHint, showHint]);

  // Auto-hide landscape hint after a few seconds, or when rotating to landscape
  useEffect(() => {
    if (!showLandscapeHint) return;

    // If user rotated to landscape, dismiss immediately and mark as seen
    if (isLandscape) {
      setHasSeenLandscapeHint();
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => setShowLandscapeHint(false));
      return;
    }

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setShowLandscapeHint(false);
      setHasSeenLandscapeHint();
    }, 5000);
    return () => clearTimeout(timer);
  }, [showLandscapeHint, isLandscape, setHasSeenLandscapeHint]);

  // Velocity-aware gesture detection using @use-gesture
  // Uses velocity OR distance threshold (iOS-like feel)
  useGesture(
    {
      onDrag: ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], active, event }) => {
        // Only process on gesture end
        if (active) return;

        // Check if primarily vertical or horizontal
        const isVertical = Math.abs(my) > Math.abs(mx);
        const minSwipe = GESTURE_CONFIG.DISTANCE_THRESHOLD;
        const velocityThreshold = GESTURE_CONFIG.VELOCITY_THRESHOLD;

        // Handle dismissal gestures when panels are open
        if (topBarVisible && isVertical && dy < 0) {
          // Swipe UP to dismiss top bar - check velocity OR distance
          if (vy > velocityThreshold || Math.abs(my) > minSwipe) {
            setTopBarVisible(false);
            return;
          }
        }

        // Note: BottomControlSheet handles its own dismissal via drag gestures
        // but we keep this for swipes that start on the canvas
        if (bottomSheetVisible && isVertical && dy > 0) {
          // Swipe DOWN to dismiss bottom sheet
          if (vy > velocityThreshold || my > minSwipe) {
            setBottomSheetVisible(false);
            return;
          }
        }

        if (isGuestPanelOpen && !isVertical && dx > 0) {
          // Swipe RIGHT to dismiss guest panel
          if (vx > velocityThreshold || mx > minSwipe) {
            onCloseGuestPanel?.();
            return;
          }
        }

        // Don't process opening gestures if panels are already open
        if (topBarVisible || bottomSheetVisible || isGuestPanelOpen) {
          return;
        }

        // Ignore touches that started on interactive elements
        const target = event?.target as HTMLElement | null;
        if (target) {
          const isOnInteractiveElement =
            target.closest('.mobile-fab') ||
            target.closest('.corner-indicator') ||
            target.closest('.transient-top-bar') ||
            target.closest('.bottom-control-sheet') ||
            target.closest('.mobile-guest-panel') ||
            target.closest('button') ||
            target.closest('input');

          if (isOnInteractiveElement) {
            return;
          }
        }

        if (isVertical) {
          // Swipe DOWN = show top bar (velocity OR distance triggers)
          if (dy > 0 && (vy > velocityThreshold || my > minSwipe)) {
            openTopBar();
            return;
          }

          // Swipe UP = show bottom sheet
          if (dy < 0 && (vy > velocityThreshold || Math.abs(my) > minSwipe)) {
            openBottomSheet();
            return;
          }
        } else {
          // Swipe LEFT (from right) = open guest panel
          if (dx < 0 && (vx > velocityThreshold || Math.abs(mx) > minSwipe) && onOpenGuestPanel) {
            openGuestPanel();
            return;
          }
        }
      },
    },
    {
      target: typeof window !== 'undefined' ? window : undefined,
      drag: {
        pointer: { touch: true },
        filterTaps: true,
        threshold: 10,
      },
    }
  );

  // Close all overlays
  const closeAll = () => {
    setTopBarVisible(false);
    setBottomSheetVisible(false);
  };

  // Corner indicator tap - show top bar (single drawer only)
  const handleCornerTap = () => {
    openTopBar();
    setHasSeenImmersiveHint();
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/events');
  };

  return (
    <div
      className="mobile-immersive-canvas"
      data-landscape={isLandscape ? 'true' : 'false'}
    >
      {/* Landscape compact header - always visible in landscape */}
      {isLandscape && (
        <div className="landscape-header">
          <button
            className="landscape-back-btn"
            onClick={handleBack}
            aria-label="Back to events"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <span className="landscape-event-name">{event.name || 'Untitled Event'}</span>
          <div className="landscape-actions">
            <button
              className="landscape-action-btn"
              onClick={openGuestPanel}
              aria-label="Open guest panel"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </button>
            <button
              className="landscape-action-btn"
              onClick={openBottomSheet}
              aria-label="Open settings"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main canvas content */}
      {children}

      {/* Transient Top Bar - only in portrait mode */}
      {!isLandscape && (
        <TransientTopBar
          isVisible={topBarVisible}
          onClose={closeAll}
          onOpenSettings={openBottomSheet}
        />
      )}

      {/* Bottom Control Sheet */}
      <BottomControlSheet
        isVisible={bottomSheetVisible}
        onClose={closeAll}
        showRelationships={showRelationships}
        onToggleRelationships={onToggleRelationships}
        onShowImport={onShowImport}
      />

      {/* Corner Indicator - only in portrait mode */}
      {!isLandscape && (
        <button
          className="corner-indicator"
          onClick={handleCornerTap}
          aria-label="Show controls"
        >
          <span className="indicator-dot" />
        </button>
      )}

      {/* First-time hint - only in portrait mode */}
      {showHint && !isLandscape && (
        <div className="immersive-hint">
          <div className="hint-content">
            <p><strong>Swipe to access controls</strong></p>
            <p>↓ Down for nav • ↑ Up for tools</p>
          </div>
        </div>
      )}

      {/* Landscape orientation hint - only in portrait mode */}
      {showLandscapeHint && !isLandscape && (
        <div
          className="landscape-hint"
          onClick={() => {
            setShowLandscapeHint(false);
            setHasSeenLandscapeHint();
          }}
        >
          <div className="landscape-hint-content">
            <svg className="rotate-icon" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.38zm-7.31.29C4.25 19.94 1.91 16.76 1.55 13H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32z"/>
            </svg>
            <span>Rotate for more canvas space</span>
          </div>
        </div>
      )}

      {/* Edge hint indicators - only in portrait mode */}
      {!isLandscape && (
        <>
          <div className="edge-hint top" />
          <div className="edge-hint bottom" />
        </>
      )}
    </div>
  );
}
