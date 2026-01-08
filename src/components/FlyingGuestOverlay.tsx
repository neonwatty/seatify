import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { getInitials } from '../types';
import './FlyingGuestOverlay.css';

export function FlyingGuestOverlay() {
  const { flyingGuests, clearFlyingGuests } = useStore();
  const [animatedPositions, setAnimatedPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const animationStartedRef = useRef(false);

  // Start animations with staggered delays
  useEffect(() => {
    if (flyingGuests.length === 0) {
      animationStartedRef.current = false;
      // Reset state when flying guests are cleared - this is intentional cleanup
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimatedPositions(new Map());
      return;
    }

    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    // Initialize all guests at their starting positions
    const initialPositions = new Map<string, { x: number; y: number }>();
    flyingGuests.forEach(fg => {
      initialPositions.set(fg.guestId, { x: fg.fromX, y: fg.fromY });
    });
    setAnimatedPositions(initialPositions);

    // Trigger animations with staggered delays
    flyingGuests.forEach(fg => {
      setTimeout(() => {
        setAnimatedPositions(prev => {
          const next = new Map(prev);
          next.set(fg.guestId, { x: fg.toX, y: fg.toY });
          return next;
        });
      }, fg.delay + 50); // +50ms to ensure initial render completes
    });

    // Clear flying guests after all animations complete
    const maxDelay = Math.max(...flyingGuests.map(fg => fg.delay));
    const animationDuration = 600; // ms
    const cleanupDelay = maxDelay + animationDuration + 200; // buffer

    const timeoutId = setTimeout(() => {
      clearFlyingGuests();
    }, cleanupDelay);

    return () => clearTimeout(timeoutId);
  }, [flyingGuests, clearFlyingGuests]);

  const handleSkip = () => {
    clearFlyingGuests();
  };

  if (flyingGuests.length === 0) {
    return null;
  }

  return createPortal(
    <div className="flying-guest-overlay">
      {flyingGuests.map(fg => {
        const pos = animatedPositions.get(fg.guestId) || { x: fg.fromX, y: fg.fromY };
        const initials = getInitials(fg.guest);

        return (
          <div
            key={fg.guestId}
            className={`flying-guest ${fg.moveType}`}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
            }}
          >
            {initials}
          </div>
        );
      })}

      <button className="skip-animation-button" onClick={handleSkip}>
        Skip
      </button>
    </div>,
    document.body
  );
}
