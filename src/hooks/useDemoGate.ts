import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { GatedFeature } from '../components/DemoSignupModal';

interface UseDemoGateReturn {
  /** Whether the app is currently in demo mode */
  isDemo: boolean;
  /** Check if a feature is gated and show signup modal if so. Returns true if allowed, false if gated. */
  checkGate: (feature: GatedFeature, onComplete?: () => void) => boolean;
  /** The currently gated feature (if signup modal should be shown) */
  gatedFeature: GatedFeature | null;
  /** Callback to execute after successful signup */
  onCompleteCallback: (() => void) | null;
  /** Close the gate modal */
  closeGate: () => void;
  /** Mark signup as successful and execute the pending action */
  completeSignup: () => void;
}

/**
 * Hook for gating features in demo mode.
 *
 * Usage:
 * ```tsx
 * const { isDemo, checkGate, gatedFeature, closeGate, completeSignup } = useDemoGate();
 *
 * const handleDownloadPDF = () => {
 *   if (!checkGate('pdf_table_cards', () => {
 *     // This runs after successful signup
 *     actuallyDownloadPDF();
 *   })) {
 *     return; // Gate shown, waiting for signup
 *   }
 *   // Not in demo mode, proceed immediately
 *   actuallyDownloadPDF();
 * };
 *
 * // Render the modal
 * <DemoSignupModal
 *   isOpen={!!gatedFeature}
 *   onClose={closeGate}
 *   onSuccess={completeSignup}
 *   feature={gatedFeature || 'pdf_table_cards'}
 * />
 * ```
 */
export function useDemoGate(): UseDemoGateReturn {
  const isDemo = useStore((state) => state.isDemo);
  const [gatedFeature, setGatedFeature] = useState<GatedFeature | null>(null);
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | null>(null);

  const checkGate = useCallback(
    (feature: GatedFeature, onComplete?: () => void): boolean => {
      // Not in demo mode - allow all features
      if (!isDemo) {
        return true;
      }

      // In demo mode - show signup modal
      setGatedFeature(feature);
      if (onComplete) {
        setOnCompleteCallback(() => onComplete);
      }

      // Track gate shown event (could add analytics here)
      // trackEvent('demo_gate_shown', { feature });

      return false;
    },
    [isDemo]
  );

  const closeGate = useCallback(() => {
    setGatedFeature(null);
    setOnCompleteCallback(null);
  }, []);

  const completeSignup = useCallback(() => {
    // Execute the pending action if any
    if (onCompleteCallback) {
      onCompleteCallback();
    }
    closeGate();
  }, [onCompleteCallback, closeGate]);

  return {
    isDemo,
    checkGate,
    gatedFeature,
    onCompleteCallback,
    closeGate,
    completeSignup,
  };
}
