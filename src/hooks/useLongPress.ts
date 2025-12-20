import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent) => void;
  threshold?: number; // Duration in ms before triggering (default: 500ms)
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

interface UseLongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Hook for detecting long press on touch devices
 * Returns touch event handlers that trigger onLongPress after threshold duration
 */
export function useLongPress({
  onLongPress,
  threshold = 500,
  onTouchStart,
  onTouchEnd,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    touchStartRef.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't trigger if multiple touches (pinch/zoom)
    if (e.touches.length > 1) {
      clear();
      return;
    }

    isLongPressRef.current = false;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, threshold);

    onTouchStart?.(e);
  }, [onLongPress, threshold, onTouchStart, clear]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clear();
    // Prevent click event if this was a long press
    if (isLongPressRef.current) {
      e.preventDefault();
    }
    onTouchEnd?.(e);
  }, [clear, onTouchEnd]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel if finger moves too far (> 10px)
    if (touchStartRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      if (deltaX > 10 || deltaY > 10) {
        clear();
      }
    }
  }, [clear]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  };
}
