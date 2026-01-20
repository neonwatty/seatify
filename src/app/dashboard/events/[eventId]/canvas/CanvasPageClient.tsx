'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DemoBanner } from '@/components/DemoBanner';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { TOUR_REGISTRY, type TourId } from '@/data/tourRegistry';
import type { Event } from '@/types';

interface CanvasPageClientProps {
  event: Event;
  isDemo?: boolean;
}

export function CanvasPageClient({ event: serverEvent, isDemo = false }: CanvasPageClientProps) {
  const { loadEvent, setDemoMode, event, isTourComplete, markTourComplete, completedTours } = useStore();
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const [hasAutoStartedTour, setHasAutoStartedTour] = useState(false);

  // Load event into store on mount
  useEffect(() => {
    setDemoMode(isDemo);
    loadEvent(serverEvent);
  }, [serverEvent, loadEvent, isDemo, setDemoMode]);

  // Auto-start quick-start tour for new demo users
  useEffect(() => {
    // Check if user clicked "Remind Me Later" - don't auto-start this session
    const remindLater = typeof window !== 'undefined' && sessionStorage.getItem('tourRemindLater') === 'true';

    if (
      isDemo &&
      event &&
      event.id === serverEvent.id &&
      !hasAutoStartedTour &&
      !remindLater &&
      completedTours.size === 0 &&
      !isTourComplete('quick-start')
    ) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setActiveTour('quick-start');
        setHasAutoStartedTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDemo, event, serverEvent.id, hasAutoStartedTour, completedTours.size, isTourComplete]);

  const handleStartTour = useCallback((tourId: TourId) => {
    setActiveTour(tourId);
  }, []);

  const handleCloseTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  const handleCompleteTour = useCallback(() => {
    if (activeTour) {
      markTourComplete(activeTour);
    }
    setActiveTour(null);
  }, [activeTour, markTourComplete]);

  // Don't render until event is loaded
  if (!event || event.id !== serverEvent.id) {
    return (
      <div className="canvas-loading">
        <p>Loading seating chart...</p>
      </div>
    );
  }

  const currentTour = activeTour ? TOUR_REGISTRY[activeTour] : null;

  return (
    <div className="event-layout">
      <DemoBanner />
      <Header onStartTour={handleStartTour} />
      <div className="event-content">
        <Canvas />
        <Sidebar />
      </div>

      {/* Onboarding Tour */}
      {currentTour && (
        <OnboardingWizard
          isOpen={!!activeTour}
          onClose={handleCloseTour}
          onComplete={handleCompleteTour}
          customSteps={currentTour.steps}
          tourTitle={currentTour.title}
          tourId={activeTour ?? undefined}
          isAutoStarted={isDemo && activeTour === 'quick-start'}
        />
      )}
    </div>
  );
}
