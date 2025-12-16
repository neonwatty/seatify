import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect current breakpoint using CSS media queries.
 * Uses matchMedia which is more reliable than window.innerWidth in headless browsers.
 */
export function useBreakpoint(): Breakpoint {
  const getBreakpoint = (): Breakpoint => {
    if (typeof window === 'undefined') return 'desktop';
    // Use matchMedia for reliable detection in headless browsers
    if (window.matchMedia('(max-width: 767px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet';
    return 'desktop';
  };

  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    // Create media query lists
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(max-width: 1023px)');

    const updateBreakpoint = () => {
      if (mobileQuery.matches) {
        setBreakpoint('mobile');
      } else if (tabletQuery.matches) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    // Check immediately on mount
    updateBreakpoint();

    // Listen for media query changes
    mobileQuery.addEventListener('change', updateBreakpoint);
    tabletQuery.addEventListener('change', updateBreakpoint);

    return () => {
      mobileQuery.removeEventListener('change', updateBreakpoint);
      tabletQuery.removeEventListener('change', updateBreakpoint);
    };
  }, []);

  return breakpoint;
}

/**
 * Hook to check if device is mobile-sized
 */
export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile';
}

/**
 * Hook to check if device is tablet-sized
 */
export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'tablet';
}

/**
 * Hook to check if device is touch-enabled
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    // Also check for coarse pointer (touch screens)
    const mediaQuery = window.matchMedia('(pointer: coarse)');

    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isTouch;
}

/**
 * Hook to check if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Generic media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to get viewport dimensions
 */
export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
