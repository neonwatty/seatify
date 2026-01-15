import { createContext, useContext, useState } from 'react';
import {
  shouldShowEmailCapture,
  markAsSubscribed,
  trackDismissal,
} from '../utils/emailCaptureManager';
import type { TourId } from '../data/tourRegistry';

interface MobileMenuContextValue {
  onShowHelp: () => void;
  onStartTour: (tourId: TourId) => void;
  onSubscribe: () => void;
  canShowEmailButton: boolean;
  showEmailCapture: boolean;
  setShowEmailCapture: (show: boolean) => void;
  handleEmailCaptureClose: (subscribed?: boolean) => void;
  // Mobile menu sheet state
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

interface MobileMenuProviderProps {
  children: React.ReactNode;
  onShowHelp: () => void;
  onStartTour: (tourId: TourId) => void;
}

export function MobileMenuProvider({ children, onShowHelp, onStartTour }: MobileMenuProviderProps) {
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if user has already subscribed (don't show button if so)
  const canShowEmailButton = shouldShowEmailCapture('guestMilestone') ||
                             shouldShowEmailCapture('optimizerSuccess') ||
                             shouldShowEmailCapture('exportAttempt');

  const handleEmailCaptureClose = (subscribed = false) => {
    if (subscribed) {
      markAsSubscribed();
    } else {
      trackDismissal();
    }
    setShowEmailCapture(false);
  };

  const onSubscribe = () => {
    setShowEmailCapture(true);
  };

  return (
    <MobileMenuContext.Provider value={{
      onShowHelp,
      onStartTour,
      onSubscribe,
      canShowEmailButton,
      showEmailCapture,
      setShowEmailCapture,
      handleEmailCaptureClose,
      isMenuOpen,
      setIsMenuOpen,
    }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) {
    // Return no-op handlers if not in provider (e.g., on landing page)
    return {
      onShowHelp: undefined,
      onStartTour: undefined,
      onSubscribe: undefined,
      canShowEmailButton: false,
      showEmailCapture: false,
      setShowEmailCapture: () => {},
      handleEmailCaptureClose: () => {},
      isMenuOpen: false,
      setIsMenuOpen: () => {},
    };
  }
  return context;
}
